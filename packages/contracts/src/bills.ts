import { z } from 'zod';
import { positiveCentsSchema, type Cents, type IsoDate, type IsoDateTime } from './shared.js';
import { CATEGORY_IDS, type CategoryId } from './transactions.js';

export const BILL_STATUSES = ['awaiting_payment', 'scheduled', 'processing', 'paid'] as const;
export type BillStatus = (typeof BILL_STATUSES)[number];

export interface Bill {
  id: string;
  vendor: string;
  recipientId: string | null;
  invoiceNumber: string;
  amount: Cents;
  category: CategoryId;
  issuedOn: IsoDate;
  dueOn: IsoDate;
  status: BillStatus;
  isOverdue: boolean;
  scheduledFor: IsoDate | null;
  paidAt: IsoDateTime | null;
  paymentId: string | null;
  note: string | null;
}

export const PayBillSchema = z.object({
  accountId: z.string().min(1),
  rail: z.enum(['ach', 'wire']),
  payOn: z.iso.date().optional(),
});
export type PayBillInput = z.infer<typeof PayBillSchema>;

export const CreateBillSchema = z.object({
  vendor: z.string().trim().min(2, 'Enter the vendor').max(80),
  invoiceNumber: z.string().trim().min(1, 'Enter the invoice number').max(40),
  amount: positiveCentsSchema,
  category: z.enum(CATEGORY_IDS),
  dueOn: z.iso.date(),
  note: z.string().trim().max(200).optional(),
});
export type CreateBillInput = z.infer<typeof CreateBillSchema>;
