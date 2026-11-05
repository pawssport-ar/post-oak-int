import { Injectable } from '@nestjs/common';
import type { Account, AccountSecrets, Statement, User } from '@post-oak/contracts';
import { formatCents } from '@post-oak/contracts';
import { DomainError } from '../../common/domain-error.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { LedgerService } from '../../core/ledger/ledger.service.js';
import type { AccountRecord, Workspace } from '../../core/workspace/workspace.js';
import { dailyBalances } from '../insights/analytics.js';

const STATEMENT_MONTHS = 12;
const monthLabel = new Intl.DateTimeFormat('en-US', {
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});

@Injectable()
export class AccountsService {
  constructor(
    private readonly ledger: LedgerService,
    private readonly audit: AuditService,
  ) {}

  list(workspace: Workspace): Account[] {
    return workspace.accounts.map((account) => this.present(workspace, account));
  }

  get(workspace: Workspace, id: string): Account {
    return this.present(workspace, this.find(workspace, id));
  }

  reveal(workspace: Workspace, actor: User, id: string): AccountSecrets {
    const account = this.find(workspace, id);
    this.audit.record(
      workspace,
      actor,
      'Revealed account number',
      `${account.name} ••${account.last4}`,
    );
    return {
      accountId: account.id,
      routingNumber: account.routingNumber,
      accountNumber: account.accountNumber,
    };
  }

  statements(workspace: Workspace, id: string): Statement[] {
    const account = this.find(workspace, id);
    const now = new Date();
    const statements: Statement[] = [];

    for (let offset = 1; offset <= STATEMENT_MONTHS; offset += 1) {
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
      const period = start.toISOString().slice(0, 7);
      const items = workspace.transactions.filter(
        (t) => t.accountId === id && t.status === 'posted' && t.date.startsWith(period),
      );
      const totalCredits = items.reduce((sum, t) => (t.amount > 0 ? sum + t.amount : sum), 0);
      const totalDebits = items.reduce((sum, t) => (t.amount < 0 ? sum - t.amount : sum), 0);
      const closingBalance = items[0]?.balanceAfter ?? account.balance;
      statements.push({
        id: `${id}-${period}`,
        accountId: id,
        period,
        label: monthLabel.format(start),
        openingBalance: closingBalance - totalCredits + totalDebits,
        closingBalance,
        totalCredits,
        totalDebits,
        transactionCount: items.length,
      });
    }
    return statements;
  }

  statementCsv(workspace: Workspace, id: string, period: string): string {
    this.find(workspace, id);
    const rows = workspace.transactions
      .filter((t) => t.accountId === id && t.status === 'posted' && t.date.startsWith(period))
      .reverse()
      .map((t) =>
        [
          t.date.slice(0, 10),
          `"${t.counterparty.replaceAll('"', '""')}"`,
          `"${t.description.replaceAll('"', '""')}"`,
          t.rail.toUpperCase(),
          formatCents(t.amount),
          t.balanceAfter === null ? '' : formatCents(t.balanceAfter),
        ].join(','),
      );
    return ['Date,Counterparty,Description,Rail,Amount,Balance', ...rows].join('\n');
  }

  private find(workspace: Workspace, id: string): AccountRecord {
    const account = workspace.accounts.find((a) => a.id === id);
    if (!account) throw DomainError.notFound('Account');
    return account;
  }

  private present(workspace: Workspace, account: AccountRecord): Account {
    const trend = dailyBalances(workspace, 30, account.id).map((point) => point.balance);
    const pending = workspace.transactions
      .filter((t) => t.accountId === account.id && t.status === 'pending')
      .reduce((sum, t) => sum + t.amount, 0);
    return {
      id: account.id,
      name: account.name,
      kind: account.kind,
      purpose: account.purpose,
      last4: account.last4,
      routingNumber: account.routingNumber,
      balance: account.balance,
      available: this.ledger.available(workspace, account.id),
      pending,
      apyBps: account.apyBps,
      change30d: account.balance - (trend[0] ?? account.balance),
      trend,
      openedAt: account.openedAt,
    };
  }
}
