import { bandFor, indicativeValuation, overallScore, scorePillars } from './readiness.js';

const healthy = {
  daysCashOnHand: 95,
  revenueGrowth: 0.12,
  operatingMargin: 0.14,
  topCustomerShare: 0.12,
  topCustomerName: 'Acme',
  averageDaysToPay: 32,
};

describe('capital readiness', () => {
  it('scores a strong business as institutional', () => {
    const score = overallScore(scorePillars(healthy));
    expect(score).toBeGreaterThanOrEqual(85);
    expect(bandFor(score)).toBe('Institutional');
  });

  it('keeps every pillar between 0 and 100', () => {
    const pillars = scorePillars({
      ...healthy,
      daysCashOnHand: 400,
      revenueGrowth: -0.9,
      topCustomerShare: 0.9,
      averageDaysToPay: 200,
    });
    for (const pillar of pillars) {
      expect(pillar.score).toBeGreaterThanOrEqual(0);
      expect(pillar.score).toBeLessThanOrEqual(100);
    }
  });

  it('flags concentration by name when one customer dominates', () => {
    const pillars = scorePillars({ ...healthy, topCustomerShare: 0.4 });
    const concentration = pillars.find((pillar) => pillar.key === 'concentration');
    expect(concentration?.insight).toContain('Acme');
    expect(concentration?.score).toBeLessThan(10);
  });

  it('rewards readiness with a higher multiple', () => {
    const weak = indicativeValuation(100_000_000, 40);
    const strong = indicativeValuation(100_000_000, 90);
    expect(strong.lowMultiple).toBeGreaterThan(weak.lowMultiple);
    expect(strong.high).toBeGreaterThan(weak.high);
  });
});
