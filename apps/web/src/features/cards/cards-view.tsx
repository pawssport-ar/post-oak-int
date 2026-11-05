'use client';

import {
  type Card,
  type CardSecrets,
  MERCHANT_GROUP_IDS,
  MERCHANT_GROUPS,
  type MerchantGroup,
  type UpdateCardInput,
} from '@post-oak/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowRight, Eye, EyeOff, Plus, Snowflake, Sun } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { parseAsBoolean, parseAsString, useQueryState } from 'nuqs';
import { useState } from 'react';
import { Amount } from '@/components/ui/amount';
import { Button } from '@/components/ui/button';
import { EmptyState, Slider, Switch } from '@/components/ui/controls';
import { PageHeader, Panel } from '@/components/ui/panel';
import { Reveal, RevealItem } from '@/components/ui/reveal';
import { RowsSkeleton, Skeleton } from '@/components/ui/skeleton';
import { toast, toastError } from '@/components/ui/toaster';
import { TransactionRow } from '@/features/transactions/transaction-row';
import { api, toQuery } from '@/lib/api/client';
import { revealCard, useCards } from '@/lib/api/queries';
import { cn } from '@/lib/cn';
import { money, moneyWhole } from '@/lib/format';
import { useCan } from '@/lib/use-permission';
import type { TransactionPage } from '@post-oak/contracts';
import { CardArt } from './card-art';
import { IssueCardDialog } from './issue-card-dialog';

const expiryOf = (card: Card) =>
  `${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}`;

function useCardMutations(card: Card) {
  const client = useQueryClient();
  const refresh = () => client.invalidateQueries({ queryKey: ['cards'] });

  const update = useMutation({
    mutationFn: (input: UpdateCardInput) =>
      api<Card>(`/cards/${card.id}`, { method: 'PATCH', body: input }),
    onMutate: async (input) => {
      await client.cancelQueries({ queryKey: ['cards'] });
      client.setQueryData<Card[]>(['cards'], (cards) =>
        cards?.map((item) =>
          item.id === card.id
            ? {
                ...item,
                limit: {
                  amount: input.limitAmount ?? item.limit.amount,
                  period: input.limitPeriod ?? item.limit.period,
                },
                controls: {
                  online: input.online ?? item.controls.online,
                  atm: input.atm ?? item.controls.atm,
                  international: input.international ?? item.controls.international,
                  blockedMerchants: input.blockedMerchants ?? item.controls.blockedMerchants,
                },
              }
            : item,
        ),
      );
    },
    onSettled: refresh,
    onError: toastError,
  });

  const setFrozen = useMutation({
    mutationFn: (frozen: boolean) =>
      api<Card>(`/cards/${card.id}/${frozen ? 'freeze' : 'unfreeze'}`, { method: 'POST' }),
    onSuccess: (next) => {
      void refresh();
      toast({
        title: next.status === 'frozen' ? 'Card frozen' : 'Card active',
        description:
          next.status === 'frozen'
            ? `New purchases on ${next.nickname} will be declined right away.`
            : `${next.nickname} can spend again.`,
        tone: 'positive',
      });
    },
    onError: toastError,
  });

  return { update, setFrozen };
}

function CardStage({ card }: { card: Card }) {
  const can = useCan();
  const { setFrozen } = useCardMutations(card);
  const [secrets, setSecrets] = useState<CardSecrets | null>(null);
  const frozen = card.status === 'frozen';

  const reveal = useMutation({
    mutationFn: () => revealCard(card.id),
    onSuccess: setSecrets,
    onError: toastError,
  });

  return (
    <div className="flex flex-col items-center gap-5">
      <AnimatePresence mode="wait">
        <motion.div
          key={card.id}
          className="w-full max-w-[400px] [container-type:inline-size]"
          initial={{ opacity: 0, y: 14, rotateX: 8 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
        >
          <CardArt
            design={card.design}
            kind={card.kind}
            nickname={card.nickname}
            holderName={card.holderName}
            last4={card.last4}
            expiry={secrets?.expiry ?? expiryOf(card)}
            frozen={frozen}
            number={secrets?.number}
            cvc={secrets?.cvc}
            tilt
          />
        </motion.div>
      </AnimatePresence>

      <div className="flex flex-wrap justify-center gap-2">
        <Button
          variant={frozen ? 'primary' : 'secondary'}
          loading={setFrozen.isPending}
          onClick={() => setFrozen.mutate(!frozen)}
        >
          {frozen ? <Sun /> : <Snowflake />}
          {frozen ? 'Unfreeze' : 'Freeze card'}
        </Button>
        <Button
          loading={reveal.isPending}
          onClick={() => (secrets ? setSecrets(null) : reveal.mutate())}
        >
          {secrets ? <EyeOff /> : <Eye />}
          {secrets ? 'Hide details' : 'Show details'}
        </Button>
      </div>
      {secrets && (
        <p className="text-center text-[12.5px] text-ink-3">
          Test number for the demo. {can('audit:view') ? 'This reveal is in the audit log.' : ''}
        </p>
      )}
    </div>
  );
}

function SpendMeter({ card }: { card: Card }) {
  const ratio = Math.min(1, card.spent / card.limit.amount);
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <p className="eyebrow">
          Spent this {card.limit.period.replace('ly', '').replace('dai', 'day')}
        </p>
        <p className="text-[13px] text-ink-3">
          of{' '}
          <span className="numeric font-semibold text-ink-2">{moneyWhole(card.limit.amount)}</span>
        </p>
      </div>
      <p className="mt-1 font-display text-[34px] leading-none text-ink">
        <Amount cents={card.spent} />
      </p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-accent-soft">
        <motion.div
          className={cn(
            'h-full origin-left rounded-full',
            ratio > 0.9 ? 'bg-negative' : ratio > 0.7 ? 'bg-warning' : 'bg-accent',
          )}
          initial={{ width: 0 }}
          animate={{ width: `${ratio * 100}%` }}
          transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
    </div>
  );
}

function ControlsPanel({ card }: { card: Card }) {
  const can = useCan();
  const canManage = can('cards:manage');
  const { update } = useCardMutations(card);
  const [draftLimit, setDraftLimit] = useState<number | null>(null);
  const limit = draftLimit ?? card.limit.amount;

  const sliderMax = Math.max(10_000_000, card.limit.amount * 2);
  const blocked = card.controls.blockedMerchants;
  const toggleMerchant = (group: MerchantGroup) => {
    update.mutate({
      blockedMerchants: blocked.includes(group)
        ? blocked.filter((item) => item !== group)
        : [...blocked, group],
    });
  };

  return (
    <div className="space-y-5">
      <SpendMeter card={card} />

      <div>
        <div className="mb-2 flex items-baseline justify-between">
          <label className="text-[13px] font-semibold text-ink-2">
            {card.limit.period[0]?.toUpperCase() + card.limit.period.slice(1)} limit
          </label>
          <span className="numeric text-[14px] font-bold text-ink">{moneyWhole(limit)}</span>
        </div>
        <Slider
          aria-label="Spend limit"
          disabled={!canManage}
          min={100_000}
          max={sliderMax}
          step={50_000}
          value={limit}
          onValueChange={setDraftLimit}
          onValueCommit={(limitAmount) => {
            setDraftLimit(null);
            update.mutate({ limitAmount });
            toast({
              title: 'Limit updated',
              description: `${card.nickname} can now spend ${money(limitAmount)} ${card.limit.period}.`,
              tone: 'positive',
            });
          }}
        />
      </div>

      <ul className="divide-y divide-line border-y border-line">
        {(
          [
            ['online', 'Online purchases'],
            ['international', 'International purchases'],
            ['atm', 'ATM withdrawals'],
          ] as const
        ).map(([key, label]) => (
          <li key={key} className="flex items-center justify-between py-2.5">
            <span className="text-[13.5px] font-semibold text-ink">{label}</span>
            <Switch
              aria-label={label}
              disabled={!canManage}
              checked={card.controls[key]}
              onCheckedChange={(value) => update.mutate({ [key]: value })}
            />
          </li>
        ))}
      </ul>

      <div>
        <p className="mb-2 text-[13px] font-semibold text-ink-2">Allowed merchants</p>
        <div className="flex flex-wrap gap-1.5">
          {MERCHANT_GROUP_IDS.map((group) => {
            const allowed = !blocked.includes(group);
            return (
              <button
                key={group}
                type="button"
                disabled={!canManage}
                aria-pressed={allowed}
                onClick={() => toggleMerchant(group)}
                className={cn(
                  'h-7 rounded-full border px-2.5 text-[12.5px] font-semibold transition-colors disabled:opacity-60',
                  allowed
                    ? 'border-accent bg-accent-soft text-accent-soft-ink'
                    : 'border-line text-ink-3 line-through hover:border-line-strong',
                )}
              >
                {MERCHANT_GROUPS[group]}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function CardActivity({ card }: { card: Card }) {
  const router = useRouter();
  const { data } = useQuery({
    queryKey: ['transactions', 'card', card.id],
    queryFn: () =>
      api<TransactionPage>(`/transactions${toQuery({ cardId: card.id, pageSize: 6 })}`),
  });

  return (
    <Panel className="overflow-hidden">
      <div className="flex items-center justify-between px-5 pt-4 pb-3">
        <h2 className="font-display text-[21px] text-ink">Recent spend</h2>
        <Link
          href={`/transactions?cardId=${card.id}`}
          className="group flex items-center gap-1 text-[13px] font-semibold text-ink-2 transition-colors hover:text-ink"
        >
          All activity
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
      {!data ? (
        <RowsSkeleton rows={4} />
      ) : data.items.length === 0 ? (
        <EmptyState title="No spend yet" description="Purchases on this card will appear here." />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {data.items.map((transaction) => (
            <li key={transaction.id}>
              <TransactionRow
                compact
                transaction={transaction}
                onOpen={(id) => router.push(`/transactions?id=${id}`)}
              />
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function CardsView() {
  const can = useCan();
  const { data: cards } = useCards();
  const [selectedId, setSelectedId] = useQueryState('card', parseAsString);
  const [issuing, setIssuing] = useQueryState('new', parseAsBoolean.withDefault(false));

  const selected = cards?.find((card) => card.id === selectedId) ?? cards?.[0];
  const canManage = can('cards:manage');

  return (
    <Reveal>
      <RevealItem>
        <PageHeader
          title="Cards"
          description="Issue physical and virtual debit cards with limits and controls per card."
          actions={
            canManage && (
              <Button variant="primary" onClick={() => void setIssuing(true)}>
                <Plus />
                Issue card
              </Button>
            )
          }
        />
      </RevealItem>

      {!cards ? (
        <Skeleton className="h-[520px] w-full rounded-xl" />
      ) : !selected ? (
        <Panel>
          <EmptyState title="No cards yet" description="Cards issued to you will appear here." />
        </Panel>
      ) : (
        <>
          <RevealItem className="mb-4">
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-0.5">
              {cards.map((card) => {
                const active = card.id === selected.id;
                return (
                  <button
                    key={card.id}
                    type="button"
                    aria-pressed={active}
                    onClick={() => void setSelectedId(card.id)}
                    className={cn(
                      'flex w-[210px] shrink-0 items-center gap-2.5 rounded-xl border bg-surface p-2 text-left transition-colors',
                      active
                        ? 'border-accent ring-1 ring-accent'
                        : 'border-line hover:border-line-strong',
                    )}
                  >
                    <span className="w-[58px] shrink-0">
                      <span
                        className={cn(
                          'block aspect-[1.586] rounded-[5px]',
                          card.design === 'oak' && 'bg-[#193e2c]',
                          card.design === 'graphite' && 'bg-[#231f20]',
                          card.design === 'ivory' && 'border border-line-strong bg-[#f0ead9]',
                          card.status === 'frozen' && 'opacity-50',
                        )}
                      />
                    </span>
                    <span className="min-w-0 leading-tight">
                      <span className="block truncate text-[13px] font-bold text-ink">
                        {card.nickname}
                      </span>
                      <span className="mt-0.5 block truncate text-[12px] text-ink-3">
                        ••{card.last4} · {card.status === 'frozen' ? 'Frozen' : card.holderName}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </RevealItem>

          <RevealItem className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <Panel className="relative overflow-hidden px-6 py-8">
                <div
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-2/3 bg-[radial-gradient(70%_100%_at_50%_0%,var(--accent-soft),transparent)]"
                />
                <div className="relative">
                  <CardStage key={selected.id} card={selected} />
                </div>
              </Panel>
              <CardActivity card={selected} />
            </div>
            <Panel className="h-fit px-5 py-5">
              <div className="mb-4">
                <h2 className="font-display text-[23px] leading-tight text-ink">
                  {selected.nickname}
                </h2>
                <p className="mt-0.5 text-[13px] text-ink-3">
                  {selected.holderName} · Draws on {selected.accountName}
                </p>
              </div>
              <ControlsPanel key={selected.id} card={selected} />
            </Panel>
          </RevealItem>
        </>
      )}

      {canManage && (
        <IssueCardDialog
          open={issuing}
          onOpenChange={(open) => void setIssuing(open ? true : null)}
          onIssued={(card) => void setSelectedId(card.id)}
        />
      )}
    </Reveal>
  );
}
