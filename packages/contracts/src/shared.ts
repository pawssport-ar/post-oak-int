import { z } from 'zod';

/** Money is always an integer number of US cents. Floats never touch a balance. */
export type Cents = number;
/** ISO-8601 instant, e.g. `2026-11-05T15:21:00.000Z`. */
export type IsoDateTime = string;
/** Calendar date, e.g. `2026-11-05`. */
export type IsoDate = string;

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

/** RFC 9457 problem document returned by every failed API call. */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  code: string;
  fields?: Record<string, string>;
}

/** Parses `a,b,c` query strings (and repeated params) into a validated array. */
export const csvOf = <T extends z.ZodType>(item: T) =>
  z
    .preprocess((value) => {
      if (typeof value === 'string') return value.length > 0 ? value.split(',') : [];
      return value;
    }, z.array(item))
    .optional();

export const positiveCentsSchema = z.number().int().positive().max(100_000_000_000);

export function formatCents(cents: Cents): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(cents);
  const dollars = Math.floor(abs / 100).toLocaleString('en-US');
  const remainder = String(abs % 100).padStart(2, '0');
  return `${sign}$${dollars}.${remainder}`;
}
