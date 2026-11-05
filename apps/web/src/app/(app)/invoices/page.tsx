import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PermissionGate } from '@/components/layout/permission-gate';
import { InvoicesView } from '@/features/invoices/invoices-view';

export const metadata: Metadata = { title: 'Invoices' };

export default function InvoicesPage() {
  return (
    <Suspense>
      <PermissionGate permission="accounts:view">
        <InvoicesView />
      </PermissionGate>
    </Suspense>
  );
}
