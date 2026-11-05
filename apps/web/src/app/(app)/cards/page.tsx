import type { Metadata } from 'next';
import { Suspense } from 'react';
import { CardsView } from '@/features/cards/cards-view';

export const metadata: Metadata = { title: 'Cards' };

export default function CardsPage() {
  return (
    <Suspense>
      <CardsView />
    </Suspense>
  );
}
