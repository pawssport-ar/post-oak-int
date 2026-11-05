'use client';

import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Dialog as Radix } from 'radix-ui';
import type { ReactNode } from 'react';

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  children: ReactNode;
}

/** Right-hand detail drawer. The list stays in view, so context is never lost. */
export function Sheet({ open, onOpenChange, title, children }: SheetProps) {
  return (
    <Radix.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Radix.Portal forceMount>
            <Radix.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-40 bg-[var(--overlay)]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </Radix.Overlay>
            <Radix.Content asChild forceMount aria-describedby={undefined}>
              <motion.aside
                className="fixed inset-y-0 right-0 z-40 flex w-full max-w-[480px] flex-col overflow-hidden border-l border-line bg-surface shadow-pop outline-none sm:inset-y-2 sm:right-2 sm:rounded-2xl sm:border"
                initial={{ x: '104%' }}
                animate={{ x: 0 }}
                exit={{ x: '104%' }}
                transition={{ type: 'spring', stiffness: 380, damping: 40 }}
              >
                <Radix.Title className="sr-only">{title}</Radix.Title>
                <Radix.Close
                  aria-label="Close"
                  className="absolute top-3.5 right-3.5 z-10 inline-flex size-8 items-center justify-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-ink"
                >
                  <X className="size-4" />
                </Radix.Close>
                <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
              </motion.aside>
            </Radix.Content>
          </Radix.Portal>
        )}
      </AnimatePresence>
    </Radix.Root>
  );
}
