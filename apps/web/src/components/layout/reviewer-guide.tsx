'use client';

import { ArrowUpRight, Check } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ColumnMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Popover } from '@/components/ui/controls';
import { useAppActions } from './app-context';

const SEEN_KEY = 'po-guide-seen';

function hasSeenGuide(): boolean {
  try {
    return localStorage.getItem(SEEN_KEY) === '1';
  } catch {
    return true;
  }
}

function rememberGuide(): void {
  try {
    localStorage.setItem(SEEN_KEY, '1');
  } catch {
    // Private windows can refuse storage. The guide simply shows again next time.
  }
}

const LINKS = [
  { href: '/capital', label: 'See the five pillars of capital readiness' },
  { href: '/payments', label: 'Approve the waiting wires' },
  { href: '/cards', label: 'Freeze a card, then watch a swipe decline' },
  { href: '/insights', label: 'Stress-test cash in the forecast' },
];

/**
 * A short note for whoever is reviewing the case study, so the parts worth seeing are
 * found in a five-minute visit. It opens once, then lives behind the demo badge.
 */
export function ReviewerGuide() {
  const { openSendMoney, setPaletteOpen } = useAppActions();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (hasSeenGuide()) return;
    const timer = setTimeout(() => setOpen(true), 2600);
    return () => clearTimeout(timer);
  }, []);

  const change = (next: boolean) => {
    setOpen(next);
    if (!next) rememberGuide();
  };

  return (
    <Popover
      open={open}
      onOpenChange={change}
      align="end"
      className="w-[340px] max-w-[calc(100vw-24px)]"
      trigger={
        <button
          type="button"
          className="mr-1 inline-flex h-7 shrink-0 items-center rounded-full bg-accent-soft px-2.5 text-[12px] font-bold text-accent-soft-ink transition hover:brightness-95"
        >
          <span className="md:hidden">Demo</span>
          <span className="hidden md:inline">Demo environment</span>
        </button>
      }
    >
      <div className="relative overflow-hidden rounded-t-xl bg-oak-800 px-4 py-3.5 text-white dark:bg-[#12291d]">
        <ColumnMark className="absolute -right-3 -bottom-8 h-28 w-auto opacity-10" />
        <p className="font-display text-[20px] leading-tight">A case study for Post Oak</p>
        <p className="mt-1 max-w-[260px] text-[12.5px] leading-snug text-white/70">
          Every account, person and transaction is fictional. Your session runs in a private
          sandbox, so go ahead and move money.
        </p>
      </div>
      <div className="p-2">
        <p className="eyebrow px-2 pt-1.5 pb-1">Five minutes, well spent</p>
        <button
          type="button"
          onClick={() => {
            change(false);
            openSendMoney();
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          <Check className="size-3.5 text-positive" />
          Send a wire over $25,000
        </button>
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            onClick={() => change(false)}
            className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-2"
          >
            <Check className="size-3.5 text-positive" />
            {link.label}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => {
            change(false);
            setPaletteOpen(true);
          }}
          className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface-2"
        >
          <Check className="size-3.5 text-positive" />
          Press Ctrl K and ask about your cash
        </button>
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
        <a
          href="/docs"
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-[12.5px] font-semibold text-ink-2 transition-colors hover:text-ink"
        >
          API reference
          <ArrowUpRight className="size-3.5" />
        </a>
        <Button size="sm" variant="primary" onClick={() => change(false)}>
          Got it
        </Button>
      </div>
    </Popover>
  );
}
