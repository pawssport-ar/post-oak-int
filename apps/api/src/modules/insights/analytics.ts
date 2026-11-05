import type { BalancePoint, Cents, IsoDate, Transaction } from '@post-oak/contracts';
import { addDays, toIsoDate } from '../../common/time.js';
import type { Workspace } from '../../core/workspace/workspace.js';

/** Internal book transfers move money between accounts, not in or out of the business. */
export const isExternal = (t: Transaction): boolean => t.category !== 'transfer';

export const isPosted = (t: Transaction): boolean => t.status === 'posted';

export function totalCash(workspace: Workspace): Cents {
  return workspace.accounts.reduce((sum, account) => sum + account.balance, 0);
}

/** Posted, external activity inside a trailing window of `[daysAgoStart, daysAgoEnd)`. */
export function windowed(
  workspace: Workspace,
  daysAgoStart: number,
  daysAgoEnd = 0,
  now = new Date(),
): Transaction[] {
  const from = addDays(now, -daysAgoStart).getTime();
  const to = addDays(now, -daysAgoEnd).getTime();
  return workspace.transactions.filter((t) => {
    const time = new Date(t.date).getTime();
    return time >= from && time < to && isPosted(t) && isExternal(t);
  });
}

export const sumInflow = (items: Transaction[]): Cents =>
  items.reduce((sum, t) => (t.amount > 0 ? sum + t.amount : sum), 0);

export const sumOutflow = (items: Transaction[]): Cents =>
  items.reduce((sum, t) => (t.amount < 0 ? sum - t.amount : sum), 0);

/**
 * Daily closing balances, reconstructed by walking the ledger backwards from today's
 * balance. Oldest point first.
 */
export function dailyBalances(
  workspace: Workspace,
  days: number,
  accountId?: string,
  now = new Date(),
): BalancePoint[] {
  const perDay = new Map<IsoDate, { net: Cents; inflow: Cents; outflow: Cents }>();
  for (const t of workspace.transactions) {
    if (!isPosted(t) || (accountId && t.accountId !== accountId)) continue;
    const day = t.date.slice(0, 10);
    const entry = perDay.get(day) ?? { net: 0, inflow: 0, outflow: 0 };
    entry.net += t.amount;
    if (isExternal(t)) {
      if (t.amount > 0) entry.inflow += t.amount;
      else entry.outflow -= t.amount;
    }
    perDay.set(day, entry);
  }

  let balance = accountId
    ? (workspace.accounts.find((a) => a.id === accountId)?.balance ?? 0)
    : totalCash(workspace);

  const points: BalancePoint[] = [];
  for (let i = 0; i < days; i += 1) {
    const date = toIsoDate(addDays(now, -i));
    const entry = perDay.get(date);
    points.push({
      date,
      balance,
      inflow: entry?.inflow ?? 0,
      outflow: entry?.outflow ?? 0,
    });
    balance -= entry?.net ?? 0;
  }
  return points.reverse();
}

export function clamp(value: number, min = 0, max = 100): number {
  return Math.min(max, Math.max(min, value));
}
