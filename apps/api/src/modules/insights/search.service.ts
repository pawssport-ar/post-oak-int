import { Injectable } from '@nestjs/common';
import type { SearchResults } from '@post-oak/contracts';
import type { Workspace } from '../../core/workspace/workspace.js';

const LIMIT = 5;

@Injectable()
export class SearchService {
  search(workspace: Workspace, rawQuery: string): SearchResults {
    const q = rawQuery.trim().toLowerCase();
    if (q.length < 2) return { transactions: [], recipients: [], invoices: [], cards: [] };
    const has = (value: string) => value.toLowerCase().includes(q);

    return {
      transactions: workspace.transactions
        .filter((t) => has(t.counterparty) || has(t.reference) || has(t.memo ?? ''))
        .slice(0, LIMIT)
        .map((t) => ({ id: t.id, counterparty: t.counterparty, amount: t.amount, date: t.date })),
      recipients: workspace.recipients
        .filter((r) => has(r.name))
        .slice(0, LIMIT)
        .map((r) => ({ id: r.id, name: r.name, type: r.type })),
      invoices: workspace.invoices
        .filter((i) => has(i.number) || has(i.customer))
        .slice(0, LIMIT)
        .map((i) => ({ id: i.id, number: i.number, customer: i.customer, total: i.total })),
      cards: workspace.cards
        .filter((c) => has(c.nickname) || c.last4.includes(q))
        .slice(0, LIMIT)
        .map((c) => ({ id: c.id, nickname: c.nickname, last4: c.last4 })),
    };
  }
}
