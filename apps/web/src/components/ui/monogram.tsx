import { cn } from '@/lib/cn';
import { initialsOf } from '@/lib/format';

const TINTS = [
  'bg-oak-100 text-oak-800 dark:bg-oak-800 dark:text-oak-100',
  'bg-[#efe6d3] text-[#7a5c1e] dark:bg-[#3a2f19] dark:text-[#e0c98e]',
  'bg-[#e2e9f1] text-[#2f5578] dark:bg-[#1f3244] dark:text-[#a9c8e4]',
  'bg-[#f1e3de] text-[#8d4530] dark:bg-[#3f251d] dark:text-[#e9b9a8]',
  'bg-surface-3 text-ink-2',
];

function tintFor(name: string): string {
  let hash = 0;
  for (const char of name) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TINTS[hash % TINTS.length] ?? 'bg-surface-3 text-ink-2';
}

interface MonogramProps {
  name: string;
  initials?: string;
  size?: 'sm' | 'md' | 'lg';
  round?: boolean;
  className?: string;
}

/** Counterparties and people get a serif monogram rather than a logo we do not own. */
export function Monogram({ name, initials, size = 'md', round = false, className }: MonogramProps) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center font-display leading-none',
        size === 'sm' && 'size-7 text-[12px]',
        size === 'md' && 'size-9 text-[14px]',
        size === 'lg' && 'size-11 text-[17px]',
        round ? 'rounded-full' : 'rounded-lg',
        tintFor(name),
        className,
      )}
    >
      {initials ?? initialsOf(name)}
    </span>
  );
}
