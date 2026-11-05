'use client';

import type { CreateInvoiceInput, Invoice } from '@post-oak/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { addDays, format } from 'date-fns';
import { Plus, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Field, MoneyInput, TextInput } from '@/components/ui/field';
import { toast, toastError } from '@/components/ui/toaster';
import { api } from '@/lib/api/client';
import { useSession } from '@/lib/api/queries';
import { money } from '@/lib/format';
import { InvoicePaper } from './invoice-paper';

interface DraftLine {
  key: number;
  description: string;
  quantity: number;
  unitPrice: number | null;
}

const emptyLine = (key: number): DraftLine => ({
  key,
  description: '',
  quantity: 1,
  unitPrice: null,
});

export function CreateInvoiceDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const client = useQueryClient();
  const { data: session } = useSession();
  const [customer, setCustomer] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [dueOn, setDueOn] = useState(() => format(addDays(new Date(), 45), 'yyyy-MM-dd'));
  const [memo, setMemo] = useState('');
  const [lines, setLines] = useState<DraftLine[]>([emptyLine(1)]);

  const subtotal = useMemo(
    () => lines.reduce((sum, line) => sum + Math.round(line.quantity * (line.unitPrice ?? 0)), 0),
    [lines],
  );

  const create = useMutation({
    mutationFn: (input: CreateInvoiceInput) =>
      api<Invoice>('/invoices', { method: 'POST', body: input }),
    onSuccess: (invoice) => {
      void client.invalidateQueries({ queryKey: ['invoices'] });
      void client.invalidateQueries({ queryKey: ['overview'] });
      toast({
        title: invoice.status === 'draft' ? 'Draft saved' : `${invoice.number} sent`,
        description: `${money(invoice.total)} to ${invoice.customer}.`,
        tone: 'positive',
      });
      setCustomer('');
      setCustomerEmail('');
      setMemo('');
      setLines([emptyLine(1)]);
      onClose();
    },
    onError: toastError,
  });

  const updateLine = (key: number, patch: Partial<DraftLine>) =>
    setLines((current) => current.map((line) => (line.key === key ? { ...line, ...patch } : line)));

  const valid =
    customer.trim().length >= 2 &&
    customerEmail.includes('@') &&
    lines.every((line) => line.description.trim() && line.unitPrice && line.quantity > 0);

  const submit = (send: boolean) =>
    create.mutate({
      customer,
      customerEmail,
      dueOn,
      taxRateBps: 0,
      send,
      ...(memo ? { memo } : {}),
      lines: lines.map((line) => ({
        description: line.description,
        quantity: line.quantity,
        unitPrice: line.unitPrice ?? 0,
      })),
    });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => !next && onClose()}
      title="New invoice"
      description="The preview updates as you type."
      size="xl"
    >
      <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Customer">
              {(id) => (
                <TextInput
                  id={id}
                  autoFocus
                  value={customer}
                  onChange={(event) => setCustomer(event.target.value)}
                  placeholder="Sabine Petrochemical Partners"
                />
              )}
            </Field>
            <Field label="Billing email">
              {(id) => (
                <TextInput
                  id={id}
                  type="email"
                  value={customerEmail}
                  onChange={(event) => setCustomerEmail(event.target.value)}
                  placeholder="ap@customer.com"
                />
              )}
            </Field>
          </div>

          <div>
            <p className="mb-1.5 text-[13px] font-semibold text-ink-2">Line items</p>
            <ul className="space-y-2">
              {lines.map((line) => (
                <li key={line.key} className="flex items-center gap-2">
                  <TextInput
                    aria-label="Description"
                    placeholder="Linehaul, Houston to Dallas"
                    className="min-w-0 flex-1"
                    value={line.description}
                    onChange={(event) => updateLine(line.key, { description: event.target.value })}
                  />
                  <TextInput
                    aria-label="Quantity"
                    type="number"
                    min={1}
                    className="numeric w-16 px-2 text-right"
                    value={line.quantity}
                    onChange={(event) =>
                      updateLine(line.key, { quantity: Number(event.target.value) })
                    }
                  />
                  <div className="w-28">
                    <MoneyInput
                      aria-label="Rate"
                      cents={line.unitPrice}
                      onCentsChange={(unitPrice) => updateLine(line.key, { unitPrice })}
                    />
                  </div>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="Remove line"
                    disabled={lines.length === 1}
                    onClick={() =>
                      setLines((current) => current.filter((item) => item.key !== line.key))
                    }
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
            <Button
              size="sm"
              variant="ghost"
              className="mt-2"
              onClick={() =>
                setLines((current) => [
                  ...current,
                  emptyLine(Math.max(...current.map((l) => l.key)) + 1),
                ])
              }
            >
              <Plus />
              Add line
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Due date">
              {(id) => (
                <TextInput
                  id={id}
                  type="date"
                  value={dueOn}
                  onChange={(event) => setDueOn(event.target.value)}
                />
              )}
            </Field>
            <Field label="Note to customer (optional)">
              {(id) => (
                <TextInput id={id} value={memo} onChange={(event) => setMemo(event.target.value)} />
              )}
            </Field>
          </div>
        </div>

        <InvoicePaper
          number="Draft"
          company={session?.company.legalName ?? ''}
          customer={customer}
          customerEmail={customerEmail}
          issuedOn={format(new Date(), 'yyyy-MM-dd')}
          dueOn={dueOn}
          lines={lines.map((line) => ({
            description: line.description,
            quantity: line.quantity,
            unitPrice: line.unitPrice ?? 0,
          }))}
          subtotal={subtotal}
          tax={0}
          total={subtotal}
          memo={memo}
        />
      </div>
      <DialogFooter>
        <Button variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button disabled={!valid} onClick={() => submit(false)}>
          Save draft
        </Button>
        <Button
          variant="primary"
          disabled={!valid}
          loading={create.isPending}
          onClick={() => submit(true)}
        >
          Send invoice
        </Button>
      </DialogFooter>
    </Dialog>
  );
}
