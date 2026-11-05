import { cn } from '@/lib/cn';

/** The Post Oak column, redrawn as a vector so it can take any brand color. */
export function ColumnMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 100" fill="currentColor" aria-hidden className={className}>
      <path d="M2 3h60l-1.2 3.4c-.6 1.7-2.2 2.8-4 2.8H7.2c-1.8 0-3.4-1.1-4-2.8L2 3Z" />
      <path d="M9 12h46c0 3.6-2.4 6.6-5.6 7.4H14.6C11.4 18.6 9 15.6 9 12Z" />
      <rect x="13" y="21.2" width="38" height="2.4" rx="0.6" />
      <path d="M15.6 26.2h8.6l-.5 46.3c0 1.8-.9 3.5-2.4 4.7l-.9.7c-.5.3-1.1.3-1.5 0l-.9-.7c-1.5-1.2-2.4-2.9-2.4-4.7V26.2Z" />
      <path d="M27.7 26.2h8.6l-.2 46.3c0 1.8-.9 3.5-2.4 4.7l-.9.7c-.5.3-1.1.3-1.5 0l-.9-.7c-1.5-1.2-2.4-2.9-2.4-4.7l-.3-46.3Z" />
      <path d="M39.8 26.2h8.6l-.2 46.3c0 1.8-.9 3.5-2.4 4.7l-.9.7c-.5.3-1.1.3-1.5 0l-.9-.7c-1.5-1.2-2.4-2.9-2.4-4.7l-.3-46.3Z" />
      <rect x="11.5" y="80.2" width="41" height="5.4" rx="1.6" />
      <rect x="6" y="88" width="52" height="7.6" rx="1.8" />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <ColumnMark className="h-[34px] w-auto shrink-0" />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="font-display text-[21px] tracking-[0.015em]">POST OAK</span>
          <span className="mt-[3px] flex items-center gap-1.5">
            <span className="h-px flex-1 bg-current opacity-70" />
            <span className="font-display text-[10.5px] tracking-[0.26em]">GROUP</span>
            <span className="h-px flex-1 bg-current opacity-70" />
          </span>
        </span>
      )}
    </span>
  );
}
