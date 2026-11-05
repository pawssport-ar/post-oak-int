'use client';

import { createContext, type ReactNode, useContext, useMemo, useState } from 'react';

export interface SendMoneyPrefill {
  recipientId?: string;
  mode?: 'external' | 'internal';
  /** Internal transfer shortcut: opens straight on the review step. */
  transfer?: { fromAccountId: string; toAccountId: string; amount: number; memo: string };
}

interface AppActions {
  paletteOpen: boolean;
  setPaletteOpen: (open: boolean) => void;
  /** `session` changes on every open, so the flow can start from a clean slate. */
  sendMoney: { open: boolean; prefill: SendMoneyPrefill; session: number };
  openSendMoney: (prefill?: SendMoneyPrefill) => void;
  closeSendMoney: () => void;
}

const AppActionsContext = createContext<AppActions | null>(null);

/** App-wide overlays, reachable from the sidebar, the palette and keyboard shortcuts. */
export function AppActionsProvider({ children }: { children: ReactNode }) {
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [sendMoney, setSendMoney] = useState<AppActions['sendMoney']>({
    open: false,
    prefill: {},
    session: 0,
  });

  const value = useMemo<AppActions>(
    () => ({
      paletteOpen,
      setPaletteOpen,
      sendMoney,
      openSendMoney: (prefill = {}) =>
        setSendMoney((current) => ({ open: true, prefill, session: current.session + 1 })),
      closeSendMoney: () => setSendMoney((current) => ({ ...current, open: false })),
    }),
    [paletteOpen, sendMoney],
  );

  return <AppActionsContext.Provider value={value}>{children}</AppActionsContext.Provider>;
}

export function useAppActions(): AppActions {
  const context = useContext(AppActionsContext);
  if (!context) throw new Error('useAppActions must be used inside AppActionsProvider');
  return context;
}
