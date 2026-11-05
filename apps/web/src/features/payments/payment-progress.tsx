'use client';

import type { Payment, PaymentStatus } from '@post-oak/contracts';
import { Check } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';

const STAGES: { label: string; reachedBy: PaymentStatus[] }[] = [
  { label: 'Created', reachedBy: [] },
  { label: 'Approved', reachedBy: ['scheduled', 'processing', 'in_transit', 'settled'] },
  { label: 'Sent', reachedBy: ['processing', 'in_transit', 'settled'] },
  { label: 'In transit', reachedBy: ['in_transit', 'settled'] },
  { label: 'Settled', reachedBy: ['settled'] },
];

/** The lifecycle as a single bar, driven by provider events arriving over the stream. */
export function PaymentProgress({ payment }: { payment: Payment }) {
  const stages =
    payment.requiredApprovals > 0 ? STAGES : STAGES.filter((s) => s.label !== 'Approved');
  const reached = stages.filter(
    (stage, index) => index === 0 || stage.reachedBy.includes(payment.status),
  ).length;
  const progress = stages.length > 1 ? (reached - 1) / (stages.length - 1) : 0;

  return (
    <div className="relative">
      <div className="absolute top-[11px] right-[11%] left-[11%] h-0.5 bg-surface-3">
        <motion.div
          className="h-full origin-left bg-positive"
          initial={false}
          animate={{ scaleX: progress }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <ol className="relative flex justify-between">
        {stages.map((stage, index) => {
          const done = index < reached;
          const current = index === reached - 1 && payment.status !== 'settled';
          return (
            <li key={stage.label} className="flex flex-1 flex-col items-center gap-1.5">
              <motion.span
                initial={false}
                animate={{ scale: done ? 1 : 0.9 }}
                className={cn(
                  'flex size-6 items-center justify-center rounded-full border-2 transition-colors duration-300',
                  done
                    ? 'border-positive bg-positive text-white dark:text-oak-950'
                    : 'border-line-strong bg-surface text-transparent',
                  current && 'ring-4 ring-positive/15',
                )}
              >
                <Check className="size-3.5" strokeWidth={3} />
              </motion.span>
              <span
                className={cn(
                  'text-[11.5px] font-semibold transition-colors',
                  done ? 'text-ink' : 'text-ink-3',
                )}
              >
                {stage.label}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
