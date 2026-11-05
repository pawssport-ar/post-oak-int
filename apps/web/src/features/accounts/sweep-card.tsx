'use client';

import { ArrowRight, Sprout } from 'lucide-react';
import { useAppActions } from '@/components/layout/app-context';
import { Button } from '@/components/ui/button';
import { Panel } from '@/components/ui/panel';
import { useSweep } from '@/lib/api/queries';
import { moneyWhole } from '@/lib/format';
import { useCan } from '@/lib/use-permission';

/** Turns the ledger into advice: idle operating cash, and what it could be earning. */
export function SweepCard() {
  const can = useCan();
  const { openSendMoney } = useAppActions();
  const { data: sweep } = useSweep(can('insights:view'));
  if (!sweep) return null;

  return (
    <Panel className="flex flex-wrap items-center gap-x-4 gap-y-3 border-brass-400/50 bg-[color-mix(in_srgb,var(--brass-300)_12%,var(--surface))] px-5 py-4">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-brass-400 text-oak-950">
        <Sprout className="size-5" />
      </span>
      <div className="min-w-0 flex-1 basis-64">
        <p className="font-display text-[20px] leading-tight text-ink">
          {moneyWhole(sweep.amount)} in {sweep.fromAccountName} could be earning{' '}
          {moneyWhole(sweep.annualYield)} a year
        </p>
        <p className="mt-0.5 text-[13px] text-ink-2">
          {sweep.fromAccountName} would still hold {sweep.bufferDays} days of outflows.{' '}
          {sweep.toAccountName} pays {(sweep.apyBps / 100).toFixed(2)}% APY.
        </p>
      </div>
      {can('payments:create') && (
        <Button
          variant="primary"
          onClick={() =>
            openSendMoney({
              transfer: {
                fromAccountId: sweep.fromAccountId,
                toAccountId: sweep.toAccountId,
                amount: sweep.amount,
                memo: 'Treasury sweep',
              },
            })
          }
        >
          Move to {sweep.toAccountName}
          <ArrowRight />
        </Button>
      )}
    </Panel>
  );
}
