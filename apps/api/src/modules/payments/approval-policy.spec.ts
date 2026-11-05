import type { ApprovalPolicy, Recipient } from '@post-oak/contracts';
import { POLICIES } from '../../seed/catalog.js';
import { evaluatePolicies } from './approval-policy.js';

const known = { isNew: false } as Recipient;
const fresh = { isNew: true } as Recipient;

describe('evaluatePolicies', () => {
  it('lets a small wire to a known recipient through', () => {
    const decision = evaluatePolicies(POLICIES, 'wire', 2_499_999, known);
    expect(decision.requiredApprovals).toBe(0);
  });

  it('requires a second person at the wire threshold', () => {
    const decision = evaluatePolicies(POLICIES, 'wire', 2_500_000, known);
    expect(decision.requiredApprovals).toBe(1);
    expect(decision.policy?.id).toBe('pol_wire');
  });

  it('applies a separate threshold to ACH', () => {
    expect(evaluatePolicies(POLICIES, 'ach', 4_000_000, known).requiredApprovals).toBe(0);
    expect(evaluatePolicies(POLICIES, 'ach', 5_000_000, known).requiredApprovals).toBe(1);
  });

  it('reviews the first payment to a new recipient, whatever the amount', () => {
    const decision = evaluatePolicies(POLICIES, 'ach', 100, fresh);
    expect(decision.requiredApprovals).toBe(1);
    expect(decision.policy?.id).toBe('pol_new_recipient');
  });

  it('exempts transfers between the company’s own accounts', () => {
    const decision = evaluatePolicies(POLICIES, 'book', 100_000_000, null);
    expect(decision.requiredApprovals).toBe(0);
  });

  it('ignores disabled policies', () => {
    const disabled: ApprovalPolicy[] = POLICIES.map((p) => ({ ...p, enabled: false }));
    expect(evaluatePolicies(disabled, 'wire', 90_000_000, fresh).requiredApprovals).toBe(0);
  });
});
