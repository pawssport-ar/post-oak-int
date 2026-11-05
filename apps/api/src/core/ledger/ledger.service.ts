import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { Cents, Transaction, TransactionEvent } from '@post-oak/contracts';
import { DomainError } from '../../common/domain-error.js';
import type { AccountRecord, Workspace } from '../workspace/workspace.js';

export type LedgerEntry = Pick<
  Transaction,
  'accountId' | 'counterparty' | 'description' | 'amount' | 'rail' | 'category'
> &
  Partial<
    Pick<
      Transaction,
      'memo' | 'cardId' | 'cardLabel' | 'paymentId' | 'invoiceId' | 'billId' | 'tags'
    >
  >;

/**
 * The single place balances change. Everything that moves money goes through here,
 * which keeps the invariant `account.balance === opening + sum(posted entries)`.
 */
@Injectable()
export class LedgerService {
  /** Records posted money movement and updates the balance immediately. */
  post(workspace: Workspace, entry: LedgerEntry, at = new Date()): Transaction {
    const account = this.account(workspace, entry.accountId);
    account.balance += entry.amount;
    const transaction = this.build(account, entry, at, 'posted');
    transaction.balanceAfter = account.balance;
    transaction.timeline.push({ label: 'Posted to ledger', at: at.toISOString() });
    workspace.transactions.unshift(transaction);
    return transaction;
  }

  /** Records a hold. The ledger balance is untouched until `settle` runs. */
  hold(workspace: Workspace, entry: LedgerEntry, at = new Date()): Transaction {
    const account = this.account(workspace, entry.accountId);
    const transaction = this.build(account, entry, at, 'pending');
    workspace.transactions.unshift(transaction);
    return transaction;
  }

  settle(workspace: Workspace, transactionId: string, at = new Date()): Transaction {
    const transaction = this.transaction(workspace, transactionId);
    if (transaction.status !== 'pending') {
      throw DomainError.conflict('not_pending', 'Only pending activity can settle.');
    }
    const account = this.account(workspace, transaction.accountId);
    account.balance += transaction.amount;
    transaction.status = 'posted';
    transaction.balanceAfter = account.balance;
    transaction.date = at.toISOString();
    transaction.timeline.push({ label: 'Posted to ledger', at: at.toISOString() });
    return transaction;
  }

  release(workspace: Workspace, transactionId: string, reason: string, at = new Date()): void {
    const transaction = this.transaction(workspace, transactionId);
    transaction.status = 'failed';
    transaction.timeline.push({ label: reason, at: at.toISOString() });
  }

  /** Available funds: posted balance minus outstanding debit holds. */
  available(workspace: Workspace, accountId: string): Cents {
    const account = this.account(workspace, accountId);
    return account.balance + this.pendingDebits(workspace, accountId);
  }

  pendingDebits(workspace: Workspace, accountId: string): Cents {
    return workspace.transactions
      .filter((t) => t.accountId === accountId && t.status === 'pending' && t.amount < 0)
      .reduce((sum, t) => sum + t.amount, 0);
  }

  private build(
    account: AccountRecord,
    entry: LedgerEntry,
    at: Date,
    status: Transaction['status'],
  ): Transaction {
    const timeline: TransactionEvent[] = [
      { label: status === 'pending' ? 'Authorized' : 'Received', at: at.toISOString() },
    ];
    return {
      id: `txn_${randomUUID().slice(0, 12)}`,
      accountId: account.id,
      accountName: account.name,
      date: at.toISOString(),
      counterparty: entry.counterparty,
      description: entry.description,
      amount: entry.amount,
      rail: entry.rail,
      status,
      category: entry.category,
      reference: randomUUID().replaceAll('-', '').slice(0, 15).toUpperCase(),
      balanceAfter: null,
      memo: entry.memo ?? null,
      tags: entry.tags ?? [],
      receipt: null,
      cardId: entry.cardId ?? null,
      cardLabel: entry.cardLabel ?? null,
      paymentId: entry.paymentId ?? null,
      invoiceId: entry.invoiceId ?? null,
      billId: entry.billId ?? null,
      timeline,
    };
  }

  private account(workspace: Workspace, id: string): AccountRecord {
    const account = workspace.accounts.find((a) => a.id === id);
    if (!account) throw DomainError.notFound('Account');
    return account;
  }

  private transaction(workspace: Workspace, id: string): Transaction {
    const transaction = workspace.transactions.find((t) => t.id === id);
    if (!transaction) throw DomainError.notFound('Transaction');
    return transaction;
  }
}
