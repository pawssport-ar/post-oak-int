'use client';

import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { Portico } from '@/components/charts/portico';
import { Panel } from '@/components/ui/panel';
import { Skeleton } from '@/components/ui/skeleton';
import { useCapital } from '@/lib/api/queries';

/** The Post Oak difference: everyday banking data, read the way an investment bank would. */
export function CapitalTeaser() {
  const { data } = useCapital();

  return (
    <Panel className="flex h-full flex-col px-5 pt-4.5 pb-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow">Capital readiness</p>
          <p className="mt-1 font-display text-[21px] leading-tight text-ink">
            {data ? data.band : ' '}
          </p>
        </div>
        <div className="text-right">
          {data ? (
            <p className="font-display text-[34px] leading-none text-ink">
              {data.score}
              <span className="text-[15px] text-ink-3"> /100</span>
            </p>
          ) : (
            <Skeleton className="h-8 w-16" />
          )}
        </div>
      </div>

      <div className="my-3 flex-1">
        {data ? (
          <Portico pillars={data.pillars} className="mx-auto max-h-[150px]" />
        ) : (
          <Skeleton className="h-[140px] w-full" />
        )}
      </div>

      <Link
        href="/capital"
        className="group flex items-center justify-between gap-3 border-t border-line pt-3 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink"
      >
        <span className="min-w-0 truncate">
          {data ? `Reviewed by ${data.advisor.name}, your Post Oak advisor` : ' '}
        </span>
        <ArrowUpRight className="size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
      </Link>
    </Panel>
  );
}
