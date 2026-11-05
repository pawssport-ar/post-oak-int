import type { Payment } from '@post-oak/contracts';
import { ColumnMark } from '@/components/brand/logo';
import { cn } from '@/lib/cn';
import { longDate, money } from '@/lib/format';
import { RAIL_TITLES } from './labels';

interface TombstoneProps {
  payment: Payment;
  companyName: string;
  className?: string;
}

/**
 * Investment banks mark a closed deal with a framed "tombstone" notice. Here every
 * payment gets the same ceremony, set the way Post Oak presents its own transactions.
 */
export function Tombstone({ payment, companyName, className }: TombstoneProps) {
  const verb =
    payment.status === 'pending_approval'
      ? 'has instructed'
      : payment.status === 'scheduled'
        ? 'has scheduled'
        : 'has remitted';

  return (
    <figure
      className={cn(
        'relative mx-auto w-full max-w-[320px] border border-oak-800/70 p-1 dark:border-oak-200/40',
        className,
      )}
    >
      <div className="border border-oak-800/25 px-6 py-6 text-center dark:border-oak-200/20">
        <ColumnMark className="mx-auto h-8 w-auto text-oak-800 dark:text-oak-200" />
        <p className="mt-3 font-display text-[17px] tracking-[0.06em] text-ink uppercase">
          {companyName}
        </p>
        <p className="mt-1 font-display text-[14px] text-ink-3 italic">{verb}</p>
        <p className="numeric mt-2 font-display text-[32px] leading-none text-ink">
          {money(payment.amount)}
        </p>
        <p className="mt-2 font-display text-[14px] text-ink-3 italic">to</p>
        <p className="mt-1 font-display text-[18px] leading-snug text-ink">
          {payment.destination.name}
        </p>
        <div className="mx-auto my-3 h-px w-10 bg-oak-800/30 dark:bg-oak-200/30" />
        <p className="text-[11px] font-bold tracking-[0.12em] text-ink-2 uppercase">
          {RAIL_TITLES[payment.rail]}
        </p>
        <p className="mt-1 text-[12px] text-ink-3">{longDate(payment.createdAt)}</p>
        <p className="numeric mt-0.5 text-[11px] tracking-wider text-ink-3">{payment.reference}</p>
      </div>
    </figure>
  );
}
