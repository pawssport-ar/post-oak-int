import { z } from 'zod';
import { positiveCentsSchema, type Cents, type IsoDateTime } from './shared.js';

export const CARD_KINDS = ['physical', 'virtual'] as const;
export type CardKind = (typeof CARD_KINDS)[number];

export const CARD_STATUSES = ['active', 'frozen', 'canceled'] as const;
export type CardStatus = (typeof CARD_STATUSES)[number];

export const CARD_DESIGNS = ['oak', 'graphite', 'ivory'] as const;
export type CardDesign = (typeof CARD_DESIGNS)[number];

export const LIMIT_PERIODS = ['daily', 'weekly', 'monthly'] as const;
export type LimitPeriod = (typeof LIMIT_PERIODS)[number];

export const MERCHANT_GROUPS = {
  fuel: 'Fuel stations',
  fleet: 'Fleet & auto parts',
  travel: 'Airlines & hotels',
  dining: 'Restaurants',
  software: 'Software & SaaS',
  retail: 'General retail',
  cash: 'Cash-like & gambling',
} as const;
export type MerchantGroup = keyof typeof MERCHANT_GROUPS;
export const MERCHANT_GROUP_IDS = Object.keys(MERCHANT_GROUPS) as [
  MerchantGroup,
  ...MerchantGroup[],
];

export interface CardControls {
  online: boolean;
  atm: boolean;
  international: boolean;
  blockedMerchants: MerchantGroup[];
}

export interface Card {
  id: string;
  nickname: string;
  kind: CardKind;
  design: CardDesign;
  status: CardStatus;
  holderId: string;
  holderName: string;
  accountId: string;
  accountName: string;
  last4: string;
  expMonth: number;
  expYear: number;
  limit: { amount: Cents; period: LimitPeriod };
  /** Spend inside the current limit window. */
  spent: Cents;
  controls: CardControls;
  createdAt: IsoDateTime;
  lastUsedAt: IsoDateTime | null;
}

export interface CardSecrets {
  cardId: string;
  number: string;
  cvc: string;
  expiry: string;
}

export const IssueCardSchema = z.object({
  nickname: z.string().trim().min(2, 'Give the card a name').max(40),
  kind: z.enum(CARD_KINDS),
  design: z.enum(CARD_DESIGNS).default('oak'),
  holderId: z.string().min(1),
  accountId: z.string().min(1),
  limitAmount: positiveCentsSchema,
  limitPeriod: z.enum(LIMIT_PERIODS),
});
export type IssueCardInput = z.infer<typeof IssueCardSchema>;

export const UpdateCardSchema = z
  .object({
    nickname: z.string().trim().min(2).max(40).optional(),
    limitAmount: positiveCentsSchema.optional(),
    limitPeriod: z.enum(LIMIT_PERIODS).optional(),
    online: z.boolean().optional(),
    atm: z.boolean().optional(),
    international: z.boolean().optional(),
    blockedMerchants: z.array(z.enum(MERCHANT_GROUP_IDS)).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field' });
export type UpdateCardInput = z.infer<typeof UpdateCardSchema>;
