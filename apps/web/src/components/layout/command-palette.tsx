'use client';

import type { AssistantAnswer } from '@post-oak/contracts';
import { useMutation } from '@tanstack/react-query';
import { Command } from 'cmdk';
import {
  ArrowRight,
  CornerDownLeft,
  CreditCard,
  FileText,
  Moon,
  Search,
  Send,
  Sparkles,
  UserRound,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { Dialog as Radix } from 'radix-ui';
import { useDeferredValue, useEffect, useState } from 'react';
import { Amount } from '@/components/ui/amount';
import { Kbd } from '@/components/ui/controls';
import { askAssistant, useGlobalSearch } from '@/lib/api/queries';
import { useCan } from '@/lib/use-permission';
import { useAppActions } from './app-context';
import { NAV } from './nav';

const SUGGESTIONS = [
  'How much did we spend on fuel last month?',
  'Who owes us money?',
  'What is our cash on hand?',
];

const groupClasses =
  '[&_[cmdk-group-heading]]:px-3 [&_[cmdk-group-heading]]:pt-3 [&_[cmdk-group-heading]]:pb-1 [&_[cmdk-group-heading]]:text-[11px] [&_[cmdk-group-heading]]:font-bold [&_[cmdk-group-heading]]:tracking-[0.08em] [&_[cmdk-group-heading]]:text-ink-3 [&_[cmdk-group-heading]]:uppercase';

const itemClasses =
  'flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13.5px] text-ink outline-none data-[selected=true]:bg-surface-2 [&_svg]:size-4 [&_svg]:text-ink-3';

export function CommandPalette() {
  const { paletteOpen, setPaletteOpen } = useAppActions();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setPaletteOpen(!paletteOpen);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [paletteOpen, setPaletteOpen]);

  return (
    <Radix.Root open={paletteOpen} onOpenChange={setPaletteOpen}>
      <AnimatePresence>
        {paletteOpen && (
          <Radix.Portal forceMount>
            <Radix.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-[2px]"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.15 }}
              />
            </Radix.Overlay>
            <Radix.Content asChild forceMount aria-describedby={undefined}>
              <motion.div
                className="fixed top-[12vh] left-1/2 z-50 w-[calc(100vw-24px)] max-w-[620px] -translate-x-1/2 overflow-hidden rounded-2xl border border-line bg-surface shadow-pop outline-none"
                initial={{ opacity: 0, scale: 0.98, y: -8 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.98, y: -6 }}
                transition={{ type: 'spring', stiffness: 520, damping: 38 }}
              >
                <Radix.Title className="sr-only">Search and commands</Radix.Title>
                <PaletteBody />
              </motion.div>
            </Radix.Content>
          </Radix.Portal>
        )}
      </AnimatePresence>
    </Radix.Root>
  );
}

/** Mounted only while the palette is open, so its query resets on its own. */
function PaletteBody() {
  const { setPaletteOpen, openSendMoney } = useAppActions();
  const router = useRouter();
  const can = useCan();
  const { resolvedTheme, setTheme } = useTheme();
  const [query, setQuery] = useState('');
  const [answer, setAnswer] = useState<AssistantAnswer | null>(null);
  const deferredQuery = useDeferredValue(query);
  const { data: results } = useGlobalSearch(can('accounts:view') ? deferredQuery : '');

  const ask = useMutation({ mutationFn: askAssistant, onSuccess: setAnswer });

  const run = (action: () => void) => {
    setPaletteOpen(false);
    action();
  };

  const trimmed = query.trim();
  const canAsk = can('insights:view');
  const looksLikeQuestion = canAsk && trimmed.length >= 6 && trimmed.includes(' ');

  return (
    <Command shouldFilter={false} loop>
      <div className="flex items-center gap-3 border-b border-line px-4">
        <Search className="size-[18px] shrink-0 text-ink-3" />
        <Command.Input
          value={query}
          onValueChange={(value) => {
            setQuery(value);
            setAnswer(null);
          }}
          placeholder="Search anything, or ask about your cash"
          className="h-13 flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
        />
        <Kbd>Esc</Kbd>
      </div>

      {answer && (
        <div className="border-b border-line bg-accent-soft/50 px-4 py-3.5">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 size-4 shrink-0 text-accent-soft-ink" />
            <div className="min-w-0 flex-1">
              <p className="font-display text-[18px] leading-snug text-ink">{answer.answer}</p>
              {answer.facts.length > 0 && (
                <dl className="mt-2 grid grid-cols-2 gap-x-6 gap-y-1">
                  {answer.facts.map((fact) => (
                    <div key={fact.label} className="flex justify-between gap-3">
                      <dt className="text-[12.5px] text-ink-3">{fact.label}</dt>
                      <dd className="numeric truncate text-[12.5px] font-semibold text-ink">
                        {fact.value}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}
              {answer.link && (
                <button
                  type="button"
                  onClick={() => {
                    const href = answer.link?.href;
                    if (href) run(() => router.push(href));
                  }}
                  className="mt-2.5 inline-flex items-center gap-1 text-[13px] font-bold text-accent-soft-ink hover:underline"
                >
                  {answer.link.label}
                  <ArrowRight className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <Command.List className="max-h-[50vh] overflow-y-auto p-1.5">
        {looksLikeQuestion && (
          <Command.Group heading="Ask Post Oak" className={groupClasses}>
            <Command.Item
              value={`ask-${trimmed}`}
              onSelect={() => ask.mutate(trimmed)}
              className={itemClasses}
            >
              <Sparkles />
              <span className="min-w-0 flex-1 truncate">{trimmed}</span>
              <CornerDownLeft />
            </Command.Item>
          </Command.Group>
        )}

        {trimmed.length === 0 && canAsk && (
          <Command.Group heading="Try asking" className={groupClasses}>
            {SUGGESTIONS.map((suggestion) => (
              <Command.Item
                key={suggestion}
                value={suggestion}
                onSelect={() => {
                  setQuery(suggestion);
                  ask.mutate(suggestion);
                }}
                className={itemClasses}
              >
                <Sparkles />
                {suggestion}
              </Command.Item>
            ))}
          </Command.Group>
        )}

        {results && results.transactions.length > 0 && (
          <Command.Group heading="Transactions" className={groupClasses}>
            {results.transactions.map((t) => (
              <Command.Item
                key={t.id}
                value={t.id}
                onSelect={() => run(() => router.push(`/transactions?id=${t.id}`))}
                className={itemClasses}
              >
                <ArrowRight />
                <span className="min-w-0 flex-1 truncate">{t.counterparty}</span>
                <Amount cents={t.amount} signed />
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {results && results.recipients.length > 0 && (
          <Command.Group heading="Recipients" className={groupClasses}>
            {results.recipients.map((r) => (
              <Command.Item
                key={r.id}
                value={r.id}
                onSelect={() => run(() => openSendMoney({ recipientId: r.id }))}
                className={itemClasses}
              >
                <UserRound />
                <span className="min-w-0 flex-1 truncate">Pay {r.name}</span>
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {results && results.invoices.length > 0 && (
          <Command.Group heading="Invoices" className={groupClasses}>
            {results.invoices.map((i) => (
              <Command.Item
                key={i.id}
                value={i.id}
                onSelect={() => run(() => router.push(`/invoices?invoice=${i.id}`))}
                className={itemClasses}
              >
                <FileText />
                <span className="min-w-0 flex-1 truncate">
                  {i.number}, {i.customer}
                </span>
                <Amount cents={i.total} />
              </Command.Item>
            ))}
          </Command.Group>
        )}
        {results && results.cards.length > 0 && (
          <Command.Group heading="Cards" className={groupClasses}>
            {results.cards.map((c) => (
              <Command.Item
                key={c.id}
                value={c.id}
                onSelect={() => run(() => router.push(`/cards?card=${c.id}`))}
                className={itemClasses}
              >
                <CreditCard />
                {c.nickname} ••{c.last4}
              </Command.Item>
            ))}
          </Command.Group>
        )}

        <Command.Group heading="Actions" className={groupClasses}>
          {can('payments:create') && (
            <Command.Item
              value="send-money"
              onSelect={() => run(() => openSendMoney())}
              className={itemClasses}
            >
              <Send />
              Send money
            </Command.Item>
          )}
          {can('invoices:manage') && (
            <Command.Item
              value="create-invoice"
              onSelect={() => run(() => router.push('/invoices?new=true'))}
              className={itemClasses}
            >
              <FileText />
              Create an invoice
            </Command.Item>
          )}
          {can('cards:manage') && (
            <Command.Item
              value="issue-card"
              onSelect={() => run(() => router.push('/cards?new=true'))}
              className={itemClasses}
            >
              <CreditCard />
              Issue a card
            </Command.Item>
          )}
          <Command.Item
            value="theme"
            onSelect={() => run(() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark'))}
            className={itemClasses}
          >
            <Moon />
            Switch to {resolvedTheme === 'dark' ? 'light' : 'dark'} mode
          </Command.Item>
        </Command.Group>

        <Command.Group heading="Go to" className={groupClasses}>
          {NAV.flatMap((group) => group.items)
            .filter((item) => !item.permission || can(item.permission))
            .filter(
              (item) =>
                trimmed.length === 0 || item.label.toLowerCase().includes(trimmed.toLowerCase()),
            )
            .map((item) => (
              <Command.Item
                key={item.href}
                value={`nav-${item.href}`}
                onSelect={() => run(() => router.push(item.href))}
                className={itemClasses}
              >
                <item.icon className="size-4 text-ink-3" />
                {item.label}
              </Command.Item>
            ))}
        </Command.Group>
      </Command.List>
    </Command>
  );
}
