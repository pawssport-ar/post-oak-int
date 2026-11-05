'use client';

import { ArrowDownLeft, ArrowUpRight, Hourglass, Scale } from 'lucide-react';
import type { ReactNode } from 'react';
import { Amount } from '@/components/ui/amount';
import { Tooltip } from '@/components/ui/controls';
import { Panel } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { useOverview } from '@/lib/api/queries';
import { cn } from '@/lib/cn';
import { signedPercent } from '@/lib/format';

interface TileProps {
  label: string;
  icon: ReactNode;
  value: ReactNode;
  footer: ReactNode;
}

function Tile({ label, icon, value, footer }: TileProps) {
  return (
    <Panel className="h-full px-3.5 py-3.5 sm:px-4.5 sm:py-4">
      <div className="flex items-center justify-between gap-2">
        <p className="eyebrow">{label}</p>
        <span className="text-ink-3 [&_svg]:size-4">{icon}</span>
      </div>
      <div className="mt-2 font-display text-[23px] leading-none text-ink sm:text-[28px]">
        {value}
      </div>
      <p className="mt-2 text-[12.5px] text-ink-3">{footer}</p>
    </Panel>
  );
}

function Delta({
  current,
  previous,
  upIsGood,
}: {
  current: number;
  previous: number;
  upIsGood: boolean;
}) {
  if (previous === 0) return null;
  const change = (current - previous) / previous;
  const good = change >= 0 === upIsGood;
  return (
    <span className={cn('numeric font-bold', good ? 'text-positive' : 'text-negative')}>
      {signedPercent(change)}
    </span>
  );
}

export function StatTiles() {
  const { data } = useOverview();

  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Panel key={index} className="space-y-3 px-4.5 py-4">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-3 w-24" />
          </Panel>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      <Tile
        label="Money in"
        icon={<ArrowDownLeft />}
        value={<Amount cents={data.moneyIn30d} />}
        footer={
          <>
            <Delta current={data.moneyIn30d} previous={data.moneyInPrev30d} upIsGood /> vs prior 30
            days
          </>
        }
      />
      <Tile
        label="Money out"
        icon={<ArrowUpRight />}
        value={<Amount cents={data.moneyOut30d} />}
        footer={
          <>
            <Delta current={data.moneyOut30d} previous={data.moneyOutPrev30d} upIsGood={false} /> vs
            prior 30 days
          </>
        }
      />
      <Tile
        label="Net cash flow"
        icon={<Scale />}
        value={<Amount cents={data.net30d} />}
        footer="Last 30 days, excluding internal transfers"
      />
      <Tooltip content="Total cash divided by average daily outflows over the last 90 days.">
        <div>
          <Tile
            label="Days cash on hand"
            icon={<Hourglass />}
            value={<span className="numeric">{data.daysCashOnHand}</span>}
            footer="Treasury target: 90 days"
          />
        </div>
      </Tooltip>
    </div>
  );
}
