'use client';

import type { Account, BalancePoint, BalanceRange } from '@post-oak/contracts';
import { format, parseISO } from 'date-fns';
import { ArrowRight, TrendingDown, TrendingUp } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { BalanceChart } from '@/components/charts/balance-chart';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Segmented } from '@/components/ui/controls';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccounts, useBalanceHistory, useOverview } from '@/lib/api/queries';
import { cn } from '@/lib/cn';
import { money, moneyWhole, signedPercent } from '@/lib/format';

const RANGES: { value: BalanceRange; label: string }[] = [
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: '1y', label: '1Y' },
];

const RANGE_COPY: Record<BalanceRange, string> = {
  '30d': 'in the last 30 days',
  '90d': 'in the last 90 days',
  '1y': 'in the last year',
};

function splitFigure(cents: number): [string, string] {
  const formatted = money(cents);
  const dot = formatted.lastIndexOf('.');
  return [formatted.slice(0, dot), formatted.slice(dot)];
}

function HeroFigure({ value, instant }: { value: number; instant: boolean }) {
  return (
    <p aria-label={money(value)} className="display-figure numeric leading-none whitespace-nowrap">
      <AnimatedNumber
        value={value}
        instant={instant}
        animateFrom={value * 0.965}
        duration={1.4}
        format={(current) => splitFigure(Math.round(current))[0]}
        className="text-[46px] sm:text-[64px]"
      />
      <AnimatedNumber
        value={value}
        instant={instant}
        animateFrom={value * 0.965}
        duration={1.4}
        format={(current) => splitFigure(Math.round(current))[1]}
        className="ml-0.5 align-[0.62em] text-[20px] text-white/60 sm:text-[26px]"
      />
    </p>
  );
}

/** The first thing anyone sees: total cash, its history, and where it sits. */
export function HeroPanel() {
  const [range, setRange] = useState<BalanceRange>('90d');
  const [scrubbed, setScrubbed] = useState<BalancePoint | null>(null);
  const { data: overview } = useOverview();
  const { data: history } = useBalanceHistory(range);
  const { data: accounts } = useAccounts();

  const first = history?.[0];
  const reference = scrubbed?.balance ?? overview?.totalCash ?? 0;
  const change = first ? reference - first.balance : 0;
  const changePct = first && first.balance !== 0 ? change / first.balance : 0;
  const up = change >= 0;

  return (
    <section className="relative isolate overflow-hidden rounded-2xl bg-oak-800 text-white shadow-card dark:bg-[#12291d]">
      <div
        aria-hidden
        className="flutes absolute inset-0 -z-10 [mask-image:linear-gradient(100deg,transparent_12%,black_75%)]"
      />
      <div
        aria-hidden
        className="absolute -top-40 -left-24 -z-10 size-[420px] rounded-full bg-oak-500/25 blur-[90px]"
      />

      <div className="grid lg:grid-cols-[minmax(0,1fr)_336px]">
        <div className="min-w-0 px-5 pt-5 pb-3 sm:px-7 sm:pt-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[12px] font-bold tracking-[0.1em] text-white/60 uppercase">
              {scrubbed ? format(parseISO(scrubbed.date), 'EEEE, MMMM d, yyyy') : 'Total cash'}
            </p>
            <Segmented
              aria-label="Balance range"
              tone="on-dark"
              value={range}
              onValueChange={setRange}
              options={RANGES}
            />
          </div>

          <div className="mt-2.5 min-h-[62px]">
            {overview ? (
              <HeroFigure value={reference} instant={scrubbed !== null} />
            ) : (
              <Skeleton className="h-14 w-80 opacity-15" />
            )}
          </div>

          <p className="mt-2 flex items-center gap-1.5 text-[13.5px] text-white/70">
            {up ? (
              <TrendingUp className="size-4 text-brass-300" />
            ) : (
              <TrendingDown className="size-4 text-brass-300" />
            )}
            <span className="numeric font-bold text-white">
              {money(change, { signed: true })} ({signedPercent(changePct)})
            </span>
            <span>{scrubbed ? 'since the start of this range' : RANGE_COPY[range]}</span>
          </p>

          <div className="mt-3">
            {history ? (
              <BalanceChart
                data={history}
                height={232}
                onScrub={setScrubbed}
                label="Total cash over time. Use the arrow keys to move through the dates."
              />
            ) : (
              <div className="h-[232px]" />
            )}
          </div>
        </div>

        <div className="border-t border-white/10 lg:border-t-0 lg:border-l">
          <AccountsColumn accounts={accounts} total={overview?.totalCash ?? 0} />
        </div>
      </div>
    </section>
  );
}

function AccountsColumn({ accounts, total }: { accounts: Account[] | undefined; total: number }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pt-5 pb-3">
        <p className="text-[12px] font-bold tracking-[0.1em] text-white/60 uppercase">
          Where it sits
        </p>
        <Link
          href="/accounts"
          className="group flex items-center gap-1 text-[12.5px] font-semibold text-white/70 transition-colors hover:text-white"
        >
          Accounts
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      {accounts && total > 0 && (
        <div
          className="mx-5 mb-2 flex h-2 gap-0.5"
          role="img"
          aria-label={accounts
            .map((account) => `${account.name}: ${money(account.balance)}`)
            .join(', ')}
        >
          {accounts.map((account, index) => (
            <span
              key={account.id}
              className={cn(
                'h-full rounded-[2px]',
                ['bg-brass-300', 'bg-white/70', 'bg-oak-300', 'bg-white/30'][index],
              )}
              style={{ width: `${(account.balance / total) * 100}%` }}
            />
          ))}
        </div>
      )}

      <ul className="flex-1">
        {accounts
          ? accounts.map((account, index) => (
              <li key={account.id}>
                <Link
                  href={`/accounts?account=${account.id}`}
                  className="group flex items-center gap-3 border-t border-white/8 px-5 py-3 transition-colors first:border-t-0 hover:bg-white/5"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'size-2 shrink-0 rounded-[2px]',
                      ['bg-brass-300', 'bg-white/70', 'bg-oak-300', 'bg-white/30'][index],
                    )}
                  />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[13.5px] font-bold">{account.name}</span>
                    <span className="block truncate text-[12px] text-white/55">
                      ••{account.last4}
                      {account.apyBps ? ` · ${(account.apyBps / 100).toFixed(2)}% APY` : ''}
                    </span>
                  </span>
                  <span className="numeric text-right font-display text-[19px] leading-none">
                    {moneyWhole(account.balance)}
                  </span>
                </Link>
              </li>
            ))
          : Array.from({ length: 4 }, (_, index) => (
              <li key={index} className="px-5 py-4">
                <Skeleton className="h-8 w-full opacity-15" />
              </li>
            ))}
      </ul>
    </div>
  );
}
