import type { Cents, PaymentRail } from '@post-oak/contracts';
import { addDays, centralHour, isWeekend, nextBusinessDay } from '../../common/time.js';

export const RAIL_FEES: Record<PaymentRail, Cents> = {
  ach: 0,
  wire: 2_500,
  rtp: 150,
  book: 0,
};

/** Fedwire cut-off, and the last same-day ACH window. Central Time. */
const WIRE_CUTOFF_HOUR = 16;
const ACH_CUTOFF_HOUR = 18;

export interface ArrivalEstimate {
  at: Date;
  label: string;
  cutoffLabel: string | null;
  afterCutoff: boolean;
}

/** Works out when funds arrive, honouring weekends and network cut-offs. */
export function estimateArrival(rail: PaymentRail, submittedAt: Date): ArrivalEstimate {
  if (rail === 'book') {
    return { at: submittedAt, label: 'Immediately', cutoffLabel: null, afterCutoff: false };
  }
  if (rail === 'rtp') {
    return { at: submittedAt, label: 'Within seconds', cutoffLabel: null, afterCutoff: false };
  }

  const hour = centralHour(submittedAt);
  const closed = isWeekend(submittedAt);

  if (rail === 'wire') {
    const afterCutoff = closed || hour >= WIRE_CUTOFF_HOUR;
    const at = afterCutoff ? nextBusinessDay(submittedAt) : submittedAt;
    return {
      at,
      label: afterCutoff ? 'Next business day' : 'Today',
      cutoffLabel: 'Same-day wires close at 4:00 PM CT',
      afterCutoff,
    };
  }

  const afterCutoff = closed || hour >= ACH_CUTOFF_HOUR;
  const firstDay = afterCutoff ? nextBusinessDay(submittedAt) : submittedAt;
  return {
    at: nextBusinessDay(firstDay),
    label: afterCutoff ? '2 business days' : 'Next business day',
    cutoffLabel: 'ACH batches close at 6:00 PM CT',
    afterCutoff,
  };
}

/** A payment scheduled ahead of time arrives one settlement cycle after its send date. */
export function estimateScheduledArrival(rail: PaymentRail, sendDate: Date): Date {
  return rail === 'ach' ? nextBusinessDay(sendDate) : addDays(sendDate, 0);
}
