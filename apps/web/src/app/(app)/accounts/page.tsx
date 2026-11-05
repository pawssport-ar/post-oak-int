import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PermissionGate } from '@/components/layout/permission-gate';
import { AccountsView } from '@/features/accounts/accounts-view';

export const metadata: Metadata = { title: 'Accounts' };

export default function AccountsPage() {
  return (
    <Suspense>
      <PermissionGate permission="accounts:view">
        <AccountsView />
      </PermissionGate>
    </Suspense>
  );
}
