'use client';

import { Moon, Search, Send, Sun } from 'lucide-react';
import Link from 'next/link';
import { useTheme } from 'next-themes';
import { ColumnMark } from '@/components/brand/logo';
import { Button } from '@/components/ui/button';
import { Kbd, Tooltip } from '@/components/ui/controls';
import { cn } from '@/lib/cn';
import type { ConnectionState } from '@/lib/realtime';
import { useMounted } from '@/lib/use-mounted';
import { useCan } from '@/lib/use-permission';
import { useAppActions } from './app-context';
import { NotificationsBell } from './notifications';
import { ReviewerGuide } from './reviewer-guide';

const CONNECTION_COPY: Record<ConnectionState, string> = {
  connecting: 'Connecting to the live event stream',
  live: 'Live. Ledger, card and payment events stream in as they happen.',
  offline: 'Reconnecting to the live event stream',
};

export function TopBar({ connection }: { connection: ConnectionState }) {
  const { openSendMoney, setPaletteOpen } = useAppActions();
  const { resolvedTheme, setTheme } = useTheme();
  const can = useCan();
  const mounted = useMounted();

  return (
    <header className="sticky top-0 z-30 flex h-[60px] items-center gap-2 border-b border-line bg-canvas/85 px-4 backdrop-blur-md sm:px-6">
      <Link
        href="/"
        aria-label="Overview"
        className="mr-1 flex size-9 items-center justify-center rounded-lg bg-oak-800 text-white lg:hidden"
      >
        <ColumnMark className="h-6 w-auto" />
      </Link>

      <button
        type="button"
        onClick={() => setPaletteOpen(true)}
        className="flex h-9.5 min-w-0 flex-1 items-center gap-2.5 rounded-lg border border-line bg-surface px-3 text-left text-[13.5px] text-ink-3 transition-colors hover:border-line-strong sm:max-w-[420px]"
      >
        <Search className="size-4 shrink-0" />
        <span className="truncate">Search or ask a question</span>
        <span className="ml-auto hidden items-center gap-1 sm:flex">
          <Kbd>Ctrl</Kbd>
          <Kbd>K</Kbd>
        </span>
      </button>

      <div className="ml-auto flex items-center gap-1">
        <Tooltip content={CONNECTION_COPY[connection]} side="bottom">
          <span className="mr-1 hidden h-7 items-center gap-2 rounded-full border border-line bg-surface px-2.5 text-[12px] font-semibold text-ink-2 md:inline-flex">
            <span
              className={cn(
                'size-1.5 rounded-full',
                connection === 'live' ? 'live-dot bg-positive' : 'bg-warning',
              )}
            />
            {connection === 'live' ? 'Live' : 'Syncing'}
          </span>
        </Tooltip>

        <ReviewerGuide />

        <NotificationsBell />

        <Button
          variant="ghost"
          size="icon"
          aria-label="Toggle theme"
          onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
        >
          {mounted && resolvedTheme === 'dark' ? <Sun /> : <Moon />}
        </Button>

        {can('payments:create') && (
          <Button
            variant="primary"
            className="ml-1 hidden sm:inline-flex"
            onClick={() => openSendMoney()}
          >
            <Send />
            Send money
          </Button>
        )}
      </div>
    </header>
  );
}
