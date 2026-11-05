'use client';

import type { Bill, Invoice, Payment } from '@post-oak/contracts';
import { PAYMENT_STATUS_LABELS, RAIL_LABELS } from '@post-oak/contracts';
import { ArrowRight, Check, Clock3, FileWarning, ReceiptText, ShieldCheck, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import { Amount } from '@/components/ui/amount';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/controls';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { RowsSkeleton } from '@/components/ui/skeleton';
import { usePaymentDecision } from '@/features/payments/use-payment-actions';
import { useBills, useInvoices, usePayments, useSession } from '@/lib/api/queries';
import { dueLabel, relativeTime } from '@/lib/format';
import { useCan } from '@/lib/use-permission';

function Row({
  icon,
  title,
  meta,
  amount,
  actions,
}: {
  icon: ReactNode;
  title: ReactNode;
  meta: ReactNode;
  amount: number;
  actions: ReactNode;
}) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, x: 16, height: 0 }}
      transition={{ duration: 0.25 }}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3"
    >
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-surface-2 text-ink-2 [&_svg]:size-4">
        {icon}
      </span>
      <div className="min-w-0 flex-1 basis-40 leading-tight">
        <p className="truncate text-[14px] font-bold text-ink">{title}</p>
        <p className="mt-0.5 truncate text-[12.5px] text-ink-3">{meta}</p>
      </div>
      <Amount cents={amount} className="text-[14px] font-bold text-ink" />
      <div className="flex shrink-0 items-center gap-1.5">{actions}</div>
    </motion.li>
  );
}

function ApprovalRow({ payment }: { payment: Payment }) {
  const { data: session } = useSession();
  const can = useCan();
  const { approve, reject } = usePaymentDecision();
  const own = payment.createdById === session?.user.id;
  const canDecide = can('payments:approve') && !own;

  return (
    <Row
      icon={<ShieldCheck />}
      title={payment.destination.name}
      meta={`${RAIL_LABELS[payment.rail]} from ${payment.createdByName}, ${relativeTime(payment.createdAt)}`}
      amount={payment.amount}
      actions={
        canDecide ? (
          <>
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
          </>
        ) : (
          <span className="text-[12.5px] font-semibold text-ink-3">
            {PAYMENT_STATUS_LABELS[payment.status]}
          </span>
        )
      }
    />
  );
}

function BillRow({ bill }: { bill: Bill }) {
  return (
    <Row
      icon={<ReceiptText />}
      title={bill.vendor}
      meta={`${bill.invoiceNumber}, ${dueLabel(bill.dueOn).toLowerCase()}`}
      amount={bill.amount}
      actions={
        <Button size="sm" asChild>
          <Link href={`/bills?bill=${bill.id}`}>Pay</Link>
        </Button>
      }
    />
  );
}

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  return (
    <Row
      icon={<FileWarning />}
      title={invoice.customer}
      meta={`${invoice.number}, ${invoice.daysOverdue} days overdue`}
      amount={invoice.total}
      actions={
        <Button size="sm" asChild>
          <Link href={`/invoices?invoice=${invoice.id}`}>Follow up</Link>
        </Button>
      }
    />
  );
}

/** One queue for everything waiting on a decision, ranked by how much is at stake. */
export function AttentionPanel() {
  const { data: payments } = usePayments();
  const { data: bills } = useBills();
  const { data: invoices } = useInvoices();

  const approvals = payments?.filter((p) => p.status === 'pending_approval') ?? [];
  const overdueBills = bills?.filter((b) => b.isOverdue) ?? [];
  const overdueInvoices =
    invoices
      ?.filter((i) => i.isOverdue)
      .sort((a, b) => b.total - a.total)
      .slice(0, 2) ?? [];
  const loading = !payments || !bills || !invoices;
  const count = approvals.length + overdueBills.length + overdueInvoices.length;

  return (
    <Panel className="flex h-full flex-col">
      <PanelHeader
        title="Needs your attention"
        description={
          loading
            ? ' '
            : count === 0
              ? 'Nothing is waiting on you.'
              : `${count} items, largest first`
        }
        action={
          <Link
            href="/payments"
            className="group flex items-center gap-1 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink"
          >
            All payments
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        }
      />
      {loading ? (
        <RowsSkeleton rows={4} />
      ) : count === 0 ? (
        <EmptyState title="All clear" description="Approvals and overdue items will appear here." />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          <AnimatePresence initial={false}>
            {approvals.map((payment) => (
              <ApprovalRow key={payment.id} payment={payment} />
            ))}
            {overdueBills.map((bill) => (
              <BillRow key={bill.id} bill={bill} />
            ))}
            {overdueInvoices.map((invoice) => (
              <InvoiceRow key={invoice.id} invoice={invoice} />
            ))}
          </AnimatePresence>
        </ul>
      )}
      {!loading && (
        <p className="mt-auto flex items-center gap-1.5 border-t border-line px-5 py-2.5 text-[12px] text-ink-3">
          <Clock3 className="size-3.5" />
          Same-day wires close at 4:00 PM Central.
        </p>
      )}
    </Panel>
  );
}
