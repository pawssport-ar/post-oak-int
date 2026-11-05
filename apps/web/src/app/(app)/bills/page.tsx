import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PermissionGate } from '@/components/layout/permission-gate';
import { BillsView } from '@/features/bills/bills-view';

export const metadata: Metadata = { title: 'Bills' };

export default function BillsPage() {
  return (
    <Suspense>
      <PermissionGate permission="accounts:view">
        <BillsView />
      </PermissionGate>
    </Suspense>
  );
}
