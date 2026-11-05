import { z } from 'zod';
import { positiveCentsSchema, type Cents, type IsoDate, type IsoDateTime } from './shared.js';

export const INVOICE_STATUSES = ['draft', 'sent', 'viewed', 'paid', 'void'] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export interface InvoiceLine {
  description: string;
  quantity: number;
  unitPrice: Cents;
}

export interface Invoice {
  id: string;
  number: string;
  customer: string;
  customerEmail: string;
  lines: InvoiceLine[];
  subtotal: Cents;
  tax: Cents;
  total: Cents;
  issuedOn: IsoDate;
  dueOn: IsoDate;
  status: InvoiceStatus;
  isOverdue: boolean;
  daysOverdue: number;
  paidAt: IsoDateTime | null;
  lastReminderAt: IsoDateTime | null;
  memo: string | null;
}

export interface AgingBucket {
  key: 'current' | '1-30' | '31-60' | '61-90' | '90+';
  label: string;
  amount: Cents;
  count: number;
}

export interface ReceivablesSummary {
  outstanding: Cents;
  overdue: Cents;
  paidLast30d: Cents;
  /** Average days from issue to payment across the trailing 90 days. */
  averageDaysToPay: number;
  aging: AgingBucket[];
}

export const CreateInvoiceSchema = z.object({
  customer: z.string().trim().min(2, 'Enter the customer').max(80),
  customerEmail: z.email('Enter a valid email'),
  dueOn: z.iso.date(),
  taxRateBps: z.number().int().min(0).max(2000).default(0),
  memo: z.string().trim().max(280).optional(),
  lines: z
    .array(
      z.object({
        description: z.string().trim().min(1, 'Describe the line').max(120),
        quantity: z.number().positive().max(100_000),
        unitPrice: positiveCentsSchema,
      }),
    )
    .min(1, 'Add at least one line'),
  send: z.boolean().default(true),
});
export type CreateInvoiceInput = z.infer<typeof CreateInvoiceSchema>;
