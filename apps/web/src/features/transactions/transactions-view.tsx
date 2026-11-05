'use client';

import {
  CATEGORIES,
  CATEGORY_IDS,
  RAIL_LABELS,
  RAILS,
  type Transaction,
  TRANSACTION_STATUSES,
} from '@post-oak/contracts';
import { ArrowDown, ArrowUp, Download, Search } from 'lucide-react';
import {
  parseAsArrayOf,
  parseAsInteger,
  parseAsString,
  parseAsStringLiteral,
  useQueryState,
  useQueryStates,
} from 'nuqs';
import { useDeferredValue, useEffect, useMemo, useRef } from 'react';
import { Amount } from '@/components/ui/amount';
import { Button } from '@/components/ui/button';
import { EmptyState, Segmented } from '@/components/ui/controls';
import { inputClasses } from '@/components/ui/field';
import { PageHeader, Panel } from '@/components/ui/panel';
import { Reveal, RevealItem } from '@/components/ui/reveal';
import { Sheet } from '@/components/ui/sheet';
import { RowsSkeleton } from '@/components/ui/skeleton';
import { toQuery } from '@/lib/api/client';
import { type TransactionFilters, useAccounts, useTransactions } from '@/lib/api/queries';
import { cn } from '@/lib/cn';
import { dayHeading } from '@/lib/format';
import { useCan } from '@/lib/use-permission';
import { AmountFilter, ClearFilters, DateFilter, MultiFilter } from './filters';
import { TRANSACTION_STATUS_LABEL } from './labels';
import { TransactionDetail } from './transaction-detail';
import { TransactionRow } from './transaction-row';

const filterParsers = {
  q: parseAsString.withDefault(''),
  accountId: parseAsArrayOf(parseAsString).withDefault([]),
  category: parseAsArrayOf(parseAsString).withDefault([]),
  rail: parseAsArrayOf(parseAsString).withDefault([]),
  status: parseAsArrayOf(parseAsString).withDefault([]),
  direction: parseAsStringLiteral(['all', 'in', 'out'] as const).withDefault('all'),
  from: parseAsString,
  to: parseAsString,
  minAmount: parseAsInteger,
  maxAmount: parseAsInteger,
  cardId: parseAsString,
  sort: parseAsStringLiteral(['date', 'amount', 'counterparty'] as const).withDefault('date'),
  order: parseAsStringLiteral(['asc', 'desc'] as const).withDefault('desc'),
};

function SortHeader({
  label,
  active,
  order,
  onClick,
  className,
}: {
  label: string;
  active: boolean;
  order: 'asc' | 'desc';
  onClick: () => void;
  className?: string;
}) {
  const Icon = order === 'asc' ? ArrowUp : ArrowDown;
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'eyebrow inline-flex items-center gap-1 transition-colors hover:text-ink-2',
        active && 'text-ink-2',
        className,
      )}
    >
      {label}
      {active && <Icon className="size-3" />}
    </button>
  );
}

/** Splits a date-sorted ledger into day groups. */
function groupByDay(items: Transaction[]): { day: string; items: Transaction[] }[] {
  const groups: { day: string; items: Transaction[] }[] = [];
  for (const item of items) {
    const day = item.date.slice(0, 10);
    const last = groups[groups.length - 1];
    if (last?.day === day) last.items.push(item);
    else groups.push({ day, items: [item] });
  }
  return groups;
}

export function TransactionsView() {
  const can = useCan();
  const [filters, setFilters] = useQueryStates(filterParsers, { history: 'replace' });
  const [selectedId, setSelectedId] = useQueryState('id', parseAsString);
  const deferredQ = useDeferredValue(filters.q);
  const { data: accounts } = useAccounts(can('accounts:view'));

  const apiFilters = useMemo<TransactionFilters>(
    () => ({
      q: deferredQ || undefined,
      accountId: filters.accountId,
      category: filters.category,
      rail: filters.rail,
      status: filters.status,
      direction: filters.direction === 'all' ? undefined : filters.direction,
      from: filters.from ?? undefined,
      to: filters.to ?? undefined,
      minAmount: filters.minAmount ?? undefined,
      maxAmount: filters.maxAmount ?? undefined,
      cardId: filters.cardId ?? undefined,
      sort: filters.sort,
      order: filters.order,
    }),
    [deferredQ, filters],
  );

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage, isPlaceholderData } =
    useTransactions(apiFilters);

  const items = useMemo(() => data?.pages.flatMap((page) => page.items) ?? [], [data]);
  const first = data?.pages[0];
  const summary = first?.summary;
  const total = first?.total ?? 0;

  const sentinel = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = sentinel.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && hasNextPage && !isFetchingNextPage) void fetchNextPage();
      },
      { rootMargin: '400px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

  const toggleSort = (sort: 'date' | 'amount' | 'counterparty') => {
    void setFilters({
      sort,
      order: filters.sort === sort && filters.order === 'desc' ? 'asc' : 'desc',
    });
  };

  const hasFilters =
    Boolean(filters.q) ||
    filters.accountId.length > 0 ||
    filters.category.length > 0 ||
    filters.rail.length > 0 ||
    filters.status.length > 0 ||
    filters.direction !== 'all' ||
    filters.from !== null ||
    filters.to !== null ||
    filters.minAmount !== null ||
    filters.maxAmount !== null ||
    filters.cardId !== null;

  const clearAll = () => void setFilters(null);
  const groups = filters.sort === 'date' ? groupByDay(items) : null;

  return (
    <Reveal>
      <RevealItem>
        <PageHeader
          title="Transactions"
          description="Every movement across every account, in one ledger."
          actions={
            <Button asChild>
              <a
                href={`/api/transactions/export${toQuery({ ...apiFilters })}`}
                download="transactions.csv"
              >
                <Download />
                Export CSV
              </a>
            </Button>
          }
        />
      </RevealItem>

      <RevealItem className="mb-3">
        <div className="relative mb-2">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
          <input
            aria-label="Search transactions"
            placeholder="Search by name, memo, reference or tag"
            value={filters.q}
            onChange={(event) => void setFilters({ q: event.target.value })}
            className={cn(inputClasses, 'pl-9')}
          />
        </div>
        <div className="no-scrollbar -mx-1 flex items-center gap-2 overflow-x-auto px-1 py-0.5">
          <Segmented
            aria-label="Direction"
            value={filters.direction}
            onValueChange={(direction) => void setFilters({ direction })}
            options={[
              { value: 'all', label: 'All' },
              { value: 'in', label: 'Money in' },
              { value: 'out', label: 'Money out' },
            ]}
          />
          <DateFilter
            from={filters.from}
            to={filters.to}
            onChange={(range) => void setFilters(range)}
          />
          {accounts && (
            <MultiFilter
              label="Account"
              selected={filters.accountId}
              onChange={(accountId) => void setFilters({ accountId })}
              options={accounts.map((account) => ({ value: account.id, label: account.name }))}
            />
          )}
          <MultiFilter
            label="Category"
            selected={filters.category}
            onChange={(category) => void setFilters({ category })}
            options={CATEGORY_IDS.map((id) => ({ value: id, label: CATEGORIES[id].label }))}
          />
          <MultiFilter
            label="Method"
            selected={filters.rail}
            onChange={(rail) => void setFilters({ rail })}
            options={RAILS.map((rail) => ({ value: rail, label: RAIL_LABELS[rail] }))}
          />
          <MultiFilter
            label="Status"
            selected={filters.status}
            onChange={(status) => void setFilters({ status })}
            options={TRANSACTION_STATUSES.map((status) => ({
              value: status,
              label: TRANSACTION_STATUS_LABEL[status],
            }))}
          />
          <AmountFilter
            min={filters.minAmount}
            max={filters.maxAmount}
            onChange={({ min, max }) => void setFilters({ minAmount: min, maxAmount: max })}
          />
          {hasFilters && <ClearFilters onClear={clearAll} />}
        </div>
      </RevealItem>

      <RevealItem>
        <Panel className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-line bg-surface-2/50 px-5 py-2.5 text-[13px]">
            <span className="font-bold text-ink">
              {total.toLocaleString('en-US')} {total === 1 ? 'transaction' : 'transactions'}
            </span>
            {summary && (
              <>
                <span className="text-ink-3">
                  In <Amount cents={summary.inflow} className="font-semibold text-ink" />
                </span>
                <span className="text-ink-3">
                  Out <Amount cents={summary.outflow} className="font-semibold text-ink" />
                </span>
                <span className="text-ink-3">
                  Net <Amount cents={summary.net} className="font-semibold text-ink" />
                </span>
              </>
            )}
          </div>

          <div className="hidden grid-cols-[minmax(0,2.2fr)_minmax(0,1.2fr)_minmax(0,0.9fr)_72px_132px] items-center gap-3 border-b border-line px-5 py-2 md:grid">
            <SortHeader
              label="Counterparty"
              active={filters.sort === 'counterparty'}
              order={filters.order}
              onClick={() => toggleSort('counterparty')}
            />
            <span className="eyebrow">Category</span>
            <span className="eyebrow">Account</span>
            <SortHeader
              label="Date"
              active={filters.sort === 'date'}
              order={filters.order}
              onClick={() => toggleSort('date')}
            />
            <SortHeader
              label="Amount"
              active={filters.sort === 'amount'}
              order={filters.order}
              onClick={() => toggleSort('amount')}
              className="justify-self-end"
            />
          </div>

          <div
            className="transition-opacity duration-150"
            style={{ opacity: isPlaceholderData ? 0.55 : 1 }}
          >
            {!data ? (
              <RowsSkeleton rows={10} />
            ) : items.length === 0 ? (
              <EmptyState
                title="No transactions match"
                description="Try widening the date range or removing a filter."
                action={hasFilters ? <Button onClick={clearAll}>Clear filters</Button> : undefined}
              />
            ) : groups ? (
              groups.map((group) => (
                <section key={group.day}>
                  <h3 className="sticky top-[60px] z-10 border-b border-line bg-surface/95 px-5 py-1.5 text-[12px] font-bold text-ink-2 backdrop-blur-sm">
                    {dayHeading(group.items[0]?.date ?? group.day)}
                  </h3>
                  <ul className="divide-y divide-line">
                    {group.items.map((transaction) => (
                      <li key={transaction.id}>
                        <TransactionRow
                          transaction={transaction}
                          selected={transaction.id === selectedId}
                          onOpen={(id) => void setSelectedId(id)}
                        />
                      </li>
                    ))}
                  </ul>
                </section>
              ))
            ) : (
              <ul className="divide-y divide-line">
                {items.map((transaction) => (
                  <li key={transaction.id}>
                    <TransactionRow
                      transaction={transaction}
                      selected={transaction.id === selectedId}
                      onOpen={(id) => void setSelectedId(id)}
                    />
                  </li>
                ))}
              </ul>
            )}
            <div ref={sentinel} className="h-px" />
            {isFetchingNextPage && <RowsSkeleton rows={3} />}
          </div>
        </Panel>
      </RevealItem>

      <Sheet
        open={Boolean(selectedId)}
        onOpenChange={(open) => !open && void setSelectedId(null)}
        title="Transaction details"
      >
        {selectedId && <TransactionDetail id={selectedId} />}
      </Sheet>
    </Reveal>
  );
}
