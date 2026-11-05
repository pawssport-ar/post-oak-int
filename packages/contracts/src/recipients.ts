import { z } from 'zod';
import type { Cents, IsoDateTime } from './shared.js';
import type { CategoryId } from './transactions.js';

export const RECIPIENT_TYPES = ['vendor', 'contractor', 'employee', 'tax_authority'] as const;
export type RecipientType = (typeof RECIPIENT_TYPES)[number];

export const RECIPIENT_TYPE_LABELS: Record<RecipientType, string> = {
  vendor: 'Vendor',
  contractor: 'Contractor',
  employee: 'Employee',
  tax_authority: 'Tax authority',
};

export interface Recipient {
  id: string;
  name: string;
  type: RecipientType;
  email: string | null;
  bankName: string;
  routingNumber: string;
  accountLast4: string;
  defaultRail: 'ach' | 'wire';
  defaultCategory: CategoryId;
  createdAt: IsoDateTime;
  lastPaidAt: IsoDateTime | null;
  totalPaid: Cents;
  paymentCount: number;
  /** True until the first payment settles; drives the new-recipient approval policy. */
  isNew: boolean;
}

/** ABA routing numbers carry a weighted mod-10 checksum, so typos fail before submission. */
export function isValidRoutingNumber(value: string): boolean {
  if (!/^\d{9}$/.test(value)) return false;
  const digits = [...value].map(Number);
  const weights = [3, 7, 1, 3, 7, 1, 3, 7, 1];
  const total = digits.reduce((sum, digit, index) => sum + digit * (weights[index] ?? 0), 0);
  return total % 10 === 0;
}

export const CreateRecipientSchema = z.object({
  name: z.string().trim().min(2, 'Enter the legal name').max(80),
  type: z.enum(RECIPIENT_TYPES),
  email: z.email('Enter a valid email').optional().or(z.literal('')),
  routingNumber: z.string().refine(isValidRoutingNumber, 'This routing number failed its checksum'),
  accountNumber: z.string().regex(/^\d{4,17}$/, 'Account numbers are 4 to 17 digits'),
  defaultRail: z.enum(['ach', 'wire']).default('ach'),
});
export type CreateRecipientInput = z.infer<typeof CreateRecipientSchema>;
