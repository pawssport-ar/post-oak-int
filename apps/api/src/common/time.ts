import type { IsoDate } from '@post-oak/contracts';

export const DAY_MS = 86_400_000;

export const addDays = (date: Date, days: number): Date => new Date(date.getTime() + days * DAY_MS);

export const toIsoDate = (date: Date): IsoDate => date.toISOString().slice(0, 10);

export const isWeekend = (date: Date): boolean => {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
};

export function nextBusinessDay(date: Date): Date {
  let next = addDays(date, 1);
  while (isWeekend(next)) next = addDays(next, 1);
  return next;
}

/** Hour of day (0-23) in the bank's operating time zone. */
export function centralHour(date: Date): number {
  const hour = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Chicago',
    hour: 'numeric',
    hourCycle: 'h23',
  }).format(date);
  return Number(hour);
}

export function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / DAY_MS);
}

/** Same calendar date at a fixed UTC hour, used to place generated activity in business hours. */
export function atUtcHour(date: Date, hour: number, minute = 0): Date {
  const copy = new Date(date);
  copy.setUTCHours(hour, minute, 0, 0);
  return copy;
}
