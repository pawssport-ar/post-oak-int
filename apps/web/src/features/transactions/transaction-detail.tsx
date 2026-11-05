'use client';

import {
  CATEGORIES,
  CATEGORY_IDS,
  type CategoryId,
  RAIL_LABELS,
  type Transaction,
  type UpdateTransactionInput,
} from '@post-oak/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Paperclip, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useRef, useState } from 'react';
import { Amount } from '@/components/ui/amount';
import { Button } from '@/components/ui/button';
import { Field, TextArea } from '@/components/ui/field';
import { Monogram } from '@/components/ui/monogram';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/ui/status-pill';
import { toast, toastError } from '@/components/ui/toaster';
import { api } from '@/lib/api/client';
import { useTransaction } from '@/lib/api/queries';
import { dateTime, money } from '@/lib/format';
import { useCan } from '@/lib/use-permission';
import { TRANSACTION_STATUS_LABEL, TRANSACTION_STATUS_TONE } from './labels';

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-2">
      <dt className="shrink-0 text-[13px] text-ink-3">{label}</dt>
      <dd className="min-w-0 text-right text-[13.5px] font-semibold break-words text-ink">
        {children}
      </dd>
    </div>
  );
}

const CATEGORY_OPTIONS = CATEGORY_IDS.map((id) => ({ value: id, label: CATEGORIES[id].label }));

export function TransactionDetail({ id }: { id: string }) {
  const { data: transaction } = useTransaction(id);
  if (!transaction) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-11 w-11 rounded-lg" />
        <Skeleton className="h-7 w-60" />
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  return <Loaded key={transaction.id} transaction={transaction} />;
}

function Loaded({ transaction: t }: { transaction: Transaction }) {
  const client = useQueryClient();
  const can = useCan();
  const editable = can('transactions:edit');
  const [memo, setMemo] = useState(t.memo ?? '');
  const fileInput = useRef<HTMLInputElement>(null);

  const update = useMutation({
    mutationFn: (input: UpdateTransactionInput) =>
      api<Transaction>(`/transactions/${t.id}`, { method: 'PATCH', body: input }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['transactions'] });
      void client.invalidateQueries({ queryKey: ['insights'] });
    },
    onError: toastError,
  });

  return (
    <div className="px-6 pt-6 pb-8">
      <div className="flex items-center gap-2">
        <Monogram name={t.counterparty} size="lg" />
        <StatusPill tone={TRANSACTION_STATUS_TONE[t.status]}>
          {TRANSACTION_STATUS_LABEL[t.status]}
        </StatusPill>
      </div>
      <h2 className="mt-3 font-display text-[26px] leading-tight text-ink">{t.counterparty}</h2>
      <p className="mt-1 font-display text-[36px] leading-none">
        <Amount cents={t.amount} signed className="text-ink" />
      </p>
      <p className="numeric mt-2 text-[12px] break-all text-ink-3">{t.description}</p>

      <dl className="mt-5 divide-y divide-line border-y border-line">
        <Fact label="Date">{dateTime(t.date)}</Fact>
        <Fact label="Account">{t.accountName}</Fact>
        <Fact label="Method">{RAIL_LABELS[t.rail]}</Fact>
        {t.cardLabel && <Fact label="Card">{t.cardLabel}</Fact>}
        {t.balanceAfter !== null && <Fact label="Balance after">{money(t.balanceAfter)}</Fact>}
        <Fact label="Reference">
          <span className="numeric text-[12.5px] tracking-wide">{t.reference}</span>
        </Fact>
      </dl>

      <div className="mt-5 space-y-4">
        <Field label="Category">
          {(id) => (
            <Select<CategoryId>
              id={id}
              disabled={!editable}
              value={t.category}
              options={CATEGORY_OPTIONS}
              onValueChange={(category) => {
                update.mutate({ category });
                toast({
                  title: 'Category updated',
                  description: `${t.counterparty} is now ${CATEGORIES[category].label}.`,
                  tone: 'positive',
                });
              }}
            />
          )}
        </Field>
        <Field label="Memo">
          {(id) => (
            <TextArea
              id={id}
              disabled={!editable}
              value={memo}
              onChange={(event) => setMemo(event.target.value)}
              onBlur={() => {
                if (memo !== (t.memo ?? '')) update.mutate({ memo: memo || null });
              }}
              placeholder="Add context for your bookkeeper"
            />
          )}
        </Field>

        <div>
          <p className="mb-1.5 text-[13px] font-semibold text-ink-2">Receipt</p>
          {t.receipt ? (
            <div className="flex items-center gap-2 rounded-lg border border-line px-3 py-2">
              <Paperclip className="size-4 text-ink-3" />
              <span className="min-w-0 flex-1 truncate text-[13px] text-ink">{t.receipt}</span>
              {editable && (
                <Button
                  size="icon-sm"
                  variant="ghost"
                  aria-label="Remove receipt"
                  onClick={() => update.mutate({ receipt: null })}
                >
                  <Trash2 />
                </Button>
              )}
            </div>
          ) : (
            <>
              <input
                ref={fileInput}
                type="file"
                className="hidden"
                aria-label="Attach receipt"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) update.mutate({ receipt: file.name.slice(0, 120) });
                }}
              />
              <Button size="sm" disabled={!editable} onClick={() => fileInput.current?.click()}>
                <Paperclip />
                Attach receipt
              </Button>
            </>
          )}
        </div>
      </div>

      <h3 className="mt-6 eyebrow">Timeline</h3>
      <ol className="mt-3 space-y-3">
        {t.timeline.map((event, index) => (
          <li key={`${event.label}-${index}`} className="relative flex gap-3">
            <span className="relative mt-1.5 flex size-2 shrink-0 rounded-full bg-accent">
              {index < t.timeline.length - 1 && (
                <span className="absolute top-3 left-[3px] h-[calc(100%+6px)] w-0.5 bg-line" />
              )}
            </span>
            <div className="leading-tight">
              <p className="text-[13.5px] font-semibold text-ink">{event.label}</p>
              <p className="mt-0.5 text-[12.5px] text-ink-3">
                {event.detail ? `${event.detail} · ` : ''}
                {dateTime(event.at)}
              </p>
            </div>
          </li>
        ))}
      </ol>

      {(t.paymentId || t.invoiceId) && (
        <div className="mt-6 flex flex-wrap gap-2">
          {t.paymentId && (
            <Button size="sm" asChild>
              <Link href={`/payments?tab=history&payment=${t.paymentId}`}>
                View payment
                <ArrowUpRight />
              </Link>
            </Button>
          )}
          {t.invoiceId && (
            <Button size="sm" asChild>
              <Link href={`/invoices?invoice=${t.invoiceId}`}>
                View invoice
                <ArrowUpRight />
              </Link>
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
