'use client';

import type { AgingBucket, Invoice } from '@post-oak/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BellRing, CheckCircle2, Plus, Send } from 'lucide-react';
import { parseAsBoolean, parseAsString, parseAsStringLiteral, useQueryState } from 'nuqs';
import { Amount } from '@/components/ui/amount';
import { Button } from '@/components/ui/button';
import { EmptyState, Tabs, Tooltip } from '@/components/ui/controls';
import { Monogram } from '@/components/ui/monogram';
import { PageHeader, Panel } from '@/components/ui/panel';
import { Reveal, RevealItem } from '@/components/ui/reveal';
import { Sheet } from '@/components/ui/sheet';
import { RowsSkeleton, Skeleton } from '@/components/ui/skeleton';
import { StatusPill, type Tone } from '@/components/ui/status-pill';
import { toast, toastError } from '@/components/ui/toaster';
import { api } from '@/lib/api/client';
import { useInvoices, useReceivables, useSession } from '@/lib/api/queries';
import { money, moneyCompact, relativeTime, shortDate } from '@/lib/format';
import { useCan } from '@/lib/use-permission';
import { CreateInvoiceDialog } from './create-invoice-dialog';
import { InvoicePaper } from './invoice-paper';

function invoiceState(invoice: Invoice): { tone: Tone; label: string } {
  if (invoice.status === 'paid') return { tone: 'positive', label: 'Paid' };
  if (invoice.status === 'void') return { tone: 'neutral', label: 'Void' };
  if (invoice.status === 'draft') return { tone: 'neutral', label: 'Draft' };
  if (invoice.isOverdue) return { tone: 'negative', label: `${invoice.daysOverdue}d overdue` };
  return invoice.status === 'viewed'
    ? { tone: 'info', label: 'Viewed' }
    : { tone: 'accent', label: 'Sent' };
}

function useInvoiceActions() {
  const client = useQueryClient();
  const refresh = () => {
    for (const key of ['invoices', 'overview', 'transactions', 'accounts', 'insights']) {
      void client.invalidateQueries({ queryKey: [key] });
    }
  };

  const remind = useMutation({
    mutationFn: (id: string) => api<Invoice>(`/invoices/${id}/remind`, { method: 'POST' }),
    onSuccess: (invoice) => {
      refresh();
      toast({
        title: 'Reminder sent',
        description: `${invoice.customer} was reminded about ${invoice.number}.`,
        tone: 'positive',
      });
    },
    onError: toastError,
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => api<Invoice>(`/invoices/${id}/mark-paid`, { method: 'POST' }),
    onSuccess: refresh,
    onError: toastError,
  });

  const send = useMutation({
    mutationFn: (id: string) => api<Invoice>(`/invoices/${id}/send`, { method: 'POST' }),
    onSuccess: refresh,
    onError: toastError,
  });

  return { remind, markPaid, send };
}

const AGING_RAMP = ['var(--oak-300)', 'var(--brass-400)', '#c98a3f', '#c2553a', '#8f2f24'];

/** Receivables by age, on an ordered ramp: the older the money, the hotter the color. */
function AgingBar({ buckets }: { buckets: AgingBucket[] }) {
  const total = buckets.reduce((sum, bucket) => sum + bucket.amount, 0);
  return (
    <div>
      <div className="flex h-7 gap-0.5" role="img" aria-label="Receivables by age">
        {buckets
          .filter((bucket) => bucket.amount > 0)
          .map((bucket) => {
            const share = total === 0 ? 0 : bucket.amount / total;
            const index = buckets.indexOf(bucket);
            return (
              <Tooltip
                key={bucket.key}
                content={`${bucket.label}: ${money(bucket.amount)}, ${bucket.count} invoices`}
              >
                <div
                  tabIndex={0}
                  className="flex h-full min-w-1 items-center overflow-hidden rounded px-2 text-[11.5px] font-bold text-oak-950"
                  style={{ width: `${share * 100}%`, background: AGING_RAMP[index] }}
                >
                  {share > 0.1 && `${Math.round(share * 100)}%`}
                </div>
              </Tooltip>
            );
          })}
      </div>
      <ul className="mt-2.5 flex flex-wrap gap-x-5 gap-y-1">
        {buckets.map((bucket, index) => (
          <li key={bucket.key} className="flex items-center gap-1.5 text-[12px] text-ink-2">
            <span className="size-2.5 rounded-[3px]" style={{ background: AGING_RAMP[index] }} />
            {bucket.label}
            <span className="numeric font-semibold text-ink">{moneyCompact(bucket.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function InvoiceRow({ invoice, onOpen }: { invoice: Invoice; onOpen: () => void }) {
  const state = invoiceState(invoice);
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full flex-wrap items-center gap-x-3 gap-y-2 px-5 py-2.5 text-left transition-colors hover:bg-surface-2/70"
      >
        <Monogram name={invoice.customer} />
        <span className="min-w-0 flex-1 basis-40 leading-tight">
          <span className="block truncate text-[14px] font-bold text-ink">{invoice.customer}</span>
          <span className="numeric mt-0.5 block truncate text-[12.5px] text-ink-3">
            {invoice.number} · Due {shortDate(invoice.dueOn)}
          </span>
        </span>
        <StatusPill tone={state.tone} className="shrink-0">
          {state.label}
        </StatusPill>
        <Amount
          cents={invoice.total}
          className="w-32 shrink-0 text-right text-[14px] font-bold text-ink"
        />
      </button>
    </li>
  );
}

function InvoiceDetail({ invoice }: { invoice: Invoice }) {
  const can = useCan();
  const { data: session } = useSession();
  const { remind, markPaid, send } = useInvoiceActions();
  const canManage = can('invoices:manage');
  const open = invoice.status === 'sent' || invoice.status === 'viewed';
  const state = invoiceState(invoice);

  return (
    <div className="px-6 pt-6 pb-8">
      <StatusPill tone={state.tone}>{state.label}</StatusPill>
      <h2 className="mt-3 font-display text-[26px] leading-tight text-ink">{invoice.customer}</h2>
      <p className="mt-1 font-display text-[34px] leading-none text-ink">
        <Amount cents={invoice.total} />
      </p>
      {invoice.lastReminderAt && (
        <p className="mt-2 text-[13px] text-ink-3">
          Last reminder {relativeTime(invoice.lastReminderAt)}
        </p>
      )}

      {canManage && (open || invoice.status === 'draft') && (
        <div className="mt-4 flex flex-wrap gap-2">
          {invoice.status === 'draft' && (
            <Button
              variant="primary"
              loading={send.isPending}
              onClick={() => send.mutate(invoice.id)}
            >
              <Send />
              Send invoice
            </Button>
          )}
          {open && (
            <>
              <Button
                variant="primary"
                loading={markPaid.isPending}
                onClick={() => markPaid.mutate(invoice.id)}
              >
                <CheckCircle2 />
                Mark as paid
              </Button>
              <Button loading={remind.isPending} onClick={() => remind.mutate(invoice.id)}>
                <BellRing />
                Send reminder
              </Button>
            </>
          )}
        </div>
      )}

      <InvoicePaper
        className="mt-5"
        number={invoice.number}
        company={session?.company.legalName ?? ''}
        customer={invoice.customer}
        customerEmail={invoice.customerEmail}
        issuedOn={invoice.issuedOn}
        dueOn={invoice.dueOn}
        lines={invoice.lines}
        subtotal={invoice.subtotal}
        tax={invoice.tax}
        total={invoice.total}
        memo={invoice.memo}
      />
    </div>
  );
}

const FILTERS = ['open', 'overdue', 'paid', 'all'] as const;

export function InvoicesView() {
  const can = useCan();
  const { data: invoices } = useInvoices();
  const { data: summary } = useReceivables();
  const [filter, setFilter] = useQueryState(
    'status',
    parseAsStringLiteral(FILTERS).withDefault('open'),
  );
  const [selectedId, setSelectedId] = useQueryState('invoice', parseAsString);
  const [creating, setCreating] = useQueryState('new', parseAsBoolean.withDefault(false));

  const isOpen = (i: Invoice) =>
    i.status === 'sent' || i.status === 'viewed' || i.status === 'draft';
  const groups: Record<(typeof FILTERS)[number], Invoice[]> = {
    open: invoices?.filter(isOpen) ?? [],
    overdue: invoices?.filter((i) => i.isOverdue) ?? [],
    paid: invoices?.filter((i) => i.status === 'paid') ?? [],
    all: invoices ?? [],
  };
  const selected = invoices?.find((invoice) => invoice.id === selectedId);

  return (
    <Reveal>
      <RevealItem>
        <PageHeader
          title="Invoices"
          description="Bill customers and see every receivable by age. Payments reconcile on their own."
          actions={
            can('invoices:manage') && (
              <Button variant="primary" onClick={() => void setCreating(true)}>
                <Plus />
                New invoice
              </Button>
            )
          }
        />
      </RevealItem>

      <RevealItem className="mb-4">
        <Panel className="px-5 py-4">
          {summary ? (
            <>
              <div className="mb-4 flex flex-wrap gap-x-10 gap-y-3">
                <div>
                  <p className="eyebrow">Outstanding</p>
                  <p className="mt-1 font-display text-[28px] leading-none text-ink">
                    <Amount cents={summary.outstanding} />
                  </p>
                </div>
                <div>
                  <p className="eyebrow">Overdue</p>
                  <p className="mt-1 font-display text-[28px] leading-none text-ink">
                    <Amount cents={summary.overdue} />
                  </p>
                </div>
                <div>
                  <p className="eyebrow">Collected, 30 days</p>
                  <p className="mt-1 font-display text-[28px] leading-none text-ink">
                    <Amount cents={summary.paidLast30d} />
                  </p>
                </div>
                <div>
                  <p className="eyebrow">Average days to pay</p>
                  <p className="numeric mt-1 font-display text-[28px] leading-none text-ink">
                    {summary.averageDaysToPay}
                  </p>
                </div>
              </div>
              <AgingBar buckets={summary.aging} />
            </>
          ) : (
            <Skeleton className="h-28 w-full" />
          )}
        </Panel>
      </RevealItem>

      <RevealItem>
        <Tabs
          value={filter}
          onValueChange={setFilter}
          className="mb-4"
          tabs={[
            { value: 'open', label: 'Open', count: groups.open.length },
            { value: 'overdue', label: 'Overdue', count: groups.overdue.length },
            { value: 'paid', label: 'Paid' },
            { value: 'all', label: 'All' },
          ]}
        />
      </RevealItem>

      <RevealItem>
        <Panel className="overflow-hidden">
          {!invoices ? (
            <RowsSkeleton />
          ) : groups[filter].length === 0 ? (
            <EmptyState
              title="Nothing here"
              description="Invoices in this state will appear here."
            />
          ) : (
            <ul className="divide-y divide-line">
              {groups[filter].map((invoice) => (
                <InvoiceRow
                  key={invoice.id}
                  invoice={invoice}
                  onOpen={() => void setSelectedId(invoice.id)}
                />
              ))}
            </ul>
          )}
        </Panel>
      </RevealItem>

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => !open && void setSelectedId(null)}
        title="Invoice details"
      >
        {selected && <InvoiceDetail invoice={selected} />}
      </Sheet>
      <CreateInvoiceDialog open={creating} onClose={() => void setCreating(null)} />
    </Reveal>
  );
}
