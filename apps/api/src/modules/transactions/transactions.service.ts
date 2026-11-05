import { Injectable } from '@nestjs/common';
import {
  can,
  CATEGORIES,
  formatCents,
  type Transaction,
  type TransactionPage,
  type TransactionQuery,
  type UpdateTransactionInput,
  type User,
} from '@post-oak/contracts';
import { DomainError } from '../../common/domain-error.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { RealtimeService } from '../../core/realtime/realtime.service.js';
import type { Workspace } from '../../core/workspace/workspace.js';

@Injectable()
export class TransactionsService {
  constructor(
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  search(workspace: Workspace, actor: User, query: TransactionQuery): TransactionPage {
    const matches = this.filter(this.visibleTo(workspace, actor), query);
    const sorted = this.sort(matches, query);
    const start = (query.page - 1) * query.pageSize;
    const inflow = matches.reduce((sum, t) => (t.amount > 0 ? sum + t.amount : sum), 0);
    const outflow = matches.reduce((sum, t) => (t.amount < 0 ? sum - t.amount : sum), 0);
    return {
      items: sorted.slice(start, start + query.pageSize),
      total: matches.length,
      page: query.page,
      pageSize: query.pageSize,
      summary: { inflow, outflow, net: inflow - outflow },
    };
  }

  get(workspace: Workspace, actor: User, id: string): Transaction {
    const transaction = this.visibleTo(workspace, actor).find((t) => t.id === id);
    if (!transaction) throw DomainError.notFound('Transaction');
    return transaction;
  }

  update(
    workspace: Workspace,
    actor: User,
    id: string,
    input: UpdateTransactionInput,
  ): Transaction {
    const transaction = this.get(workspace, actor, id);
    if (input.category && input.category !== transaction.category) {
      this.audit.record(
        workspace,
        actor,
        'Recategorized transaction',
        transaction.counterparty,
        `${CATEGORIES[transaction.category].label} to ${CATEGORIES[input.category].label}`,
      );
      transaction.category = input.category;
    }
    if (input.memo !== undefined) transaction.memo = input.memo;
    if (input.tags) transaction.tags = input.tags;
    if (input.receipt !== undefined) transaction.receipt = input.receipt;
    this.realtime.publish(workspace, 'transaction.updated', ['transactions', 'insights']);
    return transaction;
  }

  exportCsv(workspace: Workspace, actor: User, query: TransactionQuery): string {
    const rows = this.sort(this.filter(this.visibleTo(workspace, actor), query), query).map((t) =>
      [
        t.date.slice(0, 10),
        csvField(t.counterparty),
        csvField(CATEGORIES[t.category].label),
        csvField(t.accountName),
        t.rail.toUpperCase(),
        t.status,
        formatCents(t.amount),
        csvField(t.memo ?? ''),
        t.reference,
      ].join(','),
    );
    return ['Date,Counterparty,Category,Account,Rail,Status,Amount,Memo,Reference', ...rows].join(
      '\n',
    );
  }

  /** Cardholders only ever see activity on their own cards. */
  private visibleTo(workspace: Workspace, actor: User): Transaction[] {
    if (can(actor.role, 'accounts:view')) return workspace.transactions;
    const cardIds = new Set(
      workspace.cards.filter((card) => card.holderId === actor.id).map((card) => card.id),
    );
    return workspace.transactions.filter((t) => t.cardId && cardIds.has(t.cardId));
  }

  private filter(items: Transaction[], query: TransactionQuery): Transaction[] {
    const needle = query.q?.toLowerCase();
    const from = query.from;
    const to = query.to;
    return items.filter((t) => {
      if (needle) {
        const haystack =
          `${t.counterparty} ${t.description} ${t.memo ?? ''} ${t.reference} ${t.tags.join(' ')}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      const day = t.date.slice(0, 10);
      if (from && day < from) return false;
      if (to && day > to) return false;
      if (query.accountId?.length && !query.accountId.includes(t.accountId)) return false;
      if (query.category?.length && !query.category.includes(t.category)) return false;
      if (query.rail?.length && !query.rail.includes(t.rail)) return false;
      if (query.status?.length && !query.status.includes(t.status)) return false;
      if (query.cardId && t.cardId !== query.cardId) return false;
      if (query.direction === 'in' && t.amount <= 0) return false;
      if (query.direction === 'out' && t.amount >= 0) return false;
      const size = Math.abs(t.amount);
      if (query.minAmount !== undefined && size < query.minAmount) return false;
      if (query.maxAmount !== undefined && size > query.maxAmount) return false;
      return true;
    });
  }

  private sort(items: Transaction[], query: TransactionQuery): Transaction[] {
    const direction = query.order === 'asc' ? 1 : -1;
    const compare: Record<TransactionQuery['sort'], (a: Transaction, b: Transaction) => number> = {
      date: (a, b) => a.date.localeCompare(b.date),
      amount: (a, b) => Math.abs(a.amount) - Math.abs(b.amount),
      counterparty: (a, b) => a.counterparty.localeCompare(b.counterparty),
    };
    return [...items].sort((a, b) => compare[query.sort](a, b) * direction);
  }
}

function csvField(value: string): string {
  return `"${value.replaceAll('"', '""')}"`;
}
