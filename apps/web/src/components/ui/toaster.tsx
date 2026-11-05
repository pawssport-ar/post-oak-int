'use client';

import type { NotificationTone } from '@post-oak/contracts';
import { ArrowUpRight, Bell, CircleAlert, CircleCheck } from 'lucide-react';
import Link from 'next/link';
import { Toaster as Sonner, toast as sonner } from 'sonner';
import { cn } from '@/lib/cn';

interface ToastInput {
  title: string;
  description?: string;
  tone?: NotificationTone | 'error';
  href?: string;
}

const ICONS = {
  neutral: { Icon: Bell, classes: 'bg-surface-2 text-ink-2' },
  positive: { Icon: CircleCheck, classes: 'bg-positive-soft text-positive' },
  attention: { Icon: CircleAlert, classes: 'bg-warning-soft text-warning' },
  error: { Icon: CircleAlert, classes: 'bg-negative-soft text-negative' },
};

export function toast({ title, description, tone = 'neutral', href }: ToastInput): void {
  const { Icon, classes } = ICONS[tone];
  sonner.custom(
    (id) => (
      <div className="flex w-[356px] max-w-[calc(100vw-32px)] items-start gap-3 rounded-xl border border-line bg-surface p-3.5 shadow-pop">
        <span
          className={cn(
            'mt-px flex size-8 shrink-0 items-center justify-center rounded-lg',
            classes,
          )}
        >
          <Icon className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-bold text-ink">{title}</p>
          {description && <p className="mt-0.5 text-[13px] text-ink-2">{description}</p>}
        </div>
        {href && (
          <Link
            href={href}
            onClick={() => sonner.dismiss(id)}
            aria-label="Open"
            className="mt-px flex size-7 shrink-0 items-center justify-center rounded-md text-ink-3 transition hover:bg-surface-2 hover:text-ink"
          >
            <ArrowUpRight className="size-4" />
          </Link>
        )}
      </div>
    ),
    { duration: 6000 },
  );
}

export function toastError(error: unknown): void {
  toast({
    title: 'That did not go through',
    description: error instanceof Error ? error.message : 'Please try again.',
    tone: 'error',
  });
}

export function Toaster() {
  return <Sonner position="bottom-right" gap={10} visibleToasts={3} />;
}
