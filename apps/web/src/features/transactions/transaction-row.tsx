'use client';

import { CATEGORIES, RAIL_LABELS, type Transaction } from '@post-oak/contracts';
import { Paperclip } from 'lucide-react';
import { Amount } from '@/components/ui/amount';
import { Monogram } from '@/components/ui/monogram';
import { StatusPill } from '@/components/ui/status-pill';
import { cn } from '@/lib/cn';
import { shortDate, timeOnly } from '@/lib/format';
import { TRANSACTION_STATUS_LABEL, TRANSACTION_STATUS_TONE } from './labels';

interface TransactionRowProps {
  transaction: Transaction;
  onOpen: (id: string) => void;
  selected?: boolean;
  compact?: boolean;
}

/** One ledger line. Debits stay neutral; only money coming in earns color. */
export function TransactionRow({ transaction, onOpen, selected, compact }: TransactionRowProps) {
  const t = transaction;
  return (
    <button
      type="button"
      onClick={() => onOpen(t.id)}
      className={cn(
        'grid w-full items-center gap-3 px-5 py-2.5 text-left transition-colors hover:bg-surface-2/70 focus-visible:bg-surface-2/70',
        compact
          ? 'grid-cols-[minmax(0,1fr)_auto]'
          : 'grid-cols-[minmax(0,1fr)_auto] md:grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_72px_132px]',
        selected && 'bg-accent-soft/60',
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <Monogram name={t.counterparty} />
        <span className="min-w-0 leading-tight">
          <span className="flex items-center gap-1.5">
            <span className="truncate text-[14px] font-bold text-ink">{t.counterparty}</span>
            {t.receipt && <Paperclip className="size-3 shrink-0 text-ink-3" aria-label="Receipt" />}
            {t.status !== 'posted' && (
              <StatusPill tone={TRANSACTION_STATUS_TONE[t.status]} className="shrink-0">
                {TRANSACTION_STATUS_LABEL[t.status]}
              </StatusPill>
            )}
          </span>
          <span className="mt-0.5 block truncate text-[12.5px] text-ink-3">
            {RAIL_LABELS[t.rail]}
            {t.cardLabel ? ` · ${t.cardLabel}` : ''}
            {compact ? ` · ${CATEGORIES[t.category].label}` : ` · ${timeOnly(t.date)}`}
          </span>
        </span>
      </span>

      {!compact && (
        <>
          <span className="hidden min-w-0 truncate text-[13px] text-ink-2 md:block">
            {CATEGORIES[t.category].label}
          </span>
          <span className="hidden min-w-0 truncate text-[13px] text-ink-2 md:block">
            {t.accountName}
          </span>
          <span className="numeric hidden text-[13px] text-ink-2 md:block">
            {shortDate(t.date)}
          </span>
        </>
      )}

      <span className="text-right leading-tight">
        <Amount
          cents={t.amount}
          signed
          className={cn(
            'text-[14px] font-bold text-ink',
            (t.status === 'failed' || t.status === 'returned') && 'line-through opacity-60',
          )}
        />
      </span>
    </button>
  );
}
