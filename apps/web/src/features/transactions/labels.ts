import type { TransactionStatus } from '@post-oak/contracts';
import type { Tone } from '@/components/ui/status-pill';

export const TRANSACTION_STATUS_TONE: Record<TransactionStatus, Tone> = {
  pending: 'warning',
  posted: 'neutral',
  failed: 'negative',
  returned: 'negative',
};

export const TRANSACTION_STATUS_LABEL: Record<TransactionStatus, string> = {
  pending: 'Pending',
  posted: 'Posted',
  failed: 'Failed',
  returned: 'Returned',
};
