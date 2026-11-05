'use client';

import {
  type Bill,
  CATEGORIES,
  type CategoryId,
  type CreateBillInput,
  type PayBillInput,
} from '@post-oak/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import { parseAsBoolean, parseAsString, useQueryState } from 'nuqs';
import { useState } from 'react';
import { Amount } from '@/components/ui/amount';
import { Button } from '@/components/ui/button';
import { EmptyState, Segmented } from '@/components/ui/controls';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Field, MoneyInput, TextInput } from '@/components/ui/field';
import { Monogram } from '@/components/ui/monogram';
import { PageHeader, Panel } from '@/components/ui/panel';
import { Reveal, RevealItem } from '@/components/ui/reveal';
import { Select } from '@/components/ui/select';
import { RowsSkeleton } from '@/components/ui/skeleton';
import { StatusPill, type Tone } from '@/components/ui/status-pill';
import { toast, toastError } from '@/components/ui/toaster';
import { api } from '@/lib/api/client';
import { useAccounts, useBills } from '@/lib/api/queries';
import { dueLabel, money, shortDate } from '@/lib/format';
import { useCan } from '@/lib/use-permission';

const EXPENSE_CATEGORIES = (Object.keys(CATEGORIES) as CategoryId[]).filter(
  (id) => CATEGORIES[id].kind === 'expense',
);

function billState(bill: Bill): { tone: Tone; label: string } {
  if (bill.status === 'paid') return { tone: 'positive', label: 'Paid' };
  if (bill.status === 'processing') return { tone: 'info', label: 'Paying' };
  if (bill.status === 'scheduled') {
    return {
      tone: 'info',
      label: `Scheduled ${bill.scheduledFor ? shortDate(bill.scheduledFor) : ''}`,
    };
  }
  if (bill.isOverdue) return { tone: 'negative', label: 'Overdue' };
  return { tone: 'neutral', label: dueLabel(bill.dueOn) };
}

function PayBillDialog({ bill, onClose }: { bill: Bill | undefined; onClose: () => void }) {
  const client = useQueryClient();
  const { data: accounts } = useAccounts(Boolean(bill));
  const [accountId, setAccountId] = useState('acc_operating');
  const [rail, setRail] = useState<'ach' | 'wire'>('ach');
  const [payOn, setPayOn] = useState('');

  const pay = useMutation({
    mutationFn: (input: PayBillInput) =>
      api<Bill>(`/bills/${bill?.id}/pay`, { method: 'POST', body: input }),
    onSuccess: (result) => {
      for (const key of ['bills', 'payments', 'overview', 'transactions', 'accounts']) {
        void client.invalidateQueries({ queryKey: [key] });
      }
      toast({
        title: result.status === 'scheduled' ? 'Payment scheduled' : 'Payment on its way',
        description: `${money(result.amount)} to ${result.vendor}. Approval policies apply as usual.`,
        tone: 'positive',
        href: '/payments?tab=upcoming',
      });
      onClose();
    },
    onError: toastError,
  });

  return (
    <Dialog
      open={Boolean(bill)}
      onOpenChange={(open) => !open && onClose()}
      title={`Pay ${bill?.vendor ?? ''}`}
      description={
        bill ? `${bill.invoiceNumber}, ${dueLabel(bill.dueOn).toLowerCase()}` : undefined
      }
    >
      {bill && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            pay.mutate({ accountId, rail, ...(payOn ? { payOn } : {}) });
          }}
        >
          <div className="space-y-4 p-6">
            <p className="font-display text-[38px] leading-none text-ink">
              <Amount cents={bill.amount} />
            </p>
            <Field label="Pay from">
              {(id) => (
                <Select
                  id={id}
                  value={accountId}
                  onValueChange={setAccountId}
                  options={(accounts ?? []).map((account) => ({
                    value: account.id,
                    label: `${account.name} ••${account.last4}`,
                    hint: money(account.available),
                  }))}
                />
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-ink-2">Method</p>
                <Segmented
                  aria-label="Payment method"
                  value={rail}
                  onValueChange={setRail}
                  className="h-10 w-full [&>button]:h-9 [&>button]:flex-1"
                  options={[
                    { value: 'ach', label: 'ACH' },
                    { value: 'wire', label: 'Wire' },
                  ]}
                />
              </div>
              <Field label="Pay on" hint="Leave empty to pay today">
                {(id) => (
                  <TextInput
                    id={id}
                    type="date"
                    min={format(new Date(), 'yyyy-MM-dd')}
                    value={payOn}
                    onChange={(event) => setPayOn(event.target.value)}
                  />
                )}
              </Field>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" loading={pay.isPending}>
              {payOn ? 'Schedule payment' : `Pay ${money(bill.amount)}`}
            </Button>
          </DialogFooter>
        </form>
      )}
    </Dialog>
  );
}

function AddBillDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const client = useQueryClient();
  const [vendor, setVendor] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [amount, setAmount] = useState<number | null>(null);
  const [category, setCategory] = useState<CategoryId>('maintenance');
  const [dueOn, setDueOn] = useState('');

  const create = useMutation({
    mutationFn: (input: CreateBillInput) => api<Bill>('/bills', { method: 'POST', body: input }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: ['bills'] });
      void client.invalidateQueries({ queryKey: ['overview'] });
      setVendor('');
      setInvoiceNumber('');
      setAmount(null);
      setDueOn('');
      onClose();
    },
    onError: toastError,
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} title="Add a bill">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (amount) create.mutate({ vendor, invoiceNumber, amount, category, dueOn });
        }}
      >
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <Field label="Vendor" className="sm:col-span-2">
            {(id) => (
              <TextInput
                id={id}
                required
                autoFocus
                value={vendor}
                onChange={(event) => setVendor(event.target.value)}
              />
            )}
          </Field>
          <Field label="Invoice number">
            {(id) => (
              <TextInput
                id={id}
                required
                value={invoiceNumber}
                onChange={(event) => setInvoiceNumber(event.target.value)}
              />
            )}
          </Field>
          <Field label="Amount">
            {(id) => <MoneyInput id={id} required cents={amount} onCentsChange={setAmount} />}
          </Field>
          <Field label="Category">
            {(id) => (
              <Select
                id={id}
                value={category}
                onValueChange={setCategory}
                options={EXPENSE_CATEGORIES.map((value) => ({
                  value,
                  label: CATEGORIES[value].label,
                }))}
              />
            )}
          </Field>
          <Field label="Due date">
            {(id) => (
              <TextInput
                id={id}
                required
                type="date"
                value={dueOn}
                onChange={(event) => setDueOn(event.target.value)}
              />
            )}
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={create.isPending} disabled={!amount}>
            Add bill
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

function BillRow({ bill, onPay }: { bill: Bill; onPay?: (() => void) | undefined }) {
  const state = billState(bill);
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-2.5">
      <Monogram name={bill.vendor} />
      <div className="min-w-0 flex-1 basis-40 leading-tight">
        <p className="truncate text-[14px] font-bold text-ink">{bill.vendor}</p>
        <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
          {bill.invoiceNumber} · {CATEGORIES[bill.category].label}
          {bill.note ? ` · ${bill.note}` : ''}
        </p>
      </div>
      <StatusPill tone={state.tone} className="shrink-0">
        {state.label}
      </StatusPill>
      <Amount
        cents={bill.amount}
        className="w-28 shrink-0 text-right text-[14px] font-bold text-ink"
      />
      <span className="flex w-16 shrink-0 justify-end">
        {onPay && bill.status === 'awaiting_payment' && (
          <Button size="sm" onClick={onPay}>
            Pay
          </Button>
        )}
      </span>
    </li>
  );
}

const SECTIONS: { title: string; test: (bill: Bill) => boolean }[] = [
  { title: 'Overdue', test: (bill) => bill.isOverdue },
  {
    title: 'Due in the next 14 days',
    test: (bill) => {
      if (bill.isOverdue || bill.status !== 'awaiting_payment') return false;
      const days = (new Date(bill.dueOn).getTime() - Date.now()) / 86_400_000;
      return days <= 14;
    },
  },
  {
    title: 'Later',
    test: (bill) => {
      if (bill.status !== 'awaiting_payment') return false;
      return (new Date(bill.dueOn).getTime() - Date.now()) / 86_400_000 > 14;
    },
  },
  {
    title: 'In progress',
    test: (bill) => bill.status === 'processing' || bill.status === 'scheduled',
  },
  { title: 'Paid', test: (bill) => bill.status === 'paid' },
];

export function BillsView() {
  const can = useCan();
  const canManage = can('bills:manage');
  const { data: bills } = useBills();
  const [payingId, setPayingId] = useQueryState('bill', parseAsString);
  const [adding, setAdding] = useQueryState('new', parseAsBoolean.withDefault(false));

  const open = bills?.filter((bill) => bill.status === 'awaiting_payment') ?? [];
  const openTotal = open.reduce((sum, bill) => sum + bill.amount, 0);
  const overdue = open.filter((bill) => bill.isOverdue);
  const paying = bills?.find((bill) => bill.id === payingId);

  return (
    <Reveal>
      <RevealItem>
        <PageHeader
          title="Bills"
          description="Everything you owe vendors, paid through the same approval rules as any payment."
          actions={
            canManage && (
              <Button variant="primary" onClick={() => void setAdding(true)}>
                <Plus />
                Add bill
              </Button>
            )
          }
        />
      </RevealItem>

      <RevealItem className="mb-4">
        <Panel className="flex flex-wrap items-center gap-x-10 gap-y-3 px-5 py-4">
          <div>
            <p className="eyebrow">Open bills</p>
            <p className="mt-1 font-display text-[28px] leading-none text-ink">
              <Amount cents={openTotal} />
            </p>
          </div>
          <div>
            <p className="eyebrow">Overdue</p>
            <p className="mt-1 font-display text-[28px] leading-none text-ink">
              {overdue.length}
              <span className="text-[16px] text-ink-3"> of {open.length}</span>
            </p>
          </div>
        </Panel>
      </RevealItem>

      <RevealItem className="space-y-4">
        {!bills ? (
          <Panel>
            <RowsSkeleton />
          </Panel>
        ) : bills.length === 0 ? (
          <Panel>
            <EmptyState title="No bills yet" description="Add a bill to start paying vendors." />
          </Panel>
        ) : (
          SECTIONS.map((section) => {
            const items = bills.filter(section.test);
            if (items.length === 0) return null;
            return (
              <Panel key={section.title} className="overflow-hidden">
                <h2 className="border-b border-line bg-surface-2/50 px-5 py-2 text-[12px] font-bold text-ink-2">
                  {section.title}
                </h2>
                <ul className="divide-y divide-line">
                  {items.map((bill) => (
                    <BillRow
                      key={bill.id}
                      bill={bill}
                      onPay={canManage ? () => void setPayingId(bill.id) : undefined}
                    />
                  ))}
                </ul>
              </Panel>
            );
          })
        )}
      </RevealItem>

      <PayBillDialog bill={paying} onClose={() => void setPayingId(null)} />
      <AddBillDialog open={adding} onClose={() => void setAdding(null)} />
    </Reveal>
  );
}
