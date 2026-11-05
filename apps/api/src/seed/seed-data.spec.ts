import { isValidRoutingNumber } from '@post-oak/contracts';
import { ACCOUNTS, ROUTING_NUMBER } from './catalog.js';
import { buildSeedData } from './seed-data.js';

const now = new Date('2026-11-05T15:00:00Z');

describe('seed data', () => {
  const data = buildSeedData(now);

  it('is deterministic for a given day', () => {
    const again = buildSeedData(now);
    expect(again.transactions.map((t) => t.amount)).toEqual(data.transactions.map((t) => t.amount));
  });

  it('lands every account exactly on its target balance', () => {
    for (const target of ACCOUNTS) {
      const account = data.accounts.find((a) => a.id === target.id);
      expect(account?.balance).toBe(target.targetBalance);
    }
  });

  it('keeps running balances consistent with the ledger', () => {
    for (const account of data.accounts) {
      const posted = data.transactions.filter(
        (t) => t.accountId === account.id && t.status === 'posted',
      );
      expect(posted[0]?.balanceAfter).toBe(account.balance);
      for (let i = 0; i < posted.length - 1; i += 1) {
        const newer = posted[i];
        const older = posted[i + 1];
        expect(newer?.balanceAfter).toBe((older?.balanceAfter ?? 0) + (newer?.amount ?? 0));
      }
    }
  });

  it('never dates activity in the future', () => {
    expect(data.transactions.every((t) => new Date(t.date) <= now)).toBe(true);
  });

  it('nets internal transfers to zero across accounts', () => {
    const net = data.transactions
      .filter((t) => t.category === 'transfer' && t.status === 'posted')
      .reduce((sum, t) => sum + t.amount, 0);
    expect(net).toBe(0);
  });

  it('seeds the routing number with a valid ABA checksum', () => {
    expect(isValidRoutingNumber(ROUTING_NUMBER)).toBe(true);
    expect(isValidRoutingNumber('123456789')).toBe(false);
  });
});
