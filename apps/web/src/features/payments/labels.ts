import type { PaymentRail, PaymentStatus } from '@post-oak/contracts';
import type { Tone } from '@/components/ui/status-pill';

export const PAYMENT_STATUS_TONE: Record<PaymentStatus, Tone> = {
  pending_approval: 'warning',
  scheduled: 'info',
  processing: 'info',
  in_transit: 'info',
  settled: 'positive',
  rejected: 'negative',
  canceled: 'neutral',
  failed: 'negative',
};

export const RAIL_TITLES: Record<PaymentRail, string> = {
  ach: 'ACH Transfer',
  wire: 'Wire Transfer',
  rtp: 'Instant Payment',
  book: 'Internal Transfer',
};

export const RAIL_OPTIONS: {
  rail: Exclude<PaymentRail, 'book'>;
  title: string;
  speed: string;
  fee: string;
}[] = [
  { rail: 'ach', title: 'ACH', speed: 'Next business day', fee: 'Free' },
  { rail: 'wire', title: 'Wire', speed: 'Same day before 4 PM CT', fee: '$25.00' },
  { rail: 'rtp', title: 'Instant', speed: 'Within seconds, 24/7', fee: '$1.50' },
];
