import type { Cents, IsoDateTime } from './shared.js';

export const ACCOUNT_KINDS = ['operating', 'payroll', 'tax', 'reserve'] as const;
export type AccountKind = (typeof ACCOUNT_KINDS)[number];

export interface Account {
  id: string;
  name: string;
  kind: AccountKind;
  purpose: string;
  last4: string;
  routingNumber: string;
  /** Ledger balance: everything posted. */
  balance: Cents;
  /** Ledger balance minus pending debits. */
  available: Cents;
  /** Sum of pending activity (negative when money is on its way out). */
  pending: Cents;
  /** Annual percentage yield in basis points, for interest-bearing accounts. */
  apyBps: number | null;
  /** Net change over the trailing 30 days. */
  change30d: Cents;
  /** Daily closing balance for the trailing 30 days, oldest first. */
  trend: Cents[];
  openedAt: IsoDateTime;
}

export interface AccountSecrets {
  accountId: string;
  routingNumber: string;
  accountNumber: string;
}

export interface Statement {
  id: string;
  accountId: string;
  /** `YYYY-MM` */
  period: string;
  label: string;
  openingBalance: Cents;
  closingBalance: Cents;
  totalCredits: Cents;
  totalDebits: Cents;
  transactionCount: number;
}
