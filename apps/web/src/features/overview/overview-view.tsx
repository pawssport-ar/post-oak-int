'use client';

import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Reveal, RevealItem } from '@/components/ui/reveal';
import { SweepCard } from '@/features/accounts/sweep-card';
import { useSession } from '@/lib/api/queries';
import { greeting } from '@/lib/format';
import { useMounted } from '@/lib/use-mounted';
import { AttentionPanel } from './attention-panel';
import { CapitalTeaser } from './capital-teaser';
import { CashFlowPanel, SpendingPanel } from './cash-flow-panel';
import { HeroPanel } from './hero-panel';
import { RecentActivity } from './recent-activity';
import { StatTiles } from './stat-tiles';

function Greeting() {
  const { data: session } = useSession();
  const now = useMounted() ? new Date() : null;

  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-1">
      <h1 className="font-display text-[34px] leading-[1.1] tracking-[-0.01em] text-ink">
        {now && session ? `${greeting(now)}, ${session.user.name.split(' ')[0]}` : ' '}
      </h1>
      <p className="text-[13.5px] text-ink-3">
        {session?.company.legalName}
        {now ? ` · ${format(now, 'EEEE, MMMM d')}` : ''}
      </p>
    </div>
  );
}

export function OverviewView() {
  const router = useRouter();
  const { data: session } = useSession();
  const restricted = session && !session.permissions.includes('accounts:view');

  useEffect(() => {
    if (restricted) router.replace('/cards');
  }, [restricted, router]);

  if (restricted) return null;

  return (
    <Reveal className="space-y-4">
      <RevealItem>
        <Greeting />
      </RevealItem>
      <RevealItem>
        <HeroPanel />
      </RevealItem>
      <RevealItem>
        <StatTiles />
      </RevealItem>
      <RevealItem className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <AttentionPanel />
        <CapitalTeaser />
      </RevealItem>
      <RevealItem>
        <SweepCard />
      </RevealItem>
      <RevealItem className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(0,1fr)]">
        <CashFlowPanel />
        <SpendingPanel />
      </RevealItem>
      <RevealItem>
        <RecentActivity />
      </RevealItem>
    </Reveal>
  );
}
