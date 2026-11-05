'use client';

import {
  CARD_DESIGNS,
  type Card,
  type CardDesign,
  type CardKind,
  type IssueCardInput,
  LIMIT_PERIODS,
  type LimitPeriod,
} from '@post-oak/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Segmented } from '@/components/ui/controls';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Field, MoneyInput, TextInput } from '@/components/ui/field';
import { Select } from '@/components/ui/select';
import { toastError } from '@/components/ui/toaster';
import { api } from '@/lib/api/client';
import { useAccounts, useTeam } from '@/lib/api/queries';
import { cn } from '@/lib/cn';
import { CardArt } from './card-art';

interface IssueCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onIssued: (card: Card) => void;
}

const SWATCHES: Record<CardDesign, string> = {
  oak: 'bg-[#193e2c]',
  graphite: 'bg-[#231f20]',
  ivory: 'bg-[#f0ead9]',
};

export function IssueCardDialog({ open, onOpenChange, onIssued }: IssueCardDialogProps) {
  const client = useQueryClient();
  const { data: team } = useTeam();
  const { data: accounts } = useAccounts(open);

  const [nickname, setNickname] = useState('');
  const [kind, setKind] = useState<CardKind>('virtual');
  const [design, setDesign] = useState<CardDesign>('oak');
  const [holderId, setHolderId] = useState('usr_jordan');
  const [limit, setLimit] = useState<number | null>(500_000);
  const [period, setPeriod] = useState<LimitPeriod>('monthly');

  const holder = team?.find((user) => user.id === holderId);

  const issue = useMutation({
    mutationFn: (input: IssueCardInput) => api<Card>('/cards', { method: 'POST', body: input }),
    onSuccess: (card) => {
      void client.invalidateQueries({ queryKey: ['cards'] });
      onIssued(card);
      setNickname('');
      onOpenChange(false);
    },
    onError: toastError,
  });

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Issue a card"
      description="Virtual cards work the moment they are issued."
      size="xl"
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (!limit) return;
          issue.mutate({
            nickname,
            kind,
            design,
            holderId,
            accountId: accounts?.[0]?.id ?? 'acc_operating',
            limitAmount: limit,
            limitPeriod: period,
          });
        }}
      >
        <div className="grid gap-8 p-6 md:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            <Field label="Card name">
              {(id) => (
                <TextInput
                  id={id}
                  autoFocus
                  required
                  minLength={2}
                  maxLength={40}
                  value={nickname}
                  onChange={(event) => setNickname(event.target.value)}
                  placeholder="Beaumont yard supplies"
                />
              )}
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Cardholder">
                {(id) => (
                  <Select
                    id={id}
                    value={holderId}
                    onValueChange={setHolderId}
                    options={(team ?? [])
                      .filter((user) => user.status === 'active')
                      .map((user) => ({ value: user.id, label: user.name }))}
                  />
                )}
              </Field>
              <div>
                <p className="mb-1.5 text-[13px] font-semibold text-ink-2">Type</p>
                <Segmented
                  aria-label="Card type"
                  value={kind}
                  onValueChange={setKind}
                  className="h-10 w-full [&>button]:h-9 [&>button]:flex-1"
                  options={[
                    { value: 'virtual', label: 'Virtual' },
                    { value: 'physical', label: 'Physical' },
                  ]}
                />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Spend limit">
                {(id) => <MoneyInput id={id} required cents={limit} onCentsChange={setLimit} />}
              </Field>
              <Field label="Resets">
                {(id) => (
                  <Select
                    id={id}
                    value={period}
                    onValueChange={setPeriod}
                    options={LIMIT_PERIODS.map((value) => ({
                      value,
                      label: value[0]?.toUpperCase() + value.slice(1),
                    }))}
                  />
                )}
              </Field>
            </div>
            <div>
              <p className="mb-1.5 text-[13px] font-semibold text-ink-2">Finish</p>
              <div className="flex gap-2">
                {CARD_DESIGNS.map((value) => (
                  <button
                    key={value}
                    type="button"
                    aria-label={`${value} finish`}
                    aria-pressed={design === value}
                    onClick={() => setDesign(value)}
                    className={cn(
                      'size-9 rounded-full border-2 transition-transform hover:scale-105',
                      SWATCHES[value],
                      design === value
                        ? 'border-oak-500 ring-2 ring-oak-500/30'
                        : 'border-line-strong',
                    )}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center">
            <CardArt
              design={design}
              kind={kind}
              nickname={nickname || 'Card name'}
              holderName={holder?.name ?? ''}
              last4="0000"
              expiry="11/30"
              tilt
              className="w-full [container-type:inline-size]"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant="primary"
            loading={issue.isPending}
            disabled={nickname.trim().length < 2 || !limit}
          >
            Issue card
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}
