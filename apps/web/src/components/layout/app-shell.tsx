'use client';

import type { ReactNode } from 'react';
import { SendMoneyFlow } from '@/features/payments/send-money-flow';
import { useRealtime } from '@/lib/realtime';
import { AppActionsProvider } from './app-context';
import { CommandPalette } from './command-palette';
import { MobileNav } from './mobile-nav';
import { Sidebar } from './sidebar';
import { TopBar } from './topbar';

/**
 * The frame: a green column on the left, and a paper sheet that sits slightly inset,
 * echoing the green-and-white rhythm of postoakgroup.co.
 */
export function AppShell({ children }: { children: ReactNode }) {
  const connection = useRealtime();

  return (
    <AppActionsProvider>
      <div className="flex h-dvh overflow-hidden bg-frame">
        <Sidebar />
        <div className="min-w-0 flex-1 lg:py-2 lg:pr-2">
          <div className="flex h-full flex-col overflow-hidden bg-canvas lg:rounded-2xl">
            <div className="flex-1 overflow-x-hidden overflow-y-auto" id="main-scroll">
              <TopBar connection={connection} />
              <main className="mx-auto w-full max-w-[1320px] px-4 pt-6 pb-28 sm:px-6 lg:pb-12">
                {children}
                <p className="mt-10 text-center text-[12px] leading-relaxed text-ink-3">
                  Case study prepared for The Post Oak Group by Nicolas Lahoz. All data is
                  fictional. Not a live banking product.
                </p>
              </main>
            </div>
          </div>
        </div>
        <MobileNav />
      </div>
      <CommandPalette />
      <SendMoneyFlow />
    </AppActionsProvider>
  );
}
