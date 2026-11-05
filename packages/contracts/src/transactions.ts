import { z } from 'zod';
import { csvOf, type Cents, type IsoDateTime, type Page } from './shared.js';

export const RAILS = ['ach', 'wire', 'rtp', 'card', 'check', 'book', 'fee', 'interest'] as const;
export type Rail = (typeof RAILS)[number];

export const RAIL_LABELS: Record<Rail, string> = {
  ach: 'ACH',
  wire: 'Wire',
  rtp: 'Instant',
  card: 'Card',
  check: 'Check',
  book: 'Internal',
  fee: 'Fee',
  interest: 'Interest',
};

export const TRANSACTION_STATUSES = ['pending', 'posted', 'failed', 'returned'] as const;
export type TransactionStatus = (typeof TRANSACTION_STATUSES)[number];

export const CATEGORY_KINDS = ['income', 'expense', 'transfer'] as const;
export type CategoryKind = (typeof CATEGORY_KINDS)[number];

export const CATEGORIES = {
  revenue: { label: 'Customer revenue', kind: 'income' },
  interest: { label: 'Interest income', kind: 'income' },
  payroll: { label: 'Payroll', kind: 'expense' },
  carriers: { label: 'Subcontract carriers', kind: 'expense' },
  fuel: { label: 'Fuel & fleet', kind: 'expense' },
  equipment: { label: 'Equipment leases', kind: 'expense' },
  maintenance: { label: 'Maintenance & parts', kind: 'expense' },
  insurance: { label: 'Insurance', kind: 'expense' },
  facilities: { label: 'Rent & facilities', kind: 'expense' },
  software: { label: 'Software', kind: 'expense' },
  professional: { label: 'Professional services', kind: 'expense' },
  travel: { label: 'Travel & meals', kind: 'expense' },
  marketing: { label: 'Marketing', kind: 'expense' },
  utilities: { label: 'Utilities & telecom', kind: 'expense' },
  taxes: { label: 'Taxes', kind: 'expense' },
  fees: { label: 'Bank fees', kind: 'expense' },
  transfer: { label: 'Internal transfer', kind: 'transfer' },
  uncategorized: { label: 'Uncategorized', kind: 'expense' },
} as const satisfies Record<string, { label: string; kind: CategoryKind }>;

export type CategoryId = keyof typeof CATEGORIES;
export const CATEGORY_IDS = Object.keys(CATEGORIES) as [CategoryId, ...CategoryId[]];

export interface TransactionEvent {
  label: string;
  at: IsoDateTime;
  detail?: string;
}

export interface Transaction {
  id: string;
  accountId: string;
  accountName: string;
  /** When the money moved, or was authorised for pending items. */
  date: IsoDateTime;
  counterparty: string;
  /** Raw statement descriptor as received from the network. */
  description: string;
  /** Signed: credits are positive, debits are negative. */
  amount: Cents;
  rail: Rail;
  status: TransactionStatus;
  category: CategoryId;
  reference: string;
  /** Ledger balance right after posting; null while pending. */
  balanceAfter: Cents | null;
  memo: string | null;
  tags: string[];
  receipt: string | null;
  cardId: string | null;
  cardLabel: string | null;
  paymentId: string | null;
  invoiceId: string | null;
  billId: string | null;
  timeline: TransactionEvent[];
}

export const TransactionQuerySchema = z.object({
  q: z.string().trim().max(120).optional(),
  accountId: csvOf(z.string()),
  category: csvOf(z.enum(CATEGORY_IDS)),
  rail: csvOf(z.enum(RAILS)),
  status: csvOf(z.enum(TRANSACTION_STATUSES)),
  direction: z.enum(['in', 'out']).optional(),
  from: z.iso.date().optional(),
  to: z.iso.date().optional(),
  minAmount: z.coerce.number().int().nonnegative().optional(),
  maxAmount: z.coerce.number().int().nonnegative().optional(),
  cardId: z.string().optional(),
  sort: z.enum(['date', 'amount', 'counterparty']).default('date'),
  order: z.enum(['asc', 'desc']).default('desc'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(40),
});
export type TransactionQuery = z.infer<typeof TransactionQuerySchema>;

export interface TransactionPage extends Page<Transaction> {
  summary: { inflow: Cents; outflow: Cents; net: Cents };
}

export const UpdateTransactionSchema = z
  .object({
    category: z.enum(CATEGORY_IDS).optional(),
    memo: z.string().trim().max(280).nullable().optional(),
    tags: z.array(z.string().trim().min(1).max(32)).max(8).optional(),
    receipt: z.string().trim().max(120).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field' });
export type UpdateTransactionInput = z.infer<typeof UpdateTransactionSchema>;
