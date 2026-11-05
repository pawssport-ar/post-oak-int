import type { Metadata } from 'next';
import { PermissionGate } from '@/components/layout/permission-gate';
import { InsightsView } from '@/features/insights/insights-view';

export const metadata: Metadata = { title: 'Insights' };

export default function InsightsPage() {
  return (
    <PermissionGate permission="insights:view">
      <InsightsView />
    </PermissionGate>
  );
}
