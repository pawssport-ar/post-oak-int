'use client';

import {
  ADVISORY_TOPICS,
  type AdvisoryRequest,
  type AdvisoryTopic,
  type CapitalReadiness,
  type CreateAdvisoryRequestInput,
  type PillarKey,
} from '@post-oak/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowUpRight, Building2, CheckCircle2, Coins, Handshake, Landmark } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useState } from 'react';
import { Sparkline } from '@/components/charts/sparkline';
import { Portico } from '@/components/charts/portico';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Field, TextArea } from '@/components/ui/field';
import { Monogram } from '@/components/ui/monogram';
import { Panel, PanelHeader } from '@/components/ui/panel';
import { Reveal, RevealItem } from '@/components/ui/reveal';
import { Skeleton } from '@/components/ui/skeleton';
import { toastError } from '@/components/ui/toaster';
import { api } from '@/lib/api/client';
import { useCapital } from '@/lib/api/queries';
import { cn } from '@/lib/cn';
import { moneyCompact } from '@/lib/format';

const PATHS: {
  topic: AdvisoryTopic;
  icon: typeof Coins;
  practice: string;
  body: string;
}[] = [
  {
    topic: 'growth_capital',
    icon: Coins,
    practice: 'Capital Markets',
    body: 'Private placements and growth equity, placed with family offices and funds.',
  },
  {
    topic: 'debt_financing',
    icon: Landmark,
    practice: 'Capital Markets',
    body: 'Senior debt and private credit, structured around your cash flows.',
  },
  {
    topic: 'sell_side',
    icon: Handshake,
    practice: 'Mergers & Acquisitions',
    body: 'A sell-side process that starts with getting the numbers diligence-ready.',
  },
  {
    topic: 'acquisition',
    icon: Building2,
    practice: 'Mergers & Acquisitions',
    body: 'Buy-side search and execution for a strategic add-on.',
  },
];

/** Figures as published on postoakgroup.co. */
const FIRM_FACTS = [
  { value: '$82.2B', label: 'Total transactions' },
  { value: '300+', label: 'Team members globally' },
  { value: '12', label: 'Countries of operation' },
  { value: '250+', label: 'Years of combined leadership experience' },
];

function ReadinessHero({ data }: { data: CapitalReadiness }) {
  const [active, setActive] = useState<PillarKey | null>(null);
  const focused = data.pillars.find((pillar) => pillar.key === active);

  return (
    <section className="relative isolate overflow-hidden rounded-2xl bg-oak-800 text-white shadow-card dark:bg-[#12291d]">
      <div
        aria-hidden
        className="flutes absolute inset-0 -z-10 [mask-image:linear-gradient(100deg,transparent_12%,black_75%)]"
      />
      <div
        aria-hidden
        className="absolute -bottom-40 -left-24 -z-10 size-[420px] rounded-full bg-oak-500/25 blur-[90px]"
      />
      <div className="grid gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.15fr)] lg:items-center">
        <div>
          <p className="text-[12px] font-bold tracking-[0.1em] text-white/60 uppercase">
            Capital readiness
          </p>
          <h1 className="mt-3 font-display text-[36px] leading-[1.12] tracking-[-0.01em] sm:text-[42px]">
            {data.headline}
          </h1>
          <div className="mt-6 flex flex-wrap items-end gap-x-6 gap-y-2">
            <p className="font-display leading-none whitespace-nowrap">
              <AnimatedNumber
                value={data.score}
                format={(value) => String(Math.round(value))}
                duration={1.4}
                className="numeric text-[72px]"
              />
              <span className="text-[24px] text-white/55"> /100</span>
            </p>
            <div className="pb-2">
              <p className="text-[15px] font-bold text-brass-300">{data.band}</p>
              <div className="mt-1 flex items-center gap-2 text-[12.5px] text-white/60">
                <Sparkline
                  values={data.history.map((point) => point.score)}
                  width={64}
                  height={20}
                  className="text-brass-300"
                />
                +{(data.history.at(-1)?.score ?? 0) - (data.history[0]?.score ?? 0)} in six months
              </div>
            </div>
          </div>
          <p className="mt-5 max-w-md text-[14px] leading-relaxed text-white/70">
            Your bank data already answers the questions a buyer or lender asks first. This view
            reads it the way a Post Oak deal team would.
          </p>
        </div>

        <div>
          <Portico
            pillars={data.pillars}
            tone="dark"
            active={active}
            onActiveChange={setActive}
            className="mx-auto max-w-[520px]"
          />
          <ul className="mx-auto mt-2 grid max-w-[520px] grid-cols-5 gap-1 text-center">
            {data.pillars.map((pillar) => (
              <li key={pillar.key}>
                <p className="numeric font-display text-[22px] leading-none">{pillar.score}</p>
                <p className="mt-1 text-[11px] leading-tight font-semibold text-white/60">
                  {pillar.label}
                </p>
              </li>
            ))}
          </ul>
          <div className="mx-auto mt-3 min-h-[44px] max-w-[520px] border-t border-white/12 pt-2.5 text-[13px] text-white/75">
            <AnimatePresence mode="wait" initial={false}>
              <motion.p
                key={focused?.key ?? 'hint'}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              >
                {focused ? (
                  <>
                    <strong className="text-white">{focused.value}.</strong> {focused.insight}
                  </>
                ) : (
                  'Hover a pillar to see what is holding it up.'
                )}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </section>
  );
}

function PillarsTable({ data }: { data: CapitalReadiness }) {
  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        title="What a deal team would ask"
        description="Calculated live from your accounts, invoices and receipts"
      />
      <ul className="divide-y divide-line border-t border-line">
        {data.pillars.map((pillar) => (
          <li
            key={pillar.key}
            className="grid items-center gap-x-4 gap-y-1 px-5 py-3 sm:grid-cols-[150px_minmax(0,1fr)_auto]"
          >
            <div>
              <p className="text-[14px] font-bold text-ink">{pillar.label}</p>
              <p className="numeric text-[12.5px] text-ink-3">{pillar.value}</p>
            </div>
            <p className="text-[13.5px] text-ink-2">{pillar.insight}</p>
            <div className="flex items-center gap-2.5 sm:w-44">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-accent-soft">
                <motion.div
                  className="h-full rounded-full bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${pillar.score}%` }}
                  transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                />
              </div>
              <span className="numeric w-7 text-right text-[13px] font-bold text-ink">
                {pillar.score}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

function ValuationPanel({ data }: { data: CapitalReadiness }) {
  const { valuation } = data;
  return (
    <Panel className="flex h-full flex-col px-5 py-4.5">
      <p className="eyebrow">Indicative value range</p>
      <p className="mt-2 font-display text-[38px] leading-none text-ink">
        {moneyCompact(valuation.low)}
        <span className="text-ink-3"> to </span>
        {moneyCompact(valuation.high)}
      </p>
      <p className="mt-2 text-[13.5px] text-ink-2">
        {valuation.lowMultiple}x to {valuation.highMultiple}x trailing operating cash flow of{' '}
        <span className="numeric font-bold text-ink">{moneyCompact(data.operatingCashTtm)}</span>,
        on <span className="numeric font-bold text-ink">{moneyCompact(data.revenueTtm)}</span> of
        receipts.
      </p>
      <p className="mt-auto pt-3 text-[12px] leading-snug text-ink-3">
        Illustrative only, derived from banking data. Not a valuation, an offer or investment
        advice.
      </p>
    </Panel>
  );
}

function AdvisorPanel({ data, onRequest }: { data: CapitalReadiness; onRequest: () => void }) {
  return (
    <Panel className="flex h-full flex-col px-5 py-4.5">
      <p className="eyebrow">Your advisor</p>
      <div className="mt-3 flex items-center gap-3">
        <Monogram name={data.advisor.name} initials={data.advisor.initials} size="lg" round />
        <div className="leading-tight">
          <p className="font-display text-[21px] text-ink">{data.advisor.name}</p>
          <p className="mt-0.5 text-[13px] text-ink-3">
            {data.advisor.title}, {data.advisor.practice}
          </p>
        </div>
      </div>
      <p className="mt-3 text-[13.5px] text-ink-2">
        Senior-led from the first conversation. A member of the group gets back to you within 48
        hours.
      </p>
      <Button variant="primary" className="mt-auto w-full" onClick={onRequest}>
        Request a conversation
        <ArrowUpRight />
      </Button>
    </Panel>
  );
}

function RequestDialog({
  topic,
  advisorName,
  onClose,
}: {
  topic: AdvisoryTopic | null;
  advisorName: string;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [note, setNote] = useState('');
  const [sent, setSent] = useState<AdvisoryRequest | null>(null);

  const request = useMutation({
    mutationFn: (input: CreateAdvisoryRequestInput) =>
      api<AdvisoryRequest>('/capital/requests', { method: 'POST', body: input }),
    onSuccess: (result) => {
      setSent(result);
      void client.invalidateQueries({ queryKey: ['capital'] });
    },
    onError: toastError,
  });

  const close = () => {
    setSent(null);
    setNote('');
    onClose();
  };

  return (
    <Dialog
      open={topic !== null}
      onOpenChange={(open) => !open && close()}
      title={topic ? ADVISORY_TOPICS[topic] : ''}
      description={`Goes straight to ${advisorName}.`}
    >
      {sent ? (
        <div className="px-6 py-10 text-center">
          <CheckCircle2 className="mx-auto size-9 text-positive" />
          <p className="mt-3 font-display text-[24px] text-ink">
            Your request is with {advisorName}
          </p>
          <p className="mt-1 text-[13.5px] text-ink-3">
            Expect a reply within 48 hours. Sample only, nothing was sent.
          </p>
          <Button className="mt-5" onClick={close}>
            Done
          </Button>
        </div>
      ) : (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            if (topic) request.mutate({ topic, ...(note ? { note } : {}) });
          }}
        >
          <div className="p-6">
            <Field label="Anything we should know first? (optional)">
              {(id) => (
                <TextArea
                  id={id}
                  autoFocus
                  value={note}
                  maxLength={400}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Timing, goals, what prompted this"
                />
              )}
            </Field>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={close}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={request.isPending}>
              Send request
            </Button>
          </DialogFooter>
        </form>
      )}
    </Dialog>
  );
}

export function CapitalView() {
  const { data } = useCapital();
  const [topic, setTopic] = useState<AdvisoryTopic | null>(null);

  if (!data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-[420px] w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <Reveal className="space-y-4">
      <RevealItem>
        <ReadinessHero data={data} />
      </RevealItem>

      <RevealItem className="grid gap-4 lg:grid-cols-2">
        <ValuationPanel data={data} />
        <AdvisorPanel data={data} onRequest={() => setTopic('growth_capital')} />
      </RevealItem>

      <RevealItem>
        <PillarsTable data={data} />
      </RevealItem>

      <RevealItem>
        <h2 className="mt-2 mb-3 font-display text-[23px] text-ink">Where this can go</h2>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {PATHS.map((path) => {
            const requested = data.requests.some((request) => request.topic === path.topic);
            return (
              <button
                key={path.topic}
                type="button"
                onClick={() => setTopic(path.topic)}
                className={cn(
                  'group flex flex-col rounded-xl border border-line bg-surface p-4 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-line-strong',
                )}
              >
                <path.icon className="size-5 text-accent-soft-ink" />
                <p className="mt-3 font-display text-[19px] leading-tight text-ink">
                  {ADVISORY_TOPICS[path.topic]}
                </p>
                <p className="mt-1 text-[13px] text-ink-2">{path.body}</p>
                <p className="mt-3 flex items-center justify-between text-[12px] font-semibold text-ink-3">
                  {requested ? 'Request received' : path.practice}
                  <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </p>
              </button>
            );
          })}
        </div>
      </RevealItem>

      <RevealItem>
        <Panel className="grid grid-cols-2 gap-y-4 px-5 py-5 lg:grid-cols-4">
          {FIRM_FACTS.map((fact) => (
            <div key={fact.label} className="px-1">
              <p className="font-display text-[30px] leading-none text-ink">{fact.value}</p>
              <p className="mt-1 text-[12.5px] text-ink-3">{fact.label}</p>
            </div>
          ))}
        </Panel>
        <p className="mt-2 px-1 text-[12px] text-ink-3">
          Firm figures as published on postoakgroup.co. The advisor and requests shown here are
          sample flows and reach no one.
        </p>
      </RevealItem>

      <RequestDialog topic={topic} advisorName={data.advisor.name} onClose={() => setTopic(null)} />
    </Reveal>
  );
}
