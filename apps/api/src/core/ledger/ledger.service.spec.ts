import { buildSeedData } from '../../seed/seed-data.js';
import type { Workspace } from '../workspace/workspace.js';
import { LedgerService } from './ledger.service.js';

function workspace(): Workspace {
  return {
    ...structuredClone(buildSeedData(new Date('2026-11-05T15:00:00Z'))),
    id: 'test',
    createdAt: new Date(),
    lastSeenAt: 0,
    idempotency: new Map(),
    timers: new Set(),
  };
}

const entry = {
  accountId: 'acc_operating',
  counterparty: 'Test Vendor',
  description: 'TEST',
  amount: -10_000,
  rail: 'ach',
  category: 'software',
} as const;

describe('LedgerService', () => {
  const ledger = new LedgerService();

  it('moves the balance when posting', () => {
    const ws = workspace();
    const before = ws.accounts[0]?.balance ?? 0;

    const transaction = ledger.post(ws, entry);

    expect(ws.accounts[0]?.balance).toBe(before - 10_000);
    expect(transaction.balanceAfter).toBe(before - 10_000);
    expect(ws.transactions[0]).toBe(transaction);
  });

  it('reduces available funds, not the balance, while a hold is pending', () => {
    const ws = workspace();
    const balance = ws.accounts[0]?.balance ?? 0;
    const available = ledger.available(ws, 'acc_operating');

    const hold = ledger.hold(ws, entry);

    expect(ws.accounts[0]?.balance).toBe(balance);
    expect(ledger.available(ws, 'acc_operating')).toBe(available - 10_000);
    expect(hold.balanceAfter).toBeNull();
  });

  it('applies a hold to the balance exactly once when it settles', () => {
    const ws = workspace();
    const balance = ws.accounts[0]?.balance ?? 0;
    const hold = ledger.hold(ws, entry);

    ledger.settle(ws, hold.id);

    expect(ws.accounts[0]?.balance).toBe(balance - 10_000);
    expect(hold.status).toBe('posted');
    expect(() => ledger.settle(ws, hold.id)).toThrow('Only pending activity can settle.');
  });

  it('frees the funds when a hold is released', () => {
    const ws = workspace();
    const available = ledger.available(ws, 'acc_operating');
    const hold = ledger.hold(ws, entry);

    ledger.release(ws, hold.id, 'Declined by the network');

    expect(hold.status).toBe('failed');
    expect(ledger.available(ws, 'acc_operating')).toBe(available);
  });
});
