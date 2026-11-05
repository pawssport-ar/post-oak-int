import { z } from 'zod';
import { positiveCentsSchema, type Cents, type IsoDate, type IsoDateTime } from './shared.js';

export const PAYMENT_RAILS = ['ach', 'wire', 'rtp', 'book'] as const;
export type PaymentRail = (typeof PAYMENT_RAILS)[number];

export const PAYMENT_STATUSES = [
  'pending_approval',
  'scheduled',
  'processing',
  'in_transit',
  'settled',
  'rejected',
  'canceled',
  'failed',
] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending_approval: 'Needs approval',
  scheduled: 'Scheduled',
  processing: 'Processing',
  in_transit: 'In transit',
  settled: 'Settled',
  rejected: 'Rejected',
  canceled: 'Canceled',
  failed: 'Failed',
};

export interface PaymentDestination {
  type: 'recipient' | 'account';
  id: string;
  name: string;
  bankName: string;
  last4: string;
}

export interface PaymentDecision {
  userId: string;
  userName: string;
  decision: 'approved' | 'rejected';
  at: IsoDateTime;
  note: string | null;
}

export interface PaymentEvent {
  status: PaymentStatus | 'created';
  label: string;
  at: IsoDateTime;
  actor: string | null;
}

export interface Payment {
  id: string;
  reference: string;
  fromAccountId: string;
  fromAccountName: string;
  fromLast4: string;
  destination: PaymentDestination;
  rail: PaymentRail;
  amount: Cents;
  fee: Cents;
  memo: string | null;
  status: PaymentStatus;
  scheduledFor: IsoDate | null;
  estimatedArrival: IsoDateTime;
  createdAt: IsoDateTime;
  createdById: string;
  createdByName: string;
  /** Approvals required beyond the initiator. */
  requiredApprovals: number;
  decisions: PaymentDecision[];
  policyName: string | null;
  billId: string | null;
  timeline: PaymentEvent[];
}

const destinationSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('recipient'), recipientId: z.string().min(1) }),
  z.object({ type: z.literal('account'), accountId: z.string().min(1) }),
]);

export const CreatePaymentSchema = z.object({
  fromAccountId: z.string().min(1),
  destination: destinationSchema,
  rail: z.enum(PAYMENT_RAILS),
  amount: positiveCentsSchema,
  memo: z.string().trim().max(140).optional(),
  scheduledFor: z.iso.date().optional(),
});
export type CreatePaymentInput = z.infer<typeof CreatePaymentSchema>;

export const PaymentDecisionSchema = z.object({
  note: z.string().trim().max(200).optional(),
});
export type PaymentDecisionInput = z.infer<typeof PaymentDecisionSchema>;

export interface QuoteWarning {
  code: 'insufficient_funds' | 'after_cutoff' | 'new_recipient' | 'large_amount' | 'low_balance';
  severity: 'info' | 'warning' | 'blocking';
  message: string;
}

/** Server-side preview of a payment, shown on the review step before anything is submitted. */
export interface PaymentQuote {
  fee: Cents;
  estimatedArrival: IsoDateTime;
  arrivalLabel: string;
  cutoffLabel: string | null;
  requiresApproval: boolean;
  requiredApprovals: number;
  policyName: string | null;
  approverNames: string[];
  availableAfter: Cents;
  warnings: QuoteWarning[];
}
