import type { Cents } from '@post-oak/contracts';
import { differenceInCalendarDays, format, formatDistanceToNowStrict, parseISO } from 'date-fns';

const whole = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
});

/** `$48,200.00` */
export function money(cents: Cents, options: { signed?: boolean } = {}): string {
  const abs = Math.abs(cents);
  const dollars = whole.format(Math.floor(abs / 100));
  const fraction = String(Math.round(abs % 100)).padStart(2, '0');
  const sign = cents < 0 ? '-' : options.signed && cents > 0 ? '+' : '';
  return `${sign}$${dollars}.${fraction}`;
}

/** `$8.4M`, for axes and tight tiles. */
export function moneyCompact(cents: Cents): string {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${compact.format(Math.abs(cents) / 100)}`;
}

/** Whole dollars, `$48,200`. */
export function moneyWhole(cents: Cents): string {
  const sign = cents < 0 ? '-' : '';
  return `${sign}$${whole.format(Math.abs(Math.round(cents / 100)))}`;
}

export function percent(value: number, digits = 1): string {
  return `${(value * 100).toFixed(digits)}%`;
}

export function signedPercent(value: number, digits = 1): string {
  return `${value >= 0 ? '+' : ''}${(value * 100).toFixed(digits)}%`;
}

export function shortDate(iso: string): string {
  return format(parseISO(iso), 'MMM d');
}

export function longDate(iso: string): string {
  return format(parseISO(iso), 'MMMM d, yyyy');
}

export function dateTime(iso: string): string {
  return format(parseISO(iso), "MMM d, yyyy 'at' h:mm a");
}

export function timeOnly(iso: string): string {
  return format(parseISO(iso), 'h:mm a');
}

export function relativeTime(iso: string): string {
  return `${formatDistanceToNowStrict(parseISO(iso))} ago`;
}

/** `Today`, `Yesterday` or `Monday, Nov 2`, for grouped ledgers. */
export function dayHeading(iso: string): string {
  const date = parseISO(iso);
  const days = differenceInCalendarDays(new Date(), date);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return format(date, days < 300 ? 'EEEE, MMM d' : 'EEEE, MMM d, yyyy');
}

export function dueLabel(isoDate: string): string {
  const days = differenceInCalendarDays(parseISO(isoDate), new Date());
  if (days === 0) return 'Due today';
  if (days === 1) return 'Due tomorrow';
  if (days < 0) return `${Math.abs(days)} ${days === -1 ? 'day' : 'days'} overdue`;
  return `Due in ${days} days`;
}

export function initialsOf(name: string): string {
  const words = name
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  return ((words[0]?.[0] ?? '') + (words[1]?.[0] ?? '')).toUpperCase() || '?';
}

export function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}
