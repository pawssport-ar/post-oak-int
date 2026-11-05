import type { Metadata } from 'next';
import { PermissionGate } from '@/components/layout/permission-gate';
import { CapitalView } from '@/features/capital/capital-view';

export const metadata: Metadata = { title: 'Capital' };

export default function CapitalPage() {
  return (
    <PermissionGate permission="insights:view">
      <CapitalView />
    </PermissionGate>
  );
}
