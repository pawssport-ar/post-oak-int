'use client';

import {
  CATEGORIES,
  type CategoryId,
  type ForecastQuery,
  type SpendingPeriod,
} from '@post-oak/contracts';
import { format, parseISO } from 'date-fns';
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from 'lucide-react';
import Link from 'next/link';
import { useDeferredValue, useState } from 'react';
import { CashFlowChart } from '@/components/charts/cash-flow-chart';
import { Legend } from '@/components/charts/chart-tooltip';
import { ForecastChart } from '@/components/charts/forecast-chart';
import { RankedBars } from '@/components/charts/ranked-bars';
import { Amount } from '@/components/ui/amount';
import { Button } from '@/components/ui/button';
import { Segmented, Slider } from '@/components/ui/controls';
import { Monogram } from '@/components/ui/monogram';
import { PageHeader, Panel, PanelHeader } from '@/components/ui/panel';
import { Reveal, RevealItem } from '@/components/ui/reveal';
import { Skeleton } from '@/components/ui/skeleton';
import { useCashFlow, useForecast, useSpending } from '@/lib/api/queries';
import { cn } from '@/lib/cn';
import { money, moneyCompact, moneyWhole, percent, signedPercent } from '@/lib/format';

interface Scenario {
  horizon: number;
  revenuePct: number;
  expensePct: number;
  collectionDelayDays: number;
  oneTimeOutflow: number;
}

const BASE_SCENARIO: Scenario = {
  horizon: 90,
  revenuePct: 0,
  expensePct: 0,
  collectionDelayDays: 0,
  oneTimeOutflow: 0,
};

function Lever({
  label,
  value,
  children,
}: {
  label: string;
  value: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold text-ink-2">{label}</span>
        <span className="numeric text-[13px] font-bold text-ink">{value}</span>
      </div>
      {children}
    </div>
  );
}

/** A what-if engine: drag a lever and the server re-projects daily cash. */
function ForecastPanel() {
  const [scenario, setScenario] = useState<Scenario>(BASE_SCENARIO);
  const deferred = useDeferredValue(scenario);
  const query: Partial<ForecastQuery> = deferred;
  const { data: forecast, isPlaceholderData } = useForecast(query);

  const patch = (next: Partial<Scenario>) => setScenario((current) => ({ ...current, ...next }));
  const changed = JSON.stringify(scenario) !== JSON.stringify(BASE_SCENARIO);

  return (
    <Panel>
      <PanelHeader
        title="Cash forecast"
        description="Run-rate projection plus the calendar of payroll, rent, leases and taxes"
        action={
          <Segmented
            aria-label="Forecast horizon"
            value={String(scenario.horizon)}
            onValueChange={(value) => patch({ horizon: Number(value) })}
            options={[
              { value: '30', label: '30D' },
              { value: '90', label: '90D' },
              { value: '180', label: '180D' },
            ]}
          />
        }
      />
      <div className="grid gap-x-6 px-5 pb-5 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="min-w-0">
          {forecast ? (
            <>
              <div className="mb-3 grid grid-cols-3 gap-3">
                <div>
                  <p className="eyebrow">Projected cash</p>
                  <p className="mt-1 font-display text-[26px] leading-none text-ink">
                    {moneyCompact(forecast.end)}
                  </p>
                </div>
                <div>
                  <p className="eyebrow">Lowest point</p>
                  <p className="mt-1 font-display text-[26px] leading-none text-ink">
                    {moneyCompact(forecast.lowest.amount)}
                  </p>
                  <p className="mt-1 text-[12px] text-ink-3">
                    {format(parseISO(forecast.lowest.date), 'MMM d')}
                  </p>
                </div>
                <div>
                  <p className="eyebrow">Floor check</p>
                  <p
                    className={cn(
                      'mt-1.5 flex items-center gap-1.5 text-[14px] font-bold',
                      forecast.breachesFloor ? 'text-negative' : 'text-positive',
                    )}
                  >
                    {forecast.breachesFloor ? (
                      <ShieldAlert className="size-4" />
                    ) : (
                      <ShieldCheck className="size-4" />
                    )}
                    {forecast.breachesFloor ? 'Breached' : 'Clear'}
                  </p>
                </div>
              </div>
              <div
                className="transition-opacity duration-150"
                style={{ opacity: isPlaceholderData ? 0.6 : 1 }}
              >
                <ForecastChart forecast={forecast} />
              </div>
              <Legend
                items={[
                  { label: 'Expected cash', color: 'var(--chart-1)', line: true },
                  {
                    label: 'Likely range',
                    color: 'color-mix(in srgb, var(--chart-1) 18%, transparent)',
                  },
                  { label: 'Tax dates and one-offs', color: 'var(--chart-2)' },
                ]}
              />
            </>
          ) : (
            <Skeleton className="h-[390px] w-full" />
          )}
        </div>

        <div className="mt-5 space-y-5 border-line lg:mt-0 lg:border-l lg:pl-6">
          <div className="flex items-center justify-between">
            <p className="eyebrow">What if</p>
            {changed && (
              <Button size="sm" variant="ghost" onClick={() => setScenario(BASE_SCENARIO)}>
                <RotateCcw />
                Reset
              </Button>
            )}
          </div>
          <Lever label="Revenue" value={signedPercent(scenario.revenuePct / 100, 0)}>
            <Slider
              aria-label="Revenue change"
              min={-40}
              max={40}
              step={5}
              value={scenario.revenuePct}
              onValueChange={(revenuePct) => patch({ revenuePct })}
            />
          </Lever>
          <Lever label="Operating costs" value={signedPercent(scenario.expensePct / 100, 0)}>
            <Slider
              aria-label="Operating cost change"
              min={-30}
              max={30}
              step={5}
              value={scenario.expensePct}
              onValueChange={(expensePct) => patch({ expensePct })}
            />
          </Lever>
          <Lever
            label="Collections slip"
            value={
              scenario.collectionDelayDays === 0
                ? 'On time'
                : `${scenario.collectionDelayDays} days`
            }
          >
            <Slider
              aria-label="Collection delay in days"
              min={0}
              max={30}
              step={5}
              value={scenario.collectionDelayDays}
              onValueChange={(collectionDelayDays) => patch({ collectionDelayDays })}
            />
          </Lever>
          <Lever label="One-time outflow" value={moneyWhole(scenario.oneTimeOutflow)}>
            <Slider
              aria-label="One-time outflow"
              min={0}
              max={500_000_000}
              step={25_000_000}
              value={scenario.oneTimeOutflow}
              onValueChange={(oneTimeOutflow) => patch({ oneTimeOutflow })}
            />
          </Lever>
          <p className="text-[12.5px] leading-snug text-ink-3">
            Try a $3M acquisition with collections slipping 15 days, and watch the floor check.
          </p>
        </div>
      </div>
    </Panel>
  );
}

const PERIODS: { value: SpendingPeriod; label: string }[] = [
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'ytd', label: 'YTD' },
];

function SpendingReport() {
  const [period, setPeriod] = useState<SpendingPeriod>('90d');
  const { data, isPlaceholderData } = useSpending(period);
  const change = data && data.previousTotal > 0 ? data.total / data.previousTotal - 1 : null;

  return (
    <Panel>
      <PanelHeader
        title="Spending"
        description={
          data
            ? `${money(data.total)}${change === null ? '' : `, ${signedPercent(change)} vs the prior period`}`
            : ' '
        }
        action={
          <Segmented
            aria-label="Spending period"
            value={period}
            onValueChange={setPeriod}
            options={PERIODS}
          />
        }
      />
      <div
        className="grid gap-6 px-5 pb-5 transition-opacity md:grid-cols-2"
        style={{ opacity: isPlaceholderData ? 0.6 : 1 }}
      >
        <div>
          <p className="eyebrow mb-2">By category</p>
          {data ? (
            <table className="w-full text-[13px]">
              <tbody>
                {data.categories.slice(0, 9).map((row) => (
                  <tr key={row.category} className="border-t border-line first:border-t-0">
                    <td className="py-1.5 pr-2">
                      <Link
                        href={`/transactions?category=${row.category}&direction=out`}
                        className="font-semibold text-ink hover:underline"
                      >
                        {CATEGORIES[row.category as CategoryId].label}
                      </Link>
                    </td>
                    <td className="numeric py-1.5 text-right text-ink-3">
                      {percent(row.share, 0)}
                    </td>
                    <td className="numeric w-20 py-1.5 text-right font-bold text-ink">
                      {moneyCompact(row.amount)}
                    </td>
                    <td className="w-16 py-1.5 text-right">
                      {row.changePct !== null && (
                        <span
                          className={cn(
                            'numeric inline-flex items-center gap-0.5 text-[12px] font-semibold',
                            row.changePct > 0 ? 'text-warning' : 'text-positive',
                          )}
                        >
                          {row.changePct > 0 ? (
                            <ArrowUpRight className="size-3" />
                          ) : (
                            <ArrowDownRight className="size-3" />
                          )}
                          {Math.abs(Math.round(row.changePct * 100))}%
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <Skeleton className="h-64 w-full" />
          )}
        </div>
        <div>
          <p className="eyebrow mb-2">Top vendors</p>
          {data ? (
            <RankedBars
              items={data.vendors.slice(0, 6).map((vendor) => ({
                key: vendor.name,
                label: (
                  <span className="flex items-center gap-2">
                    <Monogram name={vendor.name} size="sm" />
                    <span className="truncate">{vendor.name}</span>
                  </span>
                ),
                value: vendor.amount,
                valueLabel: moneyCompact(vendor.amount),
                meta: `${vendor.count}x`,
              }))}
            />
          ) : (
            <Skeleton className="h-64 w-full" />
          )}
        </div>
      </div>
    </Panel>
  );
}

function CashFlowReport() {
  const { data } = useCashFlow();
  const months = data?.filter((month) => !month.partial) ?? [];
  const net = months.reduce((sum, month) => sum + month.net, 0);
  const best = [...months].sort((a, b) => b.net - a.net)[0];

  return (
    <Panel>
      <PanelHeader
        title="Cash flow"
        description="Twelve months, excluding transfers between your own accounts"
        action={
          <Legend
            items={[
              { label: 'Money in', color: 'var(--chart-1)' },
              { label: 'Money out', color: 'var(--chart-2)' },
            ]}
          />
        }
      />
      <div className="px-5 pb-4">
        {data ? <CashFlowChart data={data} /> : <Skeleton className="h-[260px] w-full" />}
        {best && (
          <p className="mt-3 border-t border-line pt-3 text-[13px] text-ink-2">
            Net <Amount cents={net} className="font-bold text-ink" /> over the last {months.length}{' '}
            full months. {best.label} was the strongest at{' '}
            <span className="numeric font-bold text-ink">{moneyCompact(best.net)}</span>.
          </p>
        )}
      </div>
    </Panel>
  );
}

export function InsightsView() {
  return (
    <Reveal className="space-y-4">
      <RevealItem>
        <PageHeader
          title="Insights"
          description="Reporting that reads like a treasury memo, built on the live ledger."
          actions={
            <Button asChild>
              <a href="/api/transactions/export" download="transactions.csv">
                <Download />
                Export ledger
              </a>
            </Button>
          }
        />
      </RevealItem>
      <RevealItem>
        <ForecastPanel />
      </RevealItem>
      <RevealItem>
        <CashFlowReport />
      </RevealItem>
      <RevealItem>
        <SpendingReport />
      </RevealItem>
    </Reveal>
  );
}
