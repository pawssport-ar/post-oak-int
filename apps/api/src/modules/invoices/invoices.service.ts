import { Injectable } from '@nestjs/common';
import {
  type AgingBucket,
  type CreateInvoiceInput,
  formatCents,
  type Invoice,
  type ReceivablesSummary,
  type User,
} from '@post-oak/contracts';
import { DomainError } from '../../common/domain-error.js';
import { addDays, daysBetween, toIsoDate } from '../../common/time.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { LedgerService } from '../../core/ledger/ledger.service.js';
import { RealtimeService } from '../../core/realtime/realtime.service.js';
import type { InvoiceRecord, Workspace } from '../../core/workspace/workspace.js';

const OPEN_STATUSES = new Set(['sent', 'viewed']);
const OPERATING_ACCOUNT = 'acc_operating';

@Injectable()
export class InvoicesService {
  constructor(
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  list(workspace: Workspace): Invoice[] {
    return workspace.invoices.map((invoice) => this.present(invoice));
  }

  summary(workspace: Workspace): ReceivablesSummary {
    const invoices = this.list(workspace);
    const open = invoices.filter((invoice) => OPEN_STATUSES.has(invoice.status));
    const buckets: AgingBucket[] = [
      { key: 'current', label: 'Not yet due', amount: 0, count: 0 },
      { key: '1-30', label: '1 to 30 days', amount: 0, count: 0 },
      { key: '31-60', label: '31 to 60 days', amount: 0, count: 0 },
      { key: '61-90', label: '61 to 90 days', amount: 0, count: 0 },
      { key: '90+', label: 'Over 90 days', amount: 0, count: 0 },
    ];
    for (const invoice of open) {
      const days = invoice.daysOverdue;
      const index = days <= 0 ? 0 : days <= 30 ? 1 : days <= 60 ? 2 : days <= 90 ? 3 : 4;
      const bucket = buckets[index];
      if (bucket) {
        bucket.amount += invoice.total;
        bucket.count += 1;
      }
    }

    const now = new Date();
    const cutoff90 = addDays(now, -90).toISOString();
    const cutoff30 = addDays(now, -30).toISOString();
    const paid = invoices.filter((invoice) => invoice.paidAt && invoice.paidAt >= cutoff90);
    const daysToPay = paid.map((invoice) =>
      daysBetween(new Date(invoice.issuedOn), new Date(invoice.paidAt ?? invoice.issuedOn)),
    );
    return {
      outstanding: open.reduce((sum, invoice) => sum + invoice.total, 0),
      overdue: open
        .filter((invoice) => invoice.isOverdue)
        .reduce((sum, invoice) => sum + invoice.total, 0),
      paidLast30d: invoices
        .filter((invoice) => invoice.paidAt && invoice.paidAt >= cutoff30)
        .reduce((sum, invoice) => sum + invoice.total, 0),
      averageDaysToPay: daysToPay.length
        ? Math.round(daysToPay.reduce((sum, days) => sum + days, 0) / daysToPay.length)
        : 0,
      aging: buckets,
    };
  }

  create(workspace: Workspace, actor: User, input: CreateInvoiceInput): Invoice {
    const lines = input.lines.map((line) => ({
      description: line.description,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
    }));
    const subtotal = Math.round(
      lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0),
    );
    const tax = Math.round((subtotal * input.taxRateBps) / 10_000);
    const sequence = this.nextSequence(workspace);

    const invoice: InvoiceRecord = {
      id: `inv_${sequence}`,
      number: `INV-${sequence}`,
      customer: input.customer,
      customerEmail: input.customerEmail,
      lines,
      subtotal,
      tax,
      total: subtotal + tax,
      issuedOn: toIsoDate(new Date()),
      dueOn: input.dueOn,
      status: input.send ? 'sent' : 'draft',
      paidAt: null,
      lastReminderAt: null,
      memo: input.memo ?? null,
    };
    workspace.invoices.unshift(invoice);
    this.audit.record(
      workspace,
      actor,
      input.send ? 'Sent invoice' : 'Drafted invoice',
      invoice.number,
      `${invoice.customer}, ${formatCents(invoice.total)}`,
    );
    this.realtime.publish(workspace, 'invoice.created', ['invoices', 'overview']);
    return this.present(invoice);
  }

  send(workspace: Workspace, actor: User, id: string): Invoice {
    const invoice = this.find(workspace, id);
    if (invoice.status !== 'draft') {
      throw DomainError.conflict('invoice_already_sent', 'This invoice has already been sent.');
    }
    invoice.status = 'sent';
    invoice.issuedOn = toIsoDate(new Date());
    this.audit.record(workspace, actor, 'Sent invoice', invoice.number, invoice.customer);
    this.realtime.publish(workspace, 'invoice.sent', ['invoices', 'overview']);
    return this.present(invoice);
  }

  remind(workspace: Workspace, actor: User, id: string): Invoice {
    const invoice = this.find(workspace, id);
    if (!OPEN_STATUSES.has(invoice.status)) {
      throw DomainError.conflict('invoice_not_open', 'Only open invoices can be reminded.');
    }
    invoice.lastReminderAt = new Date().toISOString();
    this.audit.record(workspace, actor, 'Sent reminder', invoice.number, invoice.customer);
    this.realtime.publish(workspace, 'invoice.reminded', ['invoices']);
    return this.present(invoice);
  }

  void(workspace: Workspace, actor: User, id: string): Invoice {
    const invoice = this.find(workspace, id);
    if (invoice.status === 'paid') {
      throw DomainError.conflict('invoice_paid', 'A paid invoice cannot be voided.');
    }
    invoice.status = 'void';
    this.audit.record(workspace, actor, 'Voided invoice', invoice.number, invoice.customer);
    this.realtime.publish(workspace, 'invoice.voided', ['invoices', 'overview']);
    return this.present(invoice);
  }

  /** Records the receipt in the ledger and closes the invoice. */
  markPaid(workspace: Workspace, actor: User | null, id: string): Invoice {
    const invoice = this.find(workspace, id);
    if (!OPEN_STATUSES.has(invoice.status)) {
      throw DomainError.conflict('invoice_not_open', 'Only open invoices can be marked paid.');
    }
    invoice.status = 'paid';
    invoice.paidAt = new Date().toISOString();
    this.ledger.post(workspace, {
      accountId: OPERATING_ACCOUNT,
      counterparty: invoice.customer,
      description: `ACH CREDIT ${invoice.customer.toUpperCase()} ${invoice.number}`,
      amount: invoice.total,
      rail: 'ach',
      category: 'revenue',
      invoiceId: invoice.id,
    });
    this.audit.record(workspace, actor, 'Recorded payment', invoice.number, invoice.customer);
    this.realtime.publish(
      workspace,
      'invoice.paid',
      ['invoices', 'transactions', 'accounts', 'overview', 'insights'],
      {
        title: `Invoice ${invoice.number} paid`,
        body: `${formatCents(invoice.total)} received from ${invoice.customer}.`,
        tone: 'positive',
        href: '/invoices',
      },
    );
    return this.present(invoice);
  }

  private nextSequence(workspace: Workspace): number {
    const highest = Math.max(
      ...workspace.invoices.map((invoice) => Number(invoice.number.replace('INV-', ''))),
    );
    return highest + 1;
  }

  private find(workspace: Workspace, id: string): InvoiceRecord {
    const invoice = workspace.invoices.find((i) => i.id === id);
    if (!invoice) throw DomainError.notFound('Invoice');
    return invoice;
  }

  private present(invoice: InvoiceRecord): Invoice {
    const daysPastDue = daysBetween(new Date(invoice.dueOn), new Date());
    const open = OPEN_STATUSES.has(invoice.status);
    return {
      ...invoice,
      isOverdue: open && daysPastDue > 0,
      daysOverdue: open ? Math.max(0, daysPastDue) : 0,
    };
  }
}
