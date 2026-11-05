import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export type Tone = 'neutral' | 'positive' | 'negative' | 'warning' | 'info' | 'accent';

const TONES: Record<Tone, { pill: string; dot: string }> = {
  neutral: { pill: 'bg-surface-2 text-ink-2', dot: 'bg-ink-3' },
  positive: { pill: 'bg-positive-soft text-positive', dot: 'bg-positive' },
  negative: { pill: 'bg-negative-soft text-negative', dot: 'bg-negative' },
  warning: { pill: 'bg-warning-soft text-warning', dot: 'bg-warning' },
  info: { pill: 'bg-info-soft text-info', dot: 'bg-info' },
  accent: { pill: 'bg-accent-soft text-accent-soft-ink', dot: 'bg-accent-soft-ink' },
};

interface StatusPillProps {
  tone?: Tone;
  dot?: boolean;
  pulse?: boolean;
  className?: string;
  children: ReactNode;
}

export function StatusPill({
  tone = 'neutral',
  dot = true,
  pulse = false,
  className,
  children,
}: StatusPillProps) {
  const styles = TONES[tone];
  return (
    <span
      className={cn(
        'inline-flex h-[22px] items-center gap-1.5 rounded-full px-2 text-[11.5px] font-semibold whitespace-nowrap',
        styles.pill,
        className,
      )}
    >
      {dot && (
        <span
          className={cn('size-1.5 rounded-full', styles.dot, pulse && 'animate-pulse')}
          aria-hidden
        />
      )}
      {children}
    </span>
  );
}
