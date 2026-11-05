import type { ApprovalPolicy, Cents, PaymentRail, Recipient } from '@post-oak/contracts';

export interface PolicyDecision {
  requiredApprovals: number;
  policy: ApprovalPolicy | null;
}

/**
 * Decides whether a payment needs a second person. The strictest matching policy
 * wins, and transfers between the company's own accounts are always exempt.
 */
export function evaluatePolicies(
  policies: ApprovalPolicy[],
  rail: PaymentRail,
  amount: Cents,
  recipient: Recipient | null,
): PolicyDecision {
  if (rail === 'book') return { requiredApprovals: 0, policy: null };

  const matching = policies.filter((policy) => {
    if (!policy.enabled || !policy.rails.includes(rail)) return false;
    if (policy.onlyNewRecipients && !recipient?.isNew) return false;
    return amount >= policy.threshold;
  });

  const strictest = [...matching].sort((a, b) => b.approvalsRequired - a.approvalsRequired)[0];
  return { requiredApprovals: strictest?.approvalsRequired ?? 0, policy: strictest ?? null };
}
