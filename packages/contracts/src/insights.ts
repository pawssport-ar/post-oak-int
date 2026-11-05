import { z } from 'zod';
import type { Cents, IsoDate } from './shared.js';
import type { CategoryId } from './transactions.js';

export const BALANCE_RANGES = ['30d', '90d', '1y'] as const;
export type BalanceRange = (typeof BALANCE_RANGES)[number];

export const SPENDING_PERIODS = ['30d', '90d', 'ytd'] as const;
export type SpendingPeriod = (typeof SPENDING_PERIODS)[number];

export interface OverviewSummary {
  totalCash: Cents;
  change30d: Cents;
  changePct30d: number;
  moneyIn30d: Cents;
  moneyOut30d: Cents;
  moneyInPrev30d: Cents;
  moneyOutPrev30d: Cents;
  net30d: Cents;
  daysCashOnHand: number;
  yieldEarnedYtd: Cents;
  pendingApprovals: { count: number; total: Cents };
  upcomingBills: { count: number; total: Cents; overdueCount: number };
  receivables: { outstanding: Cents; overdue: Cents };
}

export interface BalancePoint {
  date: IsoDate;
  balance: Cents;
  inflow: Cents;
  outflow: Cents;
}

export interface CashFlowMonth {
  /** `YYYY-MM` */
  month: string;
  label: string;
  inflow: Cents;
  outflow: Cents;
  net: Cents;
  /** True for the current, still-open month. */
  partial: boolean;
}

export interface CategorySpend {
  category: CategoryId;
  amount: Cents;
  share: number;
  previous: Cents;
  changePct: number | null;
}

export interface VendorSpend {
  name: string;
  amount: Cents;
  count: number;
  category: CategoryId;
}

export interface SpendingBreakdown {
  period: SpendingPeriod;
  total: Cents;
  previousTotal: Cents;
  categories: CategorySpend[];
  vendors: VendorSpend[];
}

export const ForecastQuerySchema = z.object({
  horizon: z.coerce.number().int().min(30).max(180).default(90),
  revenuePct: z.coerce.number().min(-50).max(50).default(0),
  expensePct: z.coerce.number().min(-50).max(50).default(0),
  collectionDelayDays: z.coerce.number().int().min(0).max(45).default(0),
  oneTimeOutflow: z.coerce.number().int().min(0).max(1_000_000_000).default(0),
});
export type ForecastQuery = z.infer<typeof ForecastQuerySchema>;

export interface ForecastPoint {
  date: IsoDate;
  expected: Cents;
  low: Cents;
  high: Cents;
}

export interface ForecastMilestone {
  date: IsoDate;
  label: string;
  amount: Cents;
}

export interface Forecast {
  start: Cents;
  end: Cents;
  lowest: { date: IsoDate; amount: Cents };
  /** Minimum operating cash the treasury policy wants to keep. */
  floor: Cents;
  breachesFloor: boolean;
  points: ForecastPoint[];
  milestones: ForecastMilestone[];
}

/** A suggestion to move idle operating cash into the interest-bearing reserve. */
export interface TreasurySweep {
  fromAccountId: string;
  fromAccountName: string;
  toAccountId: string;
  toAccountName: string;
  amount: Cents;
  annualYield: Cents;
  apyBps: number;
  /** Operating cash left behind, in days of average outflows. */
  bufferDays: number;
}

export interface SearchResults {
  transactions: { id: string; counterparty: string; amount: Cents; date: string }[];
  recipients: { id: string; name: string; type: string }[];
  invoices: { id: string; number: string; customer: string; total: Cents }[];
  cards: { id: string; nickname: string; last4: string }[];
}

export const AskSchema = z.object({ question: z.string().trim().min(2).max(240) });
export type AskInput = z.infer<typeof AskSchema>;

export interface AssistantAnswer {
  answer: string;
  facts: { label: string; value: string }[];
  link: { label: string; href: string } | null;
}
