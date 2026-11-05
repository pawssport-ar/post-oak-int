import type { CapitalReadiness, Cents, PillarKey, ReadinessPillar } from '@post-oak/contracts';
import { clamp } from '../insights/analytics.js';

export interface ReadinessInputs {
  daysCashOnHand: number;
  /** Receipts in the latest six months against the six before, as a fraction. */
  revenueGrowth: number;
  /** Operating cash flow as a share of receipts over twelve months. */
  operatingMargin: number;
  /** Share of twelve-month receipts from the largest customer. */
  topCustomerShare: number;
  topCustomerName: string;
  averageDaysToPay: number;
}

const WEIGHTS: Record<PillarKey, number> = {
  liquidity: 0.2,
  growth: 0.2,
  margin: 0.25,
  concentration: 0.2,
  collections: 0.15,
};

const percent = (value: number) => `${(value * 100).toFixed(1)}%`;

/** Scores what a buyer or lender diligences first, using only banking data. */
export function scorePillars(input: ReadinessInputs): ReadinessPillar[] {
  return [
    {
      key: 'liquidity',
      label: 'Liquidity',
      score: Math.round(clamp((input.daysCashOnHand / 90) * 100)),
      value: `${input.daysCashOnHand} days`,
      target: '90 days of cash',
      insight:
        input.daysCashOnHand >= 90
          ? 'Reserves comfortably cover a quarter of operating costs.'
          : 'Build toward a full quarter of operating costs in reserve.',
    },
    {
      key: 'growth',
      label: 'Growth',
      score: Math.round(clamp(50 + input.revenueGrowth * 500)),
      value: percent(input.revenueGrowth),
      target: '10% half over half',
      insight:
        input.revenueGrowth >= 0.1
          ? 'Receipts are compounding at a rate investors reward.'
          : 'Steady, but a sharper growth story lifts the multiple.',
    },
    {
      key: 'margin',
      label: 'Cash margin',
      score: Math.round(clamp((input.operatingMargin / 0.12) * 100)),
      value: percent(input.operatingMargin),
      target: '12% of receipts',
      insight:
        input.operatingMargin >= 0.12
          ? 'Cash conversion is at institutional quality.'
          : 'Fuel and carrier costs are the clearest margin levers.',
    },
    {
      key: 'concentration',
      label: 'Diversification',
      score: Math.round(clamp(100 - (input.topCustomerShare - 0.1) * 330)),
      value: `${percent(input.topCustomerShare)} top customer`,
      target: 'Under 15%',
      insight:
        input.topCustomerShare <= 0.15
          ? 'No single customer dominates receipts.'
          : `${input.topCustomerName} is a diligence flag. Buyers discount concentration.`,
    },
    {
      key: 'collections',
      label: 'Collections',
      score: Math.round(clamp(100 - (input.averageDaysToPay - 30) * 3.2)),
      value: `${input.averageDaysToPay} days to pay`,
      target: '35 days',
      insight:
        input.averageDaysToPay <= 35
          ? 'Customers pay on time, which supports working-capital lines.'
          : 'Tighter terms free up cash and improve the quality of earnings.',
    },
  ];
}

export function overallScore(pillars: ReadinessPillar[]): number {
  return Math.round(pillars.reduce((sum, pillar) => sum + pillar.score * WEIGHTS[pillar.key], 0));
}

export function bandFor(score: number): CapitalReadiness['band'] {
  if (score >= 85) return 'Institutional';
  if (score >= 68) return 'Transaction ready';
  if (score >= 50) return 'Developing';
  return 'Foundational';
}

const HEADLINES: Record<CapitalReadiness['band'], string> = {
  Institutional: 'Your numbers already read like an institutional asset.',
  'Transaction ready': 'A credible story for capital, with two clear items to tighten first.',
  Developing: 'The foundations are there. A focused year changes the conversation.',
  Foundational: 'Start with cash discipline. The rest of the story follows from it.',
};

export const headlineFor = (band: CapitalReadiness['band']): string => HEADLINES[band];

/** Better readiness earns a better multiple. Indicative only. */
export function indicativeValuation(
  operatingCashTtm: Cents,
  score: number,
): CapitalReadiness['valuation'] {
  const lowMultiple = Math.round((4.5 + (score / 100) * 2) * 10) / 10;
  const highMultiple = Math.round((lowMultiple + 2) * 10) / 10;
  return {
    lowMultiple,
    highMultiple,
    low: Math.round(operatingCashTtm * lowMultiple),
    high: Math.round(operatingCashTtm * highMultiple),
  };
}
