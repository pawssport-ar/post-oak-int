import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PermissionGate } from '@/components/layout/permission-gate';
import { PaymentsView } from '@/features/payments/payments-view';

export const metadata: Metadata = { title: 'Payments' };

export default function PaymentsPage() {
  return (
    <Suspense>
      <PermissionGate permission="accounts:view">
        <PaymentsView />
      </PermissionGate>
    </Suspense>
  );
}
