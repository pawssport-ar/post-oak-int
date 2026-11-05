import type {
  AccountKind,
  AdvisoryRequest,
  ApprovalPolicy,
  AuditEvent,
  Bill,
  Card,
  Cents,
  Company,
  Invoice,
  IsoDateTime,
  Notification,
  Payment,
  Recipient,
  Transaction,
  User,
} from '@post-oak/contracts';

/** Persisted account state. Balances derived from the ledger are computed on read. */
export interface AccountRecord {
  id: string;
  name: string;
  kind: AccountKind;
  purpose: string;
  last4: string;
  accountNumber: string;
  routingNumber: string;
  /** Posted ledger balance. */
  balance: Cents;
  apyBps: number | null;
  openedAt: IsoDateTime;
}

export type CardRecord = Omit<Card, 'spent' | 'holderName' | 'accountName'> & {
  number: string;
  cvc: string;
};

export type BillRecord = Omit<Bill, 'isOverdue'>;
export type InvoiceRecord = Omit<Invoice, 'isOverdue' | 'daysOverdue'>;

/** Everything a seeded sandbox contains. Plain data, so it can be deep-cloned per visitor. */
export interface WorkspaceData {
  company: Company;
  actingUserId: string;
  users: User[];
  accounts: AccountRecord[];
  /** Newest first. */
  transactions: Transaction[];
  recipients: Recipient[];
  payments: Payment[];
  cards: CardRecord[];
  bills: BillRecord[];
  invoices: InvoiceRecord[];
  policies: ApprovalPolicy[];
  audit: AuditEvent[];
  notifications: Notification[];
  advisoryRequests: AdvisoryRequest[];
}

/**
 * An isolated banking environment. This is the seam a real persistence layer would
 * replace: services only depend on this shape, never on where it is stored.
 */
export interface Workspace extends WorkspaceData {
  id: string;
  createdAt: Date;
  lastSeenAt: number;
  idempotency: Map<string, unknown>;
  /** Pending simulated work, cancelled when the sandbox resets. */
  timers: Set<NodeJS.Timeout>;
}
