import { Injectable } from '@nestjs/common';
import type { Payment, PaymentRail } from '@post-oak/contracts';
import type { Workspace } from '../core/workspace/workspace.js';
import type { BaasEvent, BaasEventHandler, BaasProvider } from './baas.port.js';

/** Network latency, compressed from days to seconds so the lifecycle is visible in a demo. */
const SETTLEMENT_MS: Record<PaymentRail, { inTransit: number; settled: number }> = {
  book: { inTransit: 300, settled: 900 },
  rtp: { inTransit: 800, settled: 2_500 },
  wire: { inTransit: 2_500, settled: 7_000 },
  ach: { inTransit: 3_000, settled: 10_000 },
};

@Injectable()
export class MockBaasProvider implements BaasProvider {
  readonly name = 'mock-baas';
  private handler: BaasEventHandler = () => undefined;

  onEvent(handler: BaasEventHandler): void {
    this.handler = handler;
  }

  submitPayment(workspace: Workspace, payment: Payment): void {
    const timing = SETTLEMENT_MS[payment.rail];
    this.emitAfter(workspace, timing.inTransit, {
      type: 'payment.in_transit',
      paymentId: payment.id,
    });
    this.emitAfter(workspace, timing.settled, { type: 'payment.settled', paymentId: payment.id });
  }

  private emitAfter(workspace: Workspace, delayMs: number, event: BaasEvent): void {
    const timer = setTimeout(() => {
      workspace.timers.delete(timer);
      this.handler(workspace, event);
    }, delayMs);
    workspace.timers.add(timer);
  }
}
