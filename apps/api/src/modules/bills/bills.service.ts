import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Bill, CreateBillInput, PayBillInput, Recipient, User } from '@post-oak/contracts';
import { DomainError } from '../../common/domain-error.js';
import { toIsoDate } from '../../common/time.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { RealtimeService } from '../../core/realtime/realtime.service.js';
import type { BillRecord, Workspace } from '../../core/workspace/workspace.js';
import { PaymentsService } from '../payments/payments.service.js';

@Injectable()
export class BillsService {
  constructor(
    private readonly payments: PaymentsService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  list(workspace: Workspace): Bill[] {
    return workspace.bills
      .map((bill) => this.present(bill))
      .sort((a, b) => a.dueOn.localeCompare(b.dueOn));
  }

  create(workspace: Workspace, actor: User, input: CreateBillInput): Bill {
    const recipient = workspace.recipients.find(
      (r) => r.name.toLowerCase() === input.vendor.toLowerCase(),
    );
    const bill: BillRecord = {
      id: `bil_${randomUUID().slice(0, 12)}`,
      vendor: input.vendor,
      recipientId: recipient?.id ?? null,
      invoiceNumber: input.invoiceNumber,
      amount: input.amount,
      category: input.category,
      issuedOn: toIsoDate(new Date()),
      dueOn: input.dueOn,
      status: 'awaiting_payment',
      scheduledFor: null,
      paidAt: null,
      paymentId: null,
      note: input.note ?? null,
    };
    workspace.bills.unshift(bill);
    this.audit.record(workspace, actor, 'Added bill', bill.vendor, bill.invoiceNumber);
    this.realtime.publish(workspace, 'bill.created', ['bills', 'overview']);
    return this.present(bill);
  }

  /** Paying a bill is a normal payment, so approvals and audit apply automatically. */
  pay(workspace: Workspace, actor: User, id: string, input: PayBillInput): Bill {
    const bill = workspace.bills.find((b) => b.id === id);
    if (!bill) throw DomainError.notFound('Bill');
    if (bill.status !== 'awaiting_payment') {
      throw DomainError.conflict('bill_not_payable', 'This bill is already being paid.');
    }

    const recipient = this.recipientFor(workspace, bill, input.rail);
    const payment = this.payments.create(
      workspace,
      actor,
      {
        fromAccountId: input.accountId,
        destination: { type: 'recipient', recipientId: recipient.id },
        rail: input.rail,
        amount: bill.amount,
        memo: `${bill.vendor} ${bill.invoiceNumber}`,
        ...(input.payOn ? { scheduledFor: input.payOn } : {}),
      },
      { billId: bill.id },
    );

    bill.paymentId = payment.id;
    bill.status = payment.status === 'scheduled' ? 'scheduled' : 'processing';
    bill.scheduledFor = payment.scheduledFor;
    this.realtime.publish(workspace, 'bill.paying', ['bills', 'overview']);
    return this.present(bill);
  }

  private recipientFor(workspace: Workspace, bill: BillRecord, rail: 'ach' | 'wire'): Recipient {
    const existing = workspace.recipients.find((r) => r.id === bill.recipientId);
    if (existing) return existing;

    const recipient: Recipient = {
      id: `rcp_${randomUUID().slice(0, 12)}`,
      name: bill.vendor,
      type: 'vendor',
      email: null,
      bankName: 'Bank on file',
      routingNumber: '121000248',
      accountLast4: '0000',
      defaultRail: rail,
      defaultCategory: bill.category,
      createdAt: new Date().toISOString(),
      lastPaidAt: null,
      totalPaid: 0,
      paymentCount: 0,
      isNew: true,
    };
    workspace.recipients.unshift(recipient);
    bill.recipientId = recipient.id;
    return recipient;
  }

  private present(bill: BillRecord): Bill {
    const today = toIsoDate(new Date());
    return { ...bill, isOverdue: bill.status === 'awaiting_payment' && bill.dueOn < today };
  }
}
