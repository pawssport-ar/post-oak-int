'use client';

import {
  type CreateRecipientInput,
  isValidRoutingNumber,
  RECIPIENT_TYPE_LABELS,
  RECIPIENT_TYPES,
  type Recipient,
} from '@post-oak/contracts';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Field, TextInput } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { toastError } from '@/components/ui/toaster';
import { api, ApiError } from '@/lib/api/client';

interface NewRecipientFormProps {
  onCreated: (recipient: Recipient) => void;
  onCancel: () => void;
}

export function NewRecipientForm({ onCreated, onCancel }: NewRecipientFormProps) {
  const client = useQueryClient();
  const [form, setForm] = useState<CreateRecipientInput>({
    name: '',
    type: 'vendor',
    email: '',
    routingNumber: '',
    accountNumber: '',
    defaultRail: 'ach',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const routingComplete = form.routingNumber.length === 9;
  const routingValid = isValidRoutingNumber(form.routingNumber);

  const { data: bank } = useQuery({
    queryKey: ['recipients', 'bank', form.routingNumber],
    queryFn: () =>
      api<{ valid: boolean; bankName: string | null }>(
        `/recipients/bank-lookup?routing=${form.routingNumber}`,
      ),
    enabled: routingValid,
  });

  const create = useMutation({
    mutationFn: () => api<Recipient>('/recipients', { method: 'POST', body: form }),
    onSuccess: (recipient) => {
      void client.invalidateQueries({ queryKey: ['recipients'] });
      onCreated(recipient);
    },
    onError: (error) => {
      if (error instanceof ApiError && error.fields) setErrors(error.fields);
      else toastError(error);
    },
  });

  const update = <K extends keyof CreateRecipientInput>(key: K, value: CreateRecipientInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) =>
      Object.fromEntries(Object.entries(current).filter(([field]) => field !== key)),
    );
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        create.mutate();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Legal name" error={errors['name']} className="sm:col-span-2">
          {(id) => (
            <TextInput
              id={id}
              autoFocus
              required
              value={form.name}
              onChange={(event) => update('name', event.target.value)}
              placeholder="Tejas Crane & Rigging"
            />
          )}
        </Field>
        <Field label="Type">
          {(id) => (
            <Select
              id={id}
              value={form.type}
              onValueChange={(value) => update('type', value)}
              options={RECIPIENT_TYPES.map((type) => ({
                value: type,
                label: RECIPIENT_TYPE_LABELS[type],
              }))}
            />
          )}
        </Field>
        <Field label="Remittance email (optional)" error={errors['email']}>
          {(id) => (
            <TextInput
              id={id}
              type="email"
              value={form.email ?? ''}
              onChange={(event) => update('email', event.target.value)}
              placeholder="billing@company.com"
            />
          )}
        </Field>
        <Field
          label="Routing number"
          error={
            errors['routingNumber'] ??
            (routingComplete && !routingValid
              ? 'This routing number failed its checksum'
              : undefined)
          }
          hint={
            bank?.bankName ? (
              <span className="flex items-center gap-1 text-positive">
                <CheckCircle2 className="size-3.5" />
                {bank.bankName}
              </span>
            ) : (
              'Try 021000021'
            )
          }
        >
          {(id) => (
            <TextInput
              id={id}
              required
              inputMode="numeric"
              maxLength={9}
              className="numeric"
              value={form.routingNumber}
              onChange={(event) => update('routingNumber', event.target.value.replace(/\D/g, ''))}
              placeholder="9 digits"
            />
          )}
        </Field>
        <Field label="Account number" error={errors['accountNumber']}>
          {(id) => (
            <TextInput
              id={id}
              required
              inputMode="numeric"
              maxLength={17}
              className="numeric"
              value={form.accountNumber}
              onChange={(event) => update('accountNumber', event.target.value.replace(/\D/g, ''))}
              placeholder="4 to 17 digits"
            />
          )}
        </Field>
      </div>
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onCancel}>
          Back to list
        </Button>
        <Button type="submit" variant="primary" loading={create.isPending} disabled={!routingValid}>
          Save recipient
        </Button>
      </div>
    </form>
  );
}
