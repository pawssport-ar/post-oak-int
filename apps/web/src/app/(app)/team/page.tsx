import type { Metadata } from 'next';
import { Suspense } from 'react';
import { TeamView } from '@/features/team/team-view';

export const metadata: Metadata = { title: 'Team & controls' };

export default function TeamPage() {
  return (
    <Suspense>
      <TeamView />
    </Suspense>
  );
}
