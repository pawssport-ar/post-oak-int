'use client';

import { X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Dialog as Radix } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children: ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** Hide the visual title when the body renders its own heading. */
  hideHeader?: boolean;
}

const WIDTHS = {
  sm: 'sm:max-w-[420px]',
  md: 'sm:max-w-[520px]',
  lg: 'sm:max-w-[680px]',
  xl: 'sm:max-w-[920px]',
};

/** Centered modal on desktop, bottom sheet on phones. */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  size = 'md',
  hideHeader = false,
}: DialogProps) {
  return (
    <Radix.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open && (
          <Radix.Portal forceMount>
            <Radix.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.18 }}
              />
            </Radix.Overlay>
            <div className="pointer-events-none fixed inset-0 z-50 flex items-end justify-center sm:items-center sm:p-6">
              <Radix.Content asChild forceMount aria-describedby={undefined}>
                <motion.div
                  className={cn(
                    'pointer-events-auto relative flex max-h-[92dvh] w-full flex-col overflow-hidden rounded-t-2xl border border-line bg-surface shadow-pop outline-none sm:rounded-2xl',
                    WIDTHS[size],
                  )}
                  initial={{ opacity: 0, y: 18, scale: 0.985 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 12, scale: 0.985 }}
                  transition={{ type: 'spring', stiffness: 420, damping: 36 }}
                >
                  {hideHeader ? (
                    <Radix.Title className="sr-only">{title}</Radix.Title>
                  ) : (
                    <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-4.5">
                      <div>
                        <Radix.Title className="font-display text-[23px] leading-tight text-ink">
                          {title}
                        </Radix.Title>
                        {description && (
                          <Radix.Description className="mt-0.5 text-[13px] text-ink-3">
                            {description}
                          </Radix.Description>
                        )}
                      </div>
                    </header>
                  )}
                  <Radix.Close
                    aria-label="Close"
                    className="absolute top-3.5 right-3.5 z-10 inline-flex size-8 items-center justify-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-ink"
                  >
                    <X className="size-4" />
                  </Radix.Close>
                  <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
                </motion.div>
              </Radix.Content>
            </div>
          </Radix.Portal>
        )}
      </AnimatePresence>
    </Radix.Root>
  );
}

export function DialogFooter({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <footer
      className={cn(
        'sticky bottom-0 flex items-center justify-end gap-2 border-t border-line bg-surface px-6 py-4',
        className,
      )}
    >
      {children}
    </footer>
  );
}
