'use client';

import { type Payment, PAYMENT_STATUS_LABELS, RAIL_LABELS } from '@post-oak/contracts';
import { Check, ShieldCheck, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { Amount } from '@/components/ui/amount';
import { Button } from '@/components/ui/button';
import { StatusPill } from '@/components/ui/status-pill';
import { useSession } from '@/lib/api/queries';
import { dateTime, longDate, shortDate } from '@/lib/format';
import { useCan } from '@/lib/use-permission';
import { PAYMENT_STATUS_TONE } from './labels';
import { PaymentProgress } from './payment-progress';
import { Tombstone } from './tombstone';
import { usePaymentDecision } from './use-payment-actions';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-2">
      <dt className="text-[13px] text-ink-3">{label}</dt>
      <dd className="min-w-0 text-right text-[13.5px] font-semibold text-ink">{children}</dd>
    </div>
  );
}

export function PaymentDetail({ payment }: { payment: Payment }) {
  const { data: session } = useSession();
  const can = useCan();
  const { approve, reject, cancel } = usePaymentDecision();

  const own = payment.createdById === session?.user.id;
  const pending = payment.status === 'pending_approval';
  const canDecide = pending && can('payments:approve') && !own;
  const canCancel = (pending || payment.status === 'scheduled') && (own || can('payments:approve'));

  return (
    <div className="px-6 pt-6 pb-8">
      <StatusPill tone={PAYMENT_STATUS_TONE[payment.status]}>
        {PAYMENT_STATUS_LABELS[payment.status]}
      </StatusPill>
      <h2 className="mt-3 font-display text-[28px] leading-tight text-ink">
        {payment.destination.name}
      </h2>
      <p className="mt-1 font-display text-[34px] leading-none text-ink">
        <Amount cents={payment.amount} />
      </p>

      {!pending && payment.status !== 'rejected' && payment.status !== 'canceled' && (
        <div className="mt-6">
          <PaymentProgress payment={payment} />
        </div>
      )}

      {pending && (
        <div className="mt-5 rounded-xl bg-warning-soft px-4 py-3 text-[13px] text-warning">
          <p className="flex items-center gap-2 font-bold">
            <ShieldCheck className="size-4" />
            {payment.policyName}
          </p>
          <p className="mt-0.5">
            {own
              ? 'You created this payment, so a second person has to approve it.'
              : `Created by ${payment.createdByName}. Your approval releases it.`}
          </p>
        </div>
      )}

      {(canDecide || canCancel) && (
        <div className="mt-4 flex gap-2">
          {canDecide && (
            <>
              <Button
                variant="primary"
                className="flex-1"
                loading={approve.isPending}
                onClick={() => approve.mutate(payment.id)}
              >
                <Check />
                Approve
              </Button>
              <Button
                className="flex-1"
                loading={reject.isPending}
                onClick={() => reject.mutate(payment.id)}
              >
                <X />
                Reject
              </Button>
            </>
          )}
          {canCancel && !canDecide && (
            <Button
              variant="danger-ghost"
              loading={cancel.isPending}
              onClick={() => cancel.mutate(payment.id)}
            >
              Cancel payment
            </Button>
          )}
        </div>
      )}

      <dl className="mt-6 divide-y divide-line border-y border-line">
        <Fact label="From">
          {payment.fromAccountName} ••{payment.fromLast4}
        </Fact>
        <Fact label="To">
          {payment.destination.bankName} ••{payment.destination.last4}
        </Fact>
        <Fact label="Method">{RAIL_LABELS[payment.rail]}</Fact>
        <Fact label="Fee">{payment.fee === 0 ? 'No fee' : <Amount cents={payment.fee} />}</Fact>
        {payment.scheduledFor && <Fact label="Sends on">{longDate(payment.scheduledFor)}</Fact>}
        <Fact label="Estimated arrival">{shortDate(payment.estimatedArrival)}</Fact>
        {payment.memo && <Fact label="Memo">{payment.memo}</Fact>}
        <Fact label="Reference">
          <span className="numeric text-[12.5px] tracking-wide">{payment.reference}</span>
        </Fact>
      </dl>

      <h3 className="mt-6 eyebrow">History</h3>
      <ol className="mt-3 space-y-3">
        {payment.timeline.map((event, index) => (
          <li key={`${event.label}-${index}`} className="relative flex gap-3">
            <span className="relative mt-1.5 flex size-2 shrink-0 rounded-full bg-accent">
              {index < payment.timeline.length - 1 && (
                <span className="absolute top-3 left-[3px] h-[calc(100%+6px)] w-0.5 bg-line" />
              )}
            </span>
            <div className="leading-tight">
              <p className="text-[13.5px] font-semibold text-ink">{event.label}</p>
              <p className="mt-0.5 text-[12.5px] text-ink-3">{dateTime(event.at)}</p>
            </div>
          </li>
        ))}
      </ol>

      {payment.status === 'settled' && (
        <div className="mt-8">
          <Tombstone payment={payment} companyName={session?.company.name ?? ''} />
        </div>
      )}
    </div>
  );
}
