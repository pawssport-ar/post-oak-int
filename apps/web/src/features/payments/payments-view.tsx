'use client';

import {
  type Payment,
  PAYMENT_STATUS_LABELS,
  RAIL_LABELS,
  RECIPIENT_TYPE_LABELS,
  type Recipient,
} from '@post-oak/contracts';
import { ArrowRight, Check, Send, X } from 'lucide-react';
import { parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs';
import { useAppActions } from '@/components/layout/app-context';
import { Amount } from '@/components/ui/amount';
import { Button } from '@/components/ui/button';
import { EmptyState, Tabs } from '@/components/ui/controls';
import { Monogram } from '@/components/ui/monogram';
import { PageHeader, Panel } from '@/components/ui/panel';
import { Reveal, RevealItem } from '@/components/ui/reveal';
import { Sheet } from '@/components/ui/sheet';
import { RowsSkeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/ui/status-pill';
import { usePayments, useRecipients, useSession } from '@/lib/api/queries';
import { relativeTime, shortDate } from '@/lib/format';
import { useCan } from '@/lib/use-permission';
import { PAYMENT_STATUS_TONE } from './labels';
import { PaymentDetail } from './payment-detail';
import { usePaymentDecision } from './use-payment-actions';

const TABS = ['approvals', 'upcoming', 'history', 'recipients'] as const;
type Tab = (typeof TABS)[number];

function PaymentRow({ payment, onOpen }: { payment: Payment; onOpen: () => void }) {
  const { data: session } = useSession();
  const can = useCan();
  const { approve, reject } = usePaymentDecision();
  const canDecide =
    payment.status === 'pending_approval' &&
    can('payments:approve') &&
    payment.createdById !== session?.user.id;

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-2.5 transition-colors hover:bg-surface-2/70">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 basis-56 items-center gap-3 text-left"
      >
        <Monogram name={payment.destination.name} />
        <span className="min-w-0 leading-tight">
          <span className="block truncate text-[14px] font-bold text-ink">
            {payment.destination.name}
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] text-ink-3">
            {RAIL_LABELS[payment.rail]} from {payment.fromAccountName}
            {payment.memo ? ` · ${payment.memo}` : ''}
          </span>
        </span>
      </button>
      <span className="hidden w-32 shrink-0 text-[12.5px] text-ink-3 md:block">
        {payment.scheduledFor
          ? `Sends ${shortDate(payment.scheduledFor)}`
          : relativeTime(payment.createdAt)}
      </span>
      <StatusPill tone={PAYMENT_STATUS_TONE[payment.status]} className="shrink-0">
        {PAYMENT_STATUS_LABELS[payment.status]}
      </StatusPill>
      <Amount
        cents={payment.amount}
        className="w-28 shrink-0 text-right text-[14px] font-bold text-ink"
      />
      {canDecide && (
        <div className="flex shrink-0 gap-1.5">
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Reject payment to ${payment.destination.name}`}
            loading={reject.isPending && reject.variables === payment.id}
            onClick={() => reject.mutate(payment.id)}
          >
            <X />
          </Button>
          <Button
            size="sm"
            variant="primary"
            loading={approve.isPending && approve.variables === payment.id}
            onClick={() => approve.mutate(payment.id)}
          >
            <Check />
            Approve
          </Button>
        </div>
      )}
    </li>
  );
}

function RecipientRow({ recipient, onPay }: { recipient: Recipient; onPay?: () => void }) {
  return (
    <li className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-surface-2/70">
      <Monogram name={recipient.name} />
      <div className="min-w-0 flex-1 leading-tight">
        <p className="flex items-center gap-2">
          <span className="truncate text-[14px] font-bold text-ink">{recipient.name}</span>
          {recipient.isNew && <StatusPill tone="info">New</StatusPill>}
        </p>
        <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
          {RECIPIENT_TYPE_LABELS[recipient.type]} · {recipient.bankName} ••{recipient.accountLast4}
        </p>
      </div>
      <div className="hidden text-right leading-tight sm:block">
        <Amount cents={recipient.totalPaid} className="text-[13.5px] font-semibold text-ink" />
        <p className="mt-0.5 text-[12px] text-ink-3">{recipient.paymentCount} payments</p>
      </div>
      {onPay && (
        <Button size="sm" onClick={onPay}>
          Pay
          <ArrowRight />
        </Button>
      )}
    </li>
  );
}

export function PaymentsView() {
  const can = useCan();
  const { openSendMoney } = useAppActions();
  const [tab, setTab] = useQueryState('tab', parseAsStringLiteral(TABS).withDefault('approvals'));
  const [selectedId, setSelectedId] = useQueryState('payment', parseAsString);

  const { data: payments } = usePayments();
  const canCreate = can('payments:create');
  const { data: recipients } = useRecipients(canCreate);

  const groups: Record<Exclude<Tab, 'recipients'>, Payment[]> = {
    approvals: payments?.filter((p) => p.status === 'pending_approval') ?? [],
    upcoming:
      payments?.filter((p) => ['scheduled', 'processing', 'in_transit'].includes(p.status)) ?? [],
    history:
      payments?.filter((p) => ['settled', 'rejected', 'canceled', 'failed'].includes(p.status)) ??
      [],
  };
  const selected = payments?.find((p) => p.id === selectedId);

  const EMPTY_COPY: Record<Exclude<Tab, 'recipients'>, [string, string]> = {
    approvals: ['Nothing to approve', 'Payments that need a second person will wait here.'],
    upcoming: ['Nothing in flight', 'Scheduled and moving payments will appear here.'],
    history: ['No history yet', 'Settled payments will appear here.'],
  };

  return (
    <Reveal>
      <RevealItem>
        <PageHeader
          title="Payments"
          description="ACH, wires and instant payments, with dual approval built in."
          actions={
            canCreate && (
              <>
                <Button onClick={() => openSendMoney({ mode: 'internal' })}>Transfer</Button>
                <Button variant="primary" onClick={() => openSendMoney()}>
                  <Send />
                  Send money
                </Button>
              </>
            )
          }
        />
      </RevealItem>

      <RevealItem>
        <Tabs
          value={tab}
          onValueChange={setTab}
          className="mb-4"
          tabs={[
            { value: 'approvals', label: 'Needs approval', count: groups.approvals.length },
            { value: 'upcoming', label: 'In flight', count: groups.upcoming.length },
            { value: 'history', label: 'History' },
            ...(canCreate
              ? [{ value: 'recipients' as const, label: 'Recipients', count: recipients?.length }]
              : []),
          ]}
        />
      </RevealItem>

      <RevealItem>
        <Panel className="overflow-hidden">
          {!payments ? (
            <RowsSkeleton />
          ) : tab === 'recipients' ? (
            <ul className="divide-y divide-line">
              {recipients?.map((recipient) => (
                <RecipientRow
                  key={recipient.id}
                  recipient={recipient}
                  onPay={() => openSendMoney({ recipientId: recipient.id })}
                />
              ))}
            </ul>
          ) : groups[tab].length === 0 ? (
            <EmptyState title={EMPTY_COPY[tab][0]} description={EMPTY_COPY[tab][1]} />
          ) : (
            <ul className="divide-y divide-line">
              {groups[tab].map((payment) => (
                <PaymentRow
                  key={payment.id}
                  payment={payment}
                  onOpen={() => void setSelectedId(payment.id)}
                />
              ))}
            </ul>
          )}
        </Panel>
      </RevealItem>

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => !open && void setSelectedId(null)}
        title="Payment details"
      >
        {selected && <PaymentDetail payment={selected} />}
      </Sheet>
    </Reveal>
  );
}
