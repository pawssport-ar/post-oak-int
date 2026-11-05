import { z } from 'zod';
import type { Cents, IsoDateTime } from './shared.js';

export const PILLAR_KEYS = [
  'liquidity',
  'growth',
  'margin',
  'concentration',
  'collections',
] as const;
export type PillarKey = (typeof PILLAR_KEYS)[number];

export interface ReadinessPillar {
  key: PillarKey;
  label: string;
  /** 0 to 100. */
  score: number;
  value: string;
  target: string;
  insight: string;
}

export interface Advisor {
  name: string;
  initials: string;
  title: string;
  practice: string;
}

export const ADVISORY_TOPICS = {
  growth_capital: 'Raise growth capital',
  debt_financing: 'Explore debt financing',
  sell_side: 'Prepare for a sale',
  acquisition: 'Pursue an acquisition',
} as const;
export type AdvisoryTopic = keyof typeof ADVISORY_TOPICS;
export const ADVISORY_TOPIC_IDS = Object.keys(ADVISORY_TOPICS) as [
  AdvisoryTopic,
  ...AdvisoryTopic[],
];

export interface AdvisoryRequest {
  id: string;
  topic: AdvisoryTopic;
  note: string | null;
  createdAt: IsoDateTime;
  status: 'received';
}

export interface CapitalReadiness {
  score: number;
  band: 'Foundational' | 'Developing' | 'Transaction ready' | 'Institutional';
  headline: string;
  pillars: ReadinessPillar[];
  history: { month: string; label: string; score: number }[];
  /** Trailing twelve-month operating cash flow, a proxy until financials are linked. */
  operatingCashTtm: Cents;
  revenueTtm: Cents;
  valuation: {
    lowMultiple: number;
    highMultiple: number;
    low: Cents;
    high: Cents;
  };
  advisor: Advisor;
  requests: AdvisoryRequest[];
}

export const CreateAdvisoryRequestSchema = z.object({
  topic: z.enum(ADVISORY_TOPIC_IDS),
  note: z.string().trim().max(400).optional(),
});
export type CreateAdvisoryRequestInput = z.infer<typeof CreateAdvisoryRequestSchema>;
