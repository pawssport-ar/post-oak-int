'use client';

import type { Account, AccountSecrets } from '@post-oak/contracts';
import { useMutation } from '@tanstack/react-query';
import { ArrowRight, Check, Copy, Download, Eye, EyeOff, Send } from 'lucide-react';
import Link from 'next/link';
import { parseAsString, useQueryState } from 'nuqs';
import { useState } from 'react';
import { Sparkline } from '@/components/charts/sparkline';
import { useAppActions } from '@/components/layout/app-context';
import { Amount } from '@/components/ui/amount';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/controls';
import { PageHeader, Panel } from '@/components/ui/panel';
import { Reveal, RevealItem } from '@/components/ui/reveal';
import { Sheet } from '@/components/ui/sheet';
import { Skeleton } from '@/components/ui/skeleton';
import { toastError } from '@/components/ui/toaster';
import { revealAccount, useAccounts, useStatements } from '@/lib/api/queries';
import { cn } from '@/lib/cn';
import { money, moneyCompact } from '@/lib/format';
import { useCan } from '@/lib/use-permission';
import { SweepCard } from './sweep-card';

function CopyValue({ label, value, masked }: { label: string; value: string; masked?: boolean }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center justify-between gap-3 py-2.5">
      <span className="text-[13px] text-ink-3">{label}</span>
      <span className="flex items-center gap-1">
        <span className="numeric text-[14px] font-semibold tracking-wide text-ink">{value}</span>
        {!masked && (
          <Tooltip content={copied ? 'Copied' : 'Copy'}>
            <button
              type="button"
              aria-label={`Copy ${label}`}
              onClick={() => {
                void navigator.clipboard.writeText(value);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
              className="flex size-7 items-center justify-center rounded-md text-ink-3 transition hover:bg-surface-2 hover:text-ink"
            >
              {copied ? (
                <Check className="size-3.5 text-positive" />
              ) : (
                <Copy className="size-3.5" />
              )}
            </button>
          </Tooltip>
        )}
      </span>
    </div>
  );
}

function AccountDetail({ account }: { account: Account }) {
  const can = useCan();
  const { openSendMoney } = useAppActions();
  const { data: statements } = useStatements(account.id);
  const [secrets, setSecrets] = useState<AccountSecrets | null>(null);

  const reveal = useMutation({
    mutationFn: () => revealAccount(account.id),
    onSuccess: setSecrets,
    onError: toastError,
  });

  return (
    <div className="px-6 pt-6 pb-8">
      <p className="eyebrow">{account.purpose}</p>
      <h2 className="mt-2 font-display text-[28px] leading-tight text-ink">{account.name}</h2>
      <p className="mt-1 font-display text-[38px] leading-none text-ink">
        <Amount cents={account.balance} />
      </p>
      <div className="mt-3 flex gap-6 text-[13px]">
        <span className="text-ink-3">
          Available <Amount cents={account.available} className="font-semibold text-ink" />
        </span>
        {account.pending !== 0 && (
          <span className="text-ink-3">
            Pending <Amount cents={account.pending} className="font-semibold text-ink" />
          </span>
        )}
      </div>

      {can('payments:create') && (
        <div className="mt-4 flex gap-2">
          <Button variant="primary" onClick={() => openSendMoney()}>
            <Send />
            Send money
          </Button>
          <Button onClick={() => openSendMoney({ mode: 'internal' })}>Transfer</Button>
        </div>
      )}

      <div className="mt-6 rounded-xl border border-line px-4 py-1.5">
        <div className="flex items-center justify-between border-b border-line py-2">
          <p className="eyebrow">Account details</p>
          {can('accounts:reveal') && (
            <Button
              size="sm"
              variant="ghost"
              loading={reveal.isPending}
              onClick={() => (secrets ? setSecrets(null) : reveal.mutate())}
            >
              {secrets ? <EyeOff /> : <Eye />}
              {secrets ? 'Hide' : 'Reveal'}
            </Button>
          )}
        </div>
        <div className="divide-y divide-line">
          <CopyValue label="Routing number" value={account.routingNumber} />
          <CopyValue
            label="Account number"
            value={secrets?.accountNumber ?? `•••• •••• ${account.last4}`}
            masked={!secrets}
          />
        </div>
      </div>

      <h3 className="mt-6 eyebrow">Statements</h3>
      {statements ? (
        <ul className="mt-2 divide-y divide-line border-y border-line">
          {statements.slice(0, 8).map((statement) => (
            <li key={statement.id} className="flex items-center gap-3 py-2">
              <div className="min-w-0 flex-1 leading-tight">
                <p className="text-[13.5px] font-bold text-ink">{statement.label}</p>
                <p className="numeric mt-0.5 text-[12px] text-ink-3">
                  {statement.transactionCount} entries · closed at {money(statement.closingBalance)}
                </p>
              </div>
              <Button
                size="icon-sm"
                variant="ghost"
                asChild
                aria-label={`Download ${statement.label}`}
              >
                <a
                  href={`/api/accounts/${account.id}/statements/${statement.period}/csv`}
                  download={`${account.name}-${statement.period}.csv`}
                >
                  <Download />
                </a>
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <Skeleton className="mt-2 h-40 w-full" />
      )}

      <Button size="sm" className="mt-4" asChild>
        <Link href={`/transactions?accountId=${account.id}`}>
          View all activity
          <ArrowRight />
        </Link>
      </Button>
    </div>
  );
}

function AccountCard({ account, onOpen }: { account: Account; onOpen: () => void }) {
  const up = account.change30d >= 0;
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group w-full rounded-xl border border-line bg-surface p-5 text-left shadow-card transition-all hover:-translate-y-0.5 hover:border-line-strong"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-display text-[22px] leading-tight text-ink">{account.name}</p>
          <p className="mt-0.5 truncate text-[13px] text-ink-3">{account.purpose}</p>
        </div>
        <span className="numeric shrink-0 rounded-md bg-surface-2 px-1.5 py-0.5 text-[12px] font-semibold text-ink-2">
          ••{account.last4}
        </span>
      </div>
      <div className="mt-5 flex items-end justify-between gap-4">
        <div>
          <p className="font-display text-[32px] leading-none text-ink">
            <Amount cents={account.balance} />
          </p>
          <p className="mt-2 text-[13px] text-ink-3">
            <span className={cn('numeric font-bold', up ? 'text-positive' : 'text-ink-2')}>
              {up ? '+' : ''}
              {moneyCompact(account.change30d)}
            </span>{' '}
            in 30 days
            {account.apyBps ? ` · ${(account.apyBps / 100).toFixed(2)}% APY` : ''}
          </p>
        </div>
        <Sparkline
          values={account.trend}
          width={120}
          height={44}
          className="hidden shrink-0 text-[var(--chart-1)] sm:block"
        />
      </div>
    </button>
  );
}

export function AccountsView() {
  const { data: accounts } = useAccounts();
  const [selectedId, setSelectedId] = useQueryState('account', parseAsString);
  const selected = accounts?.find((account) => account.id === selectedId);
  const total = accounts?.reduce((sum, account) => sum + account.balance, 0) ?? 0;
  const yielding = accounts?.filter((account) => account.apyBps) ?? [];
  const yieldBalance = yielding.reduce((sum, account) => sum + account.balance, 0);

  return (
    <Reveal>
      <RevealItem>
        <PageHeader
          title="Accounts"
          description="Purpose-built accounts for operating cash, payroll, taxes and reserves."
        />
      </RevealItem>

      <RevealItem className="mb-4">
        <Panel className="flex flex-wrap items-center gap-x-10 gap-y-3 px-5 py-4">
          <div>
            <p className="eyebrow">Total balance</p>
            <p className="mt-1 font-display text-[28px] leading-none text-ink">
              <Amount cents={total} />
            </p>
          </div>
          <div>
            <p className="eyebrow">Earning yield</p>
            <p className="mt-1 font-display text-[28px] leading-none text-ink">
              {total > 0 ? `${Math.round((yieldBalance / total) * 100)}%` : ' '}
            </p>
          </div>
          <div>
            <p className="eyebrow">Accounts</p>
            <p className="mt-1 font-display text-[28px] leading-none text-ink">
              {accounts?.length ?? ' '}
            </p>
          </div>
        </Panel>
      </RevealItem>

      <RevealItem className="mb-4">
        <SweepCard />
      </RevealItem>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {accounts
          ? accounts.map((account) => (
              <RevealItem key={account.id}>
                <AccountCard account={account} onOpen={() => void setSelectedId(account.id)} />
              </RevealItem>
            ))
          : Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className="h-[172px] rounded-xl" />
            ))}
      </div>

      <Sheet
        open={Boolean(selected)}
        onOpenChange={(open) => !open && void setSelectedId(null)}
        title="Account details"
      >
        {selected && <AccountDetail key={selected.id} account={selected} />}
      </Sheet>
    </Reveal>
  );
}
