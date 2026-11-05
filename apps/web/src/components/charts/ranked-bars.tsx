'use client';

import { motion, useReducedMotion } from 'motion/react';
import type { ReactNode } from 'react';

export interface RankedBar {
  key: string;
  label: ReactNode;
  value: number;
  valueLabel: ReactNode;
  meta?: ReactNode;
  href?: string;
}

/** Nominal categories in one hue: length carries the value, so color stays free. */
export function RankedBars({ items }: { items: RankedBar[] }) {
  const reduced = useReducedMotion();
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className="space-y-3">
      {items.map((item, index) => (
        <li key={item.key}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="truncate font-semibold text-ink">{item.label}</span>
            <span className="flex shrink-0 items-baseline gap-2">
              {item.meta && <span className="text-[12px] text-ink-3">{item.meta}</span>}
              <span className="numeric font-bold text-ink">{item.valueLabel}</span>
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-2">
            <motion.div
              className="h-full origin-left rounded-full bg-[var(--chart-1)]"
              style={{ width: `${(item.value / max) * 100}%` }}
              initial={{ scaleX: reduced ? 1 : 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.7, delay: index * 0.04, ease: [0.22, 1, 0.36, 1] }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
