import type { Cents } from '@post-oak/contracts';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';

interface AmountProps {
  cents: Cents;
  /** Prefix credits with a plus sign and color them. Debits stay neutral on purpose. */
  signed?: boolean;
  className?: string;
  centsClassName?: string;
}

/** A money figure with quiet cents, so the eye lands on the dollars. */
export function Amount({ cents, signed = false, className, centsClassName }: AmountProps) {
  const formatted = money(cents, { signed });
  const dot = formatted.lastIndexOf('.');
  return (
    <span
      className={cn('numeric whitespace-nowrap', signed && cents > 0 && 'text-positive', className)}
    >
      {formatted.slice(0, dot)}
      <span className={cn('opacity-55', centsClassName)}>{formatted.slice(dot)}</span>
    </span>
  );
}
