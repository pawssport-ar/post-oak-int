import type { Payment } from '@post-oak/contracts';
import type { Workspace } from '../core/workspace/workspace.js';

/**
 * The boundary between Post Oak and its banking-as-a-service provider. The domain
 * layer only ever talks to this port, so moving from the mock to a real provider
 * means writing one adapter and registering it in `BaasModule`.
 */
export interface BaasProvider {
  readonly name: string;
  /** Submits an approved payment to the network. Status changes arrive as events. */
  submitPayment(workspace: Workspace, payment: Payment): void;
  /** Registers the consumer of provider events, the equivalent of a webhook endpoint. */
  onEvent(handler: BaasEventHandler): void;
}

export const BAAS_PROVIDER = Symbol('BAAS_PROVIDER');

export type BaasEvent =
  | { type: 'payment.in_transit'; paymentId: string }
  | { type: 'payment.settled'; paymentId: string };

export type BaasEventHandler = (workspace: Workspace, event: BaasEvent) => void;
