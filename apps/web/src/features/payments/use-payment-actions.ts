'use client';

import type { Payment } from '@post-oak/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast, toastError } from '@/components/ui/toaster';
import { api } from '@/lib/api/client';
import { money } from '@/lib/format';

/** Approve, reject and cancel, with the invalidation every surface relies on. */
export function usePaymentDecision() {
  const client = useQueryClient();
  const refresh = () => {
    for (const key of ['payments', 'overview', 'transactions', 'accounts', 'bills']) {
      void client.invalidateQueries({ queryKey: [key] });
    }
  };

  const approve = useMutation({
    mutationFn: (id: string) =>
      api<Payment>(`/payments/${id}/approve`, { method: 'POST', body: {} }),
    onSuccess: (payment) => {
      refresh();
      toast({
        title: 'Payment approved',
        description: `${money(payment.amount)} to ${payment.destination.name} is on its way.`,
        tone: 'positive',
      });
    },
    onError: toastError,
  });

  const reject = useMutation({
    mutationFn: (id: string) =>
      api<Payment>(`/payments/${id}/reject`, { method: 'POST', body: {} }),
    onSuccess: (payment) => {
      refresh();
      toast({
        title: 'Payment rejected',
        description: `${payment.createdByName} will be notified.`,
      });
    },
    onError: toastError,
  });

  const cancel = useMutation({
    mutationFn: (id: string) => api<Payment>(`/payments/${id}/cancel`, { method: 'POST' }),
    onSuccess: () => {
      refresh();
      toast({ title: 'Payment canceled' });
    },
    onError: toastError,
  });

  return { approve, reject, cancel };
}
