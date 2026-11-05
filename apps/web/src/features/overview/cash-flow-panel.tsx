'use client';

import { CATEGORIES, type SpendingPeriod } from '@post-oak/contracts';
import { useState } from 'react';
import { CashFlowChart } from '@/components/charts/cash-flow-chart';
import { Legend } from '@/components/charts/chart-tooltip';
import { RankedBars } from '@/components/charts/ranked-bars';
import { Segmented } from '@/components/ui/controls';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { useCashFlow, useSpending } from '@/lib/api/queries';
import { moneyCompact, percent } from '@/lib/format';

export function CashFlowPanel() {
  const { data } = useCashFlow();
  return (
    <Panel className="h-full">
      <PanelHeader
        title="Cash flow"
        description="Money in and out over twelve months, excluding internal transfers"
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
      </div>
    </Panel>
  );
}

const PERIODS: { value: SpendingPeriod; label: string }[] = [
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'ytd', label: 'YTD' },
];

export function SpendingPanel() {
  const [period, setPeriod] = useState<SpendingPeriod>('30d');
  const { data, isPlaceholderData } = useSpending(period);

  return (
    <Panel className="h-full">
      <PanelHeader
        title="Where it goes"
        description={data ? `${moneyCompact(data.total)} in total` : ' '}
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
        className="px-5 pb-5 transition-opacity"
        style={{ opacity: isPlaceholderData ? 0.55 : 1 }}
      >
        {data ? (
          <RankedBars
            items={data.categories.slice(0, 6).map((category) => ({
              key: category.category,
              label: CATEGORIES[category.category].label,
              value: category.amount,
              valueLabel: moneyCompact(category.amount),
              meta: percent(category.share, 0),
            }))}
          />
        ) : (
          <Skeleton className="h-[240px] w-full" />
        )}
      </div>
    </Panel>
  );
}
