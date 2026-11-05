import { randomUUID } from 'node:crypto';
import { Inject, Injectable, type OnModuleInit } from '@nestjs/common';
import {
  can,
  type Cents,
  type CreatePaymentInput,
  formatCents,
  type Payment,
  type PaymentDestination,
  type PaymentQuote,
  type PaymentRail,
  type PaymentStatus,
  type QuoteWarning,
  RAIL_LABELS,
  type Recipient,
  type User,
} from '@post-oak/contracts';
import { BAAS_PROVIDER, type BaasEvent, type BaasProvider } from '../../baas/baas.port.js';
import { DomainError } from '../../common/domain-error.js';
import { toIsoDate } from '../../common/time.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { LedgerService } from '../../core/ledger/ledger.service.js';
import { RealtimeService } from '../../core/realtime/realtime.service.js';
import type { AccountRecord, Workspace } from '../../core/workspace/workspace.js';
import { evaluatePolicies } from './approval-policy.js';
import { estimateArrival, estimateScheduledArrival, RAIL_FEES } from './settlement-rules.js';

const SETTLED_TITLES: Record<PaymentRail, string> = {
  ach: 'ACH payment settled',
  wire: 'Wire settled',
  rtp: 'Instant payment settled',
  book: 'Transfer complete',
};

const LARGE_PAYMENT = 25_000_000;
const LOW_BALANCE = 50_000_000;

interface ResolvedDestination {
  summary: PaymentDestination;
  recipient: Recipient | null;
  account: AccountRecord | null;
}

@Injectable()
export class PaymentsService implements OnModuleInit {
  constructor(
    private readonly ledger: LedgerService,
    private readonly realtime: RealtimeService,
    private readonly audit: AuditService,
    @Inject(BAAS_PROVIDER) private readonly baas: BaasProvider,
  ) {}

  onModuleInit(): void {
    this.baas.onEvent((workspace, event) => this.applyProviderEvent(workspace, event));
  }

  list(workspace: Workspace): Payment[] {
    return [...workspace.payments].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  get(workspace: Workspace, id: string): Payment {
    const payment = workspace.payments.find((p) => p.id === id);
    if (!payment) throw DomainError.notFound('Payment');
    return payment;
  }

  /** Side-effect-free preview. The review screen renders exactly what will happen. */
  quote(workspace: Workspace, actor: User, input: CreatePaymentInput): PaymentQuote {
    const account = this.account(workspace, input.fromAccountId);
    const destination = this.resolveDestination(workspace, input);
    this.assertRailAllowed(input.rail, destination);

    const now = new Date();
    const fee = RAIL_FEES[input.rail];
    const arrival = estimateArrival(input.rail, now);
    const decision = evaluatePolicies(
      workspace.policies,
      input.rail,
      input.amount,
      destination.recipient,
    );
    const available = this.ledger.available(workspace, account.id);
    const availableAfter = available - input.amount - fee;

    const warnings: QuoteWarning[] = [];
    if (availableAfter < 0) {
      warnings.push({
        code: 'insufficient_funds',
        severity: 'blocking',
        message: `${account.name} has ${formatCents(available)} available.`,
      });
    } else if (availableAfter < LOW_BALANCE && account.kind === 'operating') {
      warnings.push({
        code: 'low_balance',
        severity: 'warning',
        message: `This leaves ${account.name} below ${formatCents(LOW_BALANCE)}.`,
      });
    }
    if (arrival.afterCutoff && !input.scheduledFor) {
      warnings.push({
        code: 'after_cutoff',
        severity: 'info',
        message: `${arrival.cutoffLabel ?? 'The cut-off has passed'}. This goes out next business day.`,
      });
    }
    if (destination.recipient?.isNew) {
      warnings.push({
        code: 'new_recipient',
        severity: 'info',
        message: `First payment to ${destination.recipient.name}. Confirm their details by phone.`,
      });
    }
    if (input.amount >= LARGE_PAYMENT && input.rail !== 'book') {
      warnings.push({
        code: 'large_amount',
        severity: 'info',
        message: 'Large payment. Your Post Oak treasury desk is notified as a courtesy.',
      });
    }

    const approvers = workspace.users.filter(
      (user) =>
        user.id !== actor.id && user.status === 'active' && can(user.role, 'payments:approve'),
    );
    return {
      fee,
      estimatedArrival: arrival.at.toISOString(),
      arrivalLabel: arrival.label,
      cutoffLabel: arrival.cutoffLabel,
      requiresApproval: decision.requiredApprovals > 0,
      requiredApprovals: decision.requiredApprovals,
      policyName: decision.policy?.name ?? null,
      approverNames: approvers.map((user) => user.name),
      availableAfter,
      warnings,
    };
  }

  create(
    workspace: Workspace,
    actor: User,
    input: CreatePaymentInput,
    links: { billId?: string } = {},
  ): Payment {
    const quote = this.quote(workspace, actor, input);
    const blocking = quote.warnings.find((warning) => warning.severity === 'blocking');
    if (blocking) throw DomainError.unprocessable(blocking.code, blocking.message);

    const account = this.account(workspace, input.fromAccountId);
    const destination = this.resolveDestination(workspace, input);
    const now = new Date();
    const scheduledFor = this.futureDate(input.scheduledFor, now);

    const payment: Payment = {
      id: `pay_${randomUUID().slice(0, 12)}`,
      reference: randomUUID().replaceAll('-', '').slice(0, 15).toUpperCase(),
      fromAccountId: account.id,
      fromAccountName: account.name,
      fromLast4: account.last4,
      destination: destination.summary,
      rail: input.rail,
      amount: input.amount,
      fee: quote.fee,
      memo: input.memo || null,
      status: 'processing',
      scheduledFor,
      estimatedArrival: scheduledFor
        ? estimateScheduledArrival(input.rail, new Date(scheduledFor)).toISOString()
        : quote.estimatedArrival,
      createdAt: now.toISOString(),
      createdById: actor.id,
      createdByName: actor.name,
      requiredApprovals: quote.requiredApprovals,
      decisions: [],
      policyName: quote.policyName,
      billId: links.billId ?? null,
      timeline: [
        {
          status: 'created',
          label: `Created by ${actor.name}`,
          at: now.toISOString(),
          actor: actor.name,
        },
      ],
    };
    workspace.payments.unshift(payment);

    this.audit.record(
      workspace,
      actor,
      'Created payment',
      payment.destination.name,
      `${RAIL_LABELS[input.rail]}, ${formatCents(input.amount)}`,
    );

    if (quote.requiresApproval) {
      this.transition(payment, 'pending_approval', `Waiting on: ${quote.policyName}`);
      this.realtime.publish(workspace, 'payment.pending_approval', ['payments', 'overview'], {
        title: 'Payment needs approval',
        body: `${actor.name} sent ${formatCents(input.amount)} to ${payment.destination.name} for review.`,
        tone: 'attention',
        href: '/payments',
      });
      return payment;
    }

    this.releaseOrSchedule(workspace, payment);
    return payment;
  }

  approve(workspace: Workspace, actor: User, id: string, note?: string): Payment {
    const payment = this.awaitingDecision(workspace, id);
    this.assertSeparationOfDuties(payment, actor);

    const at = new Date().toISOString();
    payment.decisions.push({
      userId: actor.id,
      userName: actor.name,
      decision: 'approved',
      at,
      note: note ?? null,
    });
    payment.timeline.push({
      status: 'pending_approval',
      label: `Approved by ${actor.name}`,
      at,
      actor: actor.name,
    });
    this.audit.record(
      workspace,
      actor,
      'Approved payment',
      payment.destination.name,
      formatCents(payment.amount),
    );

    const approvals = payment.decisions.filter((d) => d.decision === 'approved').length;
    if (approvals >= payment.requiredApprovals) this.releaseOrSchedule(workspace, payment);
    this.realtime.publish(workspace, 'payment.approved', ['payments', 'overview']);
    return payment;
  }

  reject(workspace: Workspace, actor: User, id: string, note?: string): Payment {
    const payment = this.awaitingDecision(workspace, id);
    this.assertSeparationOfDuties(payment, actor);

    const at = new Date().toISOString();
    payment.decisions.push({
      userId: actor.id,
      userName: actor.name,
      decision: 'rejected',
      at,
      note: note ?? null,
    });
    this.transition(payment, 'rejected', `Rejected by ${actor.name}`, actor.name);
    this.releaseBill(workspace, payment);
    this.audit.record(workspace, actor, 'Rejected payment', payment.destination.name, note ?? null);
    this.realtime.publish(workspace, 'payment.rejected', ['payments', 'overview', 'bills']);
    return payment;
  }

  cancel(workspace: Workspace, actor: User, id: string): Payment {
    const payment = this.get(workspace, id);
    if (payment.status !== 'pending_approval' && payment.status !== 'scheduled') {
      throw DomainError.conflict(
        'not_cancelable',
        'Only payments that have not left the bank can be canceled.',
      );
    }
    if (payment.createdById !== actor.id && !can(actor.role, 'payments:approve')) {
      throw DomainError.forbidden('Only the creator or an approver can cancel this payment.');
    }
    this.transition(payment, 'canceled', `Canceled by ${actor.name}`, actor.name);
    this.releaseBill(workspace, payment);
    this.audit.record(workspace, actor, 'Canceled payment', payment.destination.name);
    this.realtime.publish(workspace, 'payment.canceled', ['payments', 'overview', 'bills']);
    return payment;
  }

  private releaseOrSchedule(workspace: Workspace, payment: Payment): void {
    if (payment.scheduledFor) {
      this.transition(payment, 'scheduled', `Scheduled for ${payment.scheduledFor}`);
      this.realtime.publish(workspace, 'payment.scheduled', ['payments', 'overview', 'bills']);
      return;
    }
    this.release(workspace, payment);
  }

  /** Places the hold, hands the payment to the provider and lets events drive it from there. */
  private release(workspace: Workspace, payment: Payment): void {
    this.transition(payment, 'processing', 'Submitted to the network');
    this.ledger.hold(workspace, {
      accountId: payment.fromAccountId,
      counterparty: payment.destination.name,
      description: `${RAIL_LABELS[payment.rail].toUpperCase()} OUT ${payment.destination.name.toUpperCase()}`,
      amount: -payment.amount,
      rail: payment.rail,
      category: this.categoryFor(workspace, payment),
      memo: payment.memo,
      paymentId: payment.id,
      billId: payment.billId,
    });
    this.baas.submitPayment(workspace, payment);
    this.realtime.publish(workspace, 'payment.processing', [
      'payments',
      'transactions',
      'accounts',
      'overview',
      'bills',
    ]);
  }

  private applyProviderEvent(workspace: Workspace, event: BaasEvent): void {
    const payment = workspace.payments.find((p) => p.id === event.paymentId);
    if (!payment) return;

    if (event.type === 'payment.in_transit') {
      this.transition(payment, 'in_transit', 'Accepted by the network');
      this.realtime.publish(workspace, event.type, ['payments']);
      return;
    }
    this.settle(workspace, payment);
  }

  private settle(workspace: Workspace, payment: Payment): void {
    const hold = workspace.transactions.find(
      (t) => t.paymentId === payment.id && t.status === 'pending',
    );
    if (hold) this.ledger.settle(workspace, hold.id);
    if (payment.fee > 0) {
      this.ledger.post(workspace, {
        accountId: payment.fromAccountId,
        counterparty: `${RAIL_LABELS[payment.rail]} fee`,
        description: `${RAIL_LABELS[payment.rail].toUpperCase()} FEE ${payment.reference}`,
        amount: -payment.fee,
        rail: 'fee',
        category: 'fees',
        paymentId: payment.id,
      });
    }
    if (payment.destination.type === 'account') {
      const from = this.account(workspace, payment.fromAccountId);
      this.ledger.post(workspace, {
        accountId: payment.destination.id,
        counterparty: `${from.name} ••${from.last4}`,
        description: `BOOK TRANSFER FROM ${from.name.toUpperCase()}`,
        amount: payment.amount,
        rail: 'book',
        category: 'transfer',
        paymentId: payment.id,
      });
    }

    const recipient = workspace.recipients.find((r) => r.id === payment.destination.id);
    if (recipient) {
      recipient.isNew = false;
      recipient.totalPaid += payment.amount;
      recipient.paymentCount += 1;
      recipient.lastPaidAt = new Date().toISOString();
    }

    const bill = workspace.bills.find((b) => b.id === payment.billId);
    if (bill) {
      bill.status = 'paid';
      bill.paidAt = new Date().toISOString();
    }

    this.transition(payment, 'settled', 'Settled');
    this.realtime.publish(
      workspace,
      'payment.settled',
      ['payments', 'transactions', 'accounts', 'overview', 'insights', 'bills', 'recipients'],
      {
        title: SETTLED_TITLES[payment.rail],
        body: `${formatCents(payment.amount)} reached ${payment.destination.name}.`,
        tone: 'positive',
        href: '/payments',
      },
    );
  }

  private releaseBill(workspace: Workspace, payment: Payment): void {
    const bill = workspace.bills.find((b) => b.id === payment.billId);
    if (!bill) return;
    bill.status = 'awaiting_payment';
    bill.paymentId = null;
    bill.scheduledFor = null;
  }

  private transition(
    payment: Payment,
    status: PaymentStatus,
    label: string,
    actor: string | null = null,
  ): void {
    payment.status = status;
    payment.timeline.push({ status, label, at: new Date().toISOString(), actor });
  }

  private awaitingDecision(workspace: Workspace, id: string): Payment {
    const payment = this.get(workspace, id);
    if (payment.status !== 'pending_approval') {
      throw DomainError.conflict('not_awaiting_approval', 'This payment is not awaiting approval.');
    }
    return payment;
  }

  /** Maker-checker: nobody approves their own payment, whatever their role. */
  private assertSeparationOfDuties(payment: Payment, actor: User): void {
    if (payment.createdById === actor.id) {
      throw DomainError.forbidden(
        'You created this payment, so a second person has to approve it.',
      );
    }
    if (payment.decisions.some((decision) => decision.userId === actor.id)) {
      throw DomainError.conflict('already_decided', 'You have already reviewed this payment.');
    }
  }

  private assertRailAllowed(rail: PaymentRail, destination: ResolvedDestination): void {
    const internal = destination.summary.type === 'account';
    if (internal && rail !== 'book') {
      throw DomainError.unprocessable(
        'invalid_rail',
        'Transfers between your accounts are internal.',
      );
    }
    if (!internal && rail === 'book') {
      throw DomainError.unprocessable(
        'invalid_rail',
        'Choose ACH, wire or instant for recipients.',
      );
    }
  }

  private resolveDestination(workspace: Workspace, input: CreatePaymentInput): ResolvedDestination {
    if (input.destination.type === 'account') {
      if (input.destination.accountId === input.fromAccountId) {
        throw DomainError.unprocessable('same_account', 'Choose two different accounts.');
      }
      const account = this.account(workspace, input.destination.accountId);
      return {
        recipient: null,
        account,
        summary: {
          type: 'account',
          id: account.id,
          name: account.name,
          bankName: 'Post Oak',
          last4: account.last4,
        },
      };
    }
    const { recipientId } = input.destination;
    const recipient = workspace.recipients.find((r) => r.id === recipientId);
    if (!recipient) throw DomainError.notFound('Recipient');
    return {
      recipient,
      account: null,
      summary: {
        type: 'recipient',
        id: recipient.id,
        name: recipient.name,
        bankName: recipient.bankName,
        last4: recipient.accountLast4,
      },
    };
  }

  private account(workspace: Workspace, id: string): AccountRecord {
    const account = workspace.accounts.find((a) => a.id === id);
    if (!account) throw DomainError.notFound('Account');
    return account;
  }

  private categoryFor(workspace: Workspace, payment: Payment) {
    if (payment.destination.type === 'account') return 'transfer' as const;
    const bill = workspace.bills.find((b) => b.id === payment.billId);
    if (bill) return bill.category;
    const recipient = workspace.recipients.find((r) => r.id === payment.destination.id);
    return recipient?.defaultCategory ?? ('uncategorized' as const);
  }

  private futureDate(date: string | undefined, now: Date): string | null {
    if (!date) return null;
    return date > toIsoDate(now) ? date : null;
  }

  /** Sum of payments still waiting on a decision, for the overview tile. */
  pendingApprovalTotal(workspace: Workspace): { count: number; total: Cents } {
    const pending = workspace.payments.filter((p) => p.status === 'pending_approval');
    return { count: pending.length, total: pending.reduce((sum, p) => sum + p.amount, 0) };
  }
}
