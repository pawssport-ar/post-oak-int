'use client';

import type {
  Account,
  CreatePaymentInput,
  Payment,
  PaymentQuote,
  PaymentRail,
  Recipient,
} from '@post-oak/contracts';
import { RECIPIENT_TYPE_LABELS } from '@post-oak/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format, parseISO } from 'date-fns';
import {
  ArrowLeft,
  ArrowRight,
  CircleAlert,
  Clock3,
  Info,
  Landmark,
  Plus,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useMemo, useState } from 'react';
import { type SendMoneyPrefill, useAppActions } from '@/components/layout/app-context';
import { Amount } from '@/components/ui/amount';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/controls';
import { Dialog } from '@/components/ui/dialog';
import { Field, inputClasses, TextInput } from '@/components/ui/field';
import { Monogram } from '@/components/ui/monogram';
import { Select } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toastError } from '@/components/ui/toaster';
import { useSwitchPersona } from '@/features/session/use-switch-persona';
import { api } from '@/lib/api/client';
import {
  useAccounts,
  usePaymentQuote,
  usePayments,
  useRecipients,
  useSession,
} from '@/lib/api/queries';
import { cn } from '@/lib/cn';
import { money, relativeTime } from '@/lib/format';
import { useCan } from '@/lib/use-permission';
import { RAIL_OPTIONS } from './labels';
import { NewRecipientForm } from './new-recipient-form';
import { PaymentProgress } from './payment-progress';
import { Tombstone } from './tombstone';

type Step = 'destination' | 'details' | 'review' | 'done';

interface Draft {
  destination: CreatePaymentInput['destination'] | null;
  fromAccountId: string;
  amount: number | null;
  rail: PaymentRail;
  memo: string;
  scheduledFor: string;
}

const EMPTY_DRAFT: Draft = {
  destination: null,
  fromAccountId: 'acc_operating',
  amount: null,
  rail: 'ach',
  memo: '',
  scheduledFor: '',
};

const STEP_TITLES: Record<Exclude<Step, 'done'>, string> = {
  destination: 'Who is this for?',
  details: 'How much, and how?',
  review: 'Review and send',
};

const STEP_ORDER: Exclude<Step, 'done'>[] = ['destination', 'details', 'review'];

const slide = {
  initial: { opacity: 0, x: 14 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -14 },
  transition: { duration: 0.2, ease: [0.22, 1, 0.36, 1] as const },
};

function initialDraft(prefill: SendMoneyPrefill, recipients: Recipient[] | undefined): Draft {
  const { recipientId, mode, transfer } = prefill;
  if (transfer) {
    return {
      ...EMPTY_DRAFT,
      fromAccountId: transfer.fromAccountId,
      destination: { type: 'account', accountId: transfer.toAccountId },
      amount: transfer.amount,
      memo: transfer.memo,
      rail: 'book',
    };
  }
  const recipient = recipients?.find((r) => r.id === recipientId);
  return {
    ...EMPTY_DRAFT,
    destination: recipientId ? { type: 'recipient', recipientId } : null,
    rail: recipient?.defaultRail ?? (mode === 'internal' ? 'book' : 'ach'),
  };
}

function initialStep({ recipientId, transfer }: SendMoneyPrefill): Step {
  if (transfer) return 'review';
  return recipientId ? 'details' : 'destination';
}

/** The money-movement wizard. Every number on the review step comes from the server. */
export function SendMoneyFlow() {
  const { sendMoney, closeSendMoney } = useAppActions();
  const can = useCan();
  const allowed = can('payments:create');
  const { data: accounts } = useAccounts(allowed);
  const { data: recipients } = useRecipients(allowed);

  return (
    <Dialog
      open={sendMoney.open}
      onOpenChange={(open) => !open && closeSendMoney()}
      title="Send money"
      size="lg"
      hideHeader
    >
      <FlowBody
        key={sendMoney.session}
        prefill={sendMoney.prefill}
        accounts={accounts}
        recipients={recipients}
        onClose={closeSendMoney}
      />
    </Dialog>
  );
}

function FlowBody({
  prefill,
  accounts,
  recipients,
  onClose,
}: {
  prefill: SendMoneyPrefill;
  accounts: Account[] | undefined;
  recipients: Recipient[] | undefined;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const [step, setStep] = useState<Step>(() => initialStep(prefill));
  const [draft, setDraft] = useState<Draft>(() => initialDraft(prefill, recipients));
  const [idempotencyKey] = useState(() => crypto.randomUUID());
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const input = useMemo<CreatePaymentInput | null>(() => {
    if (!draft.destination || !draft.amount) return null;
    return {
      fromAccountId: draft.fromAccountId,
      destination: draft.destination,
      rail: draft.rail,
      amount: draft.amount,
      ...(draft.memo ? { memo: draft.memo } : {}),
      ...(draft.scheduledFor ? { scheduledFor: draft.scheduledFor } : {}),
    };
  }, [draft]);

  const submit = useMutation({
    mutationFn: (body: CreatePaymentInput) =>
      api<Payment>('/payments', {
        method: 'POST',
        body,
        headers: { 'idempotency-key': idempotencyKey },
      }),
    onSuccess: (payment) => {
      setPaymentId(payment.id);
      setStep('done');
      for (const key of ['payments', 'overview', 'transactions', 'accounts']) {
        void client.invalidateQueries({ queryKey: [key] });
      }
    },
    onError: toastError,
  });

  const stepIndex = step === 'done' ? STEP_ORDER.length : STEP_ORDER.indexOf(step);

  return (
    <div className="flex min-h-[540px] flex-col">
      {step !== 'done' && (
        <header className="px-6 pt-5 pb-4 sm:px-8">
          <div className="flex items-center gap-1.5 pr-10">
            {STEP_ORDER.map((name, index) => (
              <span
                key={name}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors duration-300',
                  index <= stepIndex ? 'bg-accent' : 'bg-surface-3',
                )}
              />
            ))}
          </div>
          <p className="eyebrow mt-4">
            Step {stepIndex + 1} of {STEP_ORDER.length}
          </p>
          <h2 className="mt-0.5 font-display text-[29px] leading-tight text-ink">
            {STEP_TITLES[step]}
          </h2>
        </header>
      )}

      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={step} className="flex min-h-0 flex-1 flex-col" {...slide}>
          {step === 'destination' && (
            <DestinationStep
              accounts={accounts}
              recipients={recipients}
              draft={draft}
              onPick={(destination, rail) => {
                setDraft((current) => ({ ...current, destination, rail }));
                setStep('details');
              }}
              onFromChange={(fromAccountId) =>
                setDraft((current) => ({ ...current, fromAccountId }))
              }
            />
          )}
          {step === 'details' && (
            <DetailsStep
              accounts={accounts}
              recipients={recipients}
              draft={draft}
              onChange={(patch) => setDraft((current) => ({ ...current, ...patch }))}
              onBack={() => setStep('destination')}
              onNext={() => setStep('review')}
            />
          )}
          {step === 'review' && input && (
            <ReviewStep
              input={input}
              accounts={accounts}
              recipients={recipients}
              submitting={submit.isPending}
              onBack={() => setStep('details')}
              onSubmit={() => submit.mutate(input)}
            />
          )}
          {step === 'done' && paymentId && <DoneStep paymentId={paymentId} onClose={onClose} />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function StepFooter({ children }: { children: ReactNode }) {
  return (
    <footer className="mt-auto flex items-center justify-between gap-2 border-t border-line px-6 py-4 sm:px-8">
      {children}
    </footer>
  );
}

function DestinationStep({
  accounts,
  recipients,
  draft,
  onPick,
  onFromChange,
}: {
  accounts: Account[] | undefined;
  recipients: Recipient[] | undefined;
  draft: Draft;
  onPick: (destination: NonNullable<Draft['destination']>, rail: PaymentRail) => void;
  onFromChange: (accountId: string) => void;
}) {
  const [mode, setMode] = useState<'external' | 'internal'>(
    draft.rail === 'book' ? 'internal' : 'external',
  );
  const [query, setQuery] = useState('');
  const [adding, setAdding] = useState(false);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (recipients ?? []).filter((r) => r.name.toLowerCase().includes(needle));
  }, [recipients, query]);

  if (adding) {
    return (
      <div className="px-6 pb-6 sm:px-8">
        <NewRecipientForm
          onCancel={() => setAdding(false)}
          onCreated={(recipient) =>
            onPick({ type: 'recipient', recipientId: recipient.id }, recipient.defaultRail)
          }
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col px-6 pb-6 sm:px-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <Segmented
          aria-label="Destination type"
          value={mode}
          onValueChange={setMode}
          options={[
            { value: 'external', label: 'Pay someone' },
            { value: 'internal', label: 'Between my accounts' },
          ]}
        />
        {mode === 'external' && (
          <Button size="sm" variant="ghost" onClick={() => setAdding(true)}>
            <Plus />
            New recipient
          </Button>
        )}
      </div>

      {mode === 'external' ? (
        <>
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search recipients"
              aria-label="Search recipients"
              className={cn(inputClasses, 'pl-9')}
            />
          </div>
          <ul className="-mx-2 max-h-[320px] overflow-y-auto">
            {matches.map((recipient) => (
              <li key={recipient.id}>
                <button
                  type="button"
                  onClick={() =>
                    onPick({ type: 'recipient', recipientId: recipient.id }, recipient.defaultRail)
                  }
                  className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-2"
                >
                  <Monogram name={recipient.name} />
                  <span className="min-w-0 flex-1 leading-tight">
                    <span className="block truncate text-[14px] font-bold text-ink">
                      {recipient.name}
                    </span>
                    <span className="mt-0.5 block truncate text-[12.5px] text-ink-3">
                      {RECIPIENT_TYPE_LABELS[recipient.type]} · {recipient.bankName} ••
                      {recipient.accountLast4}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-[12px] text-ink-3">
                    {recipient.isNew
                      ? 'New'
                      : recipient.lastPaidAt
                        ? `Paid ${relativeTime(recipient.lastPaidAt)}`
                        : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <div className="space-y-4">
          <Field label="From">
            {(id) => (
              <AccountSelect
                id={id}
                accounts={accounts}
                value={draft.fromAccountId}
                onValueChange={onFromChange}
              />
            )}
          </Field>
          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink-2">To</p>
            <ul className="space-y-2">
              {accounts
                ?.filter((account) => account.id !== draft.fromAccountId)
                .map((account) => (
                  <li key={account.id}>
                    <button
                      type="button"
                      onClick={() => onPick({ type: 'account', accountId: account.id }, 'book')}
                      className="flex w-full items-center gap-3 rounded-lg border border-line px-3 py-2.5 text-left transition-colors hover:border-line-strong hover:bg-surface-2"
                    >
                      <span className="flex size-9 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-ink">
                        <Landmark className="size-4" />
                      </span>
                      <span className="min-w-0 flex-1 leading-tight">
                        <span className="block text-[14px] font-bold text-ink">{account.name}</span>
                        <span className="mt-0.5 block text-[12.5px] text-ink-3">
                          ••{account.last4}
                        </span>
                      </span>
                      <Amount cents={account.balance} className="text-[13.5px] font-semibold" />
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}

function AccountSelect({
  id,
  accounts,
  value,
  onValueChange,
}: {
  id: string;
  accounts: Account[] | undefined;
  value: string;
  onValueChange: (accountId: string) => void;
}) {
  return (
    <Select
      id={id}
      value={value}
      onValueChange={onValueChange}
      options={(accounts ?? []).map((account) => ({
        value: account.id,
        label: `${account.name} ••${account.last4}`,
        hint: money(account.available),
      }))}
    />
  );
}

function destinationName(
  destination: Draft['destination'],
  accounts: Account[] | undefined,
  recipients: Recipient[] | undefined,
): { name: string; detail: string } {
  if (destination?.type === 'account') {
    const account = accounts?.find((a) => a.id === destination.accountId);
    return { name: account?.name ?? '', detail: `••${account?.last4 ?? ''}` };
  }
  const recipient = recipients?.find((r) => r.id === destination?.recipientId);
  return {
    name: recipient?.name ?? '',
    detail: `${recipient?.bankName ?? ''} ••${recipient?.accountLast4 ?? ''}`,
  };
}

function DetailsStep({
  accounts,
  recipients,
  draft,
  onChange,
  onBack,
  onNext,
}: {
  accounts: Account[] | undefined;
  recipients: Recipient[] | undefined;
  draft: Draft;
  onChange: (patch: Partial<Draft>) => void;
  onBack: () => void;
  onNext: () => void;
}) {
  const destination = destinationName(draft.destination, accounts, recipients);
  const internal = draft.destination?.type === 'account';
  const display =
    draft.amount === null
      ? ''
      : (draft.amount / 100).toLocaleString('en-US', {
          minimumFractionDigits: draft.amount % 100 === 0 ? 0 : 2,
          maximumFractionDigits: 2,
        });

  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(event) => {
        event.preventDefault();
        if (draft.amount) onNext();
      }}
    >
      <div className="space-y-5 px-6 pb-6 sm:px-8">
        <div className="flex items-center gap-3 rounded-xl bg-surface-2 px-3 py-2.5">
          <Monogram name={destination.name || '?'} />
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-[14px] font-bold text-ink">{destination.name}</p>
            <p className="mt-0.5 truncate text-[12.5px] text-ink-3">{destination.detail}</p>
          </div>
          <Button size="sm" variant="ghost" onClick={onBack}>
            Change
          </Button>
        </div>

        <div>
          <label htmlFor="payment-amount" className="eyebrow">
            Amount
          </label>
          <div className="mt-1 flex items-baseline gap-1 border-b border-line-strong pb-1 transition-colors focus-within:border-accent">
            <span className="font-display text-[38px] text-ink-3">$</span>
            <input
              id="payment-amount"
              autoFocus
              inputMode="decimal"
              placeholder="0"
              value={display}
              onChange={(event) => {
                const raw = event.target.value.replace(/[^\d.]/g, '');
                if (!raw) {
                  onChange({ amount: null });
                  return;
                }
                const [whole = '0', fraction = ''] = raw.split('.');
                const cents = Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2));
                if (Number.isSafeInteger(cents)) onChange({ amount: cents });
              }}
              className="numeric w-full min-w-0 bg-transparent font-display text-[46px] leading-none text-ink outline-none placeholder:text-line-strong"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="From">
            {(id) => (
              <AccountSelect
                id={id}
                accounts={accounts}
                value={draft.fromAccountId}
                onValueChange={(fromAccountId) => onChange({ fromAccountId })}
              />
            )}
          </Field>
          <Field label="Send on" hint="Leave empty to send today">
            {(id) => (
              <TextInput
                id={id}
                type="date"
                min={format(new Date(), 'yyyy-MM-dd')}
                value={draft.scheduledFor}
                onChange={(event) => onChange({ scheduledFor: event.target.value })}
              />
            )}
          </Field>
        </div>

        {!internal && (
          <fieldset>
            <legend className="mb-1.5 text-[13px] font-semibold text-ink-2">Delivery</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {RAIL_OPTIONS.map((option) => {
                const selected = draft.rail === option.rail;
                return (
                  <button
                    key={option.rail}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange({ rail: option.rail })}
                    className={cn(
                      'rounded-lg border p-3 text-left transition-all',
                      selected
                        ? 'border-accent bg-accent-soft/50 ring-1 ring-accent'
                        : 'border-line hover:border-line-strong',
                    )}
                  >
                    <span className="flex items-baseline justify-between">
                      <span className="text-[14px] font-bold text-ink">{option.title}</span>
                      <span className="numeric text-[12px] font-semibold text-ink-2">
                        {option.fee}
                      </span>
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-snug text-ink-3">
                      {option.speed}
                    </span>
                  </button>
                );
              })}
            </div>
          </fieldset>
        )}

        <Field label="Memo (optional)">
          {(id) => (
            <TextInput
              id={id}
              maxLength={140}
              value={draft.memo}
              onChange={(event) => onChange({ memo: event.target.value })}
              placeholder="Appears on the remittance"
            />
          )}
        </Field>
      </div>

      <StepFooter>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft />
          Back
        </Button>
        <Button type="submit" variant="primary" disabled={!draft.amount}>
          Review
          <ArrowRight />
        </Button>
      </StepFooter>
    </form>
  );
}

function ReviewLine({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-6 py-2.5">
      <dt className="text-[13.5px] text-ink-3">{label}</dt>
      <dd className="min-w-0 text-right text-[14px] font-semibold text-ink">{children}</dd>
    </div>
  );
}

function warningStyles(severity: PaymentQuote['warnings'][number]['severity']) {
  if (severity === 'blocking') return 'bg-negative-soft text-negative';
  if (severity === 'warning') return 'bg-warning-soft text-warning';
  return 'bg-info-soft text-info';
}

function ReviewStep({
  input,
  accounts,
  recipients,
  submitting,
  onBack,
  onSubmit,
}: {
  input: CreatePaymentInput;
  accounts: Account[] | undefined;
  recipients: Recipient[] | undefined;
  submitting: boolean;
  onBack: () => void;
  onSubmit: () => void;
}) {
  const { data: quote, error } = usePaymentQuote(input);
  const from = accounts?.find((a) => a.id === input.fromAccountId);
  const destination = destinationName(input.destination, accounts, recipients);
  const blocked = quote?.warnings.some((warning) => warning.severity === 'blocking') ?? false;

  return (
    <>
      <div className="px-6 pb-6 sm:px-8">
        <div className="rounded-xl bg-oak-800 px-5 py-4 text-white dark:bg-[#12291d]">
          <p className="text-[12px] font-bold tracking-[0.1em] text-white/60 uppercase">
            {destination.name}
          </p>
          <p className="numeric mt-1 font-display text-[40px] leading-none">
            {money(input.amount)}
          </p>
        </div>

        {error ? (
          <p className="mt-4 rounded-lg bg-negative-soft px-3 py-2.5 text-[13px] text-negative">
            {error.message}
          </p>
        ) : quote ? (
          <>
            <dl className="mt-3 divide-y divide-line">
              <ReviewLine label="From">
                {from?.name} ••{from?.last4}
              </ReviewLine>
              <ReviewLine label="To">{destination.detail}</ReviewLine>
              <ReviewLine label="Fee">{quote.fee === 0 ? 'No fee' : money(quote.fee)}</ReviewLine>
              <ReviewLine label="Arrives">
                {input.scheduledFor
                  ? `Sends ${format(parseISO(input.scheduledFor), 'MMM d, yyyy')}`
                  : `${quote.arrivalLabel}, ${format(parseISO(quote.estimatedArrival), 'MMM d')}`}
              </ReviewLine>
              <ReviewLine label="Available after">
                <Amount cents={quote.availableAfter} />
              </ReviewLine>
              {input.memo && <ReviewLine label="Memo">{input.memo}</ReviewLine>}
            </dl>

            {quote.requiresApproval && (
              <div className="mt-3 flex gap-2.5 rounded-lg bg-accent-soft px-3 py-2.5 text-[13px] text-accent-soft-ink">
                <ShieldCheck className="mt-px size-4 shrink-0" />
                <p>
                  <strong>{quote.policyName}.</strong> This needs a second approval
                  {quote.approverNames.length > 0
                    ? ` from ${quote.approverNames.join(' or ')}`
                    : ''}{' '}
                  before it leaves.
                </p>
              </div>
            )}

            <div className="mt-2 space-y-2">
              {quote.warnings.map((warning) => (
                <div
                  key={warning.code}
                  className={cn(
                    'flex gap-2.5 rounded-lg px-3 py-2.5 text-[13px]',
                    warningStyles(warning.severity),
                  )}
                >
                  {warning.severity === 'info' ? (
                    <Info className="mt-px size-4 shrink-0" />
                  ) : (
                    <CircleAlert className="mt-px size-4 shrink-0" />
                  )}
                  <p>{warning.message}</p>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="mt-4 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        )}
      </div>

      <StepFooter>
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft />
          Back
        </Button>
        <Button
          variant="primary"
          size="lg"
          disabled={!quote || blocked}
          loading={submitting}
          onClick={onSubmit}
        >
          {quote?.requiresApproval
            ? 'Send for approval'
            : input.scheduledFor
              ? 'Schedule payment'
              : `Send ${money(input.amount)}`}
        </Button>
      </StepFooter>
    </>
  );
}

function DoneStep({ paymentId, onClose }: { paymentId: string; onClose: () => void }) {
  const router = useRouter();
  const { data: payments } = usePayments();
  const { data: session } = useSession();
  const switchPersona = useSwitchPersona({ redirectTo: '/payments' });
  const payment = payments?.find((p) => p.id === paymentId);

  if (!payment) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Skeleton className="h-64 w-72" />
      </div>
    );
  }

  const approver = session?.personas.find(
    (persona) =>
      persona.id !== session.user.id && (persona.role === 'admin' || persona.role === 'owner'),
  );
  const waiting = payment.status === 'pending_approval';

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 px-6 pt-8 pb-6 sm:px-10">
        <motion.div
          initial={{ opacity: 0, y: 14, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        >
          <Tombstone payment={payment} companyName={session?.company.name ?? ''} />
        </motion.div>

        <div className="mx-auto mt-6 max-w-md">
          {waiting ? (
            <div className="flex items-start gap-2.5 rounded-lg bg-warning-soft px-3 py-2.5 text-[13px] text-warning">
              <Clock3 className="mt-px size-4 shrink-0" />
              <p>
                Waiting for a second approver. <strong>{payment.policyName}</strong> applies, so
                nothing moves until someone else signs off.
              </p>
            </div>
          ) : (
            <PaymentProgress payment={payment} />
          )}
        </div>
      </div>

      <StepFooter>
        <Button
          variant="ghost"
          onClick={() => {
            onClose();
            router.push('/payments');
          }}
        >
          View payments
        </Button>
        {waiting && approver ? (
          <Button
            variant="primary"
            loading={switchPersona.isPending}
            onClick={() => {
              onClose();
              switchPersona.mutate(approver.id);
            }}
          >
            Review as {approver.name}
          </Button>
        ) : (
          <Button variant="primary" onClick={onClose}>
            Done
          </Button>
        )}
      </StepFooter>
    </div>
  );
}
