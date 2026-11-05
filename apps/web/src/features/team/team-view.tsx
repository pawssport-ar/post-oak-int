'use client';

import {
  type ApprovalPolicy,
  type InviteUserInput,
  PERMISSION_IDS,
  PERMISSIONS,
  RAIL_LABELS,
  type Role,
  ROLE_LABELS,
  ROLE_PERMISSIONS,
  ROLE_SUMMARIES,
  ROLES,
  type UpdatePolicyInput,
  type User,
} from '@post-oak/contracts';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Check, Minus, Plus, ShieldCheck, Smartphone } from 'lucide-react';
import { parseAsStringLiteral, useQueryState } from 'nuqs';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Slider, Switch, Tabs } from '@/components/ui/controls';
import { Dialog, DialogFooter } from '@/components/ui/dialog';
import { Field, TextInput } from '@/components/ui/field';
import { Monogram } from '@/components/ui/monogram';
import { PageHeader, Panel } from '@/components/ui/panel';
import { Reveal, RevealItem } from '@/components/ui/reveal';
import { Select } from '@/components/ui/select';
import { RowsSkeleton } from '@/components/ui/skeleton';
import { StatusPill } from '@/components/ui/status-pill';
import { toast, toastError } from '@/components/ui/toaster';
import { api } from '@/lib/api/client';
import { useAuditLog, usePolicies, useSession, useTeam } from '@/lib/api/queries';
import { dateTime, moneyWhole, relativeTime } from '@/lib/format';
import { useCan } from '@/lib/use-permission';

const TABS = ['people', 'roles', 'policies', 'audit'] as const;

const ROLE_OPTIONS = ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }));

function PeopleTab({ onInvite }: { onInvite: () => void }) {
  const can = useCan();
  const client = useQueryClient();
  const { data: session } = useSession();
  const { data: team } = useTeam();
  const canManage = can('team:manage');

  const update = useMutation({
    mutationFn: ({ id, role }: { id: string; role: Role }) =>
      api<User>(`/team/${id}`, { method: 'PATCH', body: { role } }),
    onSuccess: (user) => {
      void client.invalidateQueries({ queryKey: ['team'] });
      void client.invalidateQueries({ queryKey: ['session'] });
      toast({
        title: 'Role updated',
        description: `${user.name} is now ${ROLE_LABELS[user.role]}.`,
        tone: 'positive',
      });
    },
    onError: toastError,
  });

  return (
    <Panel className="overflow-hidden">
      {!team ? (
        <RowsSkeleton />
      ) : (
        <ul className="divide-y divide-line">
          {team.map((user) => (
            <li key={user.id} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3">
              <Monogram name={user.name} initials={user.initials} round />
              <div className="min-w-0 flex-1 basis-44 leading-tight">
                <p className="flex items-center gap-2">
                  <span className="truncate text-[14px] font-bold text-ink">{user.name}</span>
                  {user.id === session?.user.id && <StatusPill dot={false}>You</StatusPill>}
                  {user.status === 'invited' && <StatusPill tone="info">Invited</StatusPill>}
                </p>
                <p className="mt-0.5 truncate text-[12.5px] text-ink-3">
                  {user.title} · {user.email}
                </p>
              </div>
              <span className="hidden items-center gap-1.5 text-[12.5px] text-ink-3 md:flex">
                <Smartphone className="size-3.5" />
                {user.twoFactor ? '2FA on' : '2FA pending'}
              </span>
              <span className="hidden w-28 text-right text-[12.5px] text-ink-3 md:block">
                {user.lastActiveAt ? relativeTime(user.lastActiveAt) : 'Not yet active'}
              </span>
              <div className="w-40 shrink-0">
                {canManage && user.id !== session?.user.id ? (
                  <Select
                    aria-label={`Role for ${user.name}`}
                    value={user.role}
                    options={ROLE_OPTIONS}
                    className="h-9"
                    onValueChange={(role) => update.mutate({ id: user.id, role })}
                  />
                ) : (
                  <p className="text-right text-[13px] font-semibold text-ink-2">
                    {ROLE_LABELS[user.role]}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {canManage && (
        <div className="border-t border-line px-5 py-3">
          <Button size="sm" onClick={onInvite}>
            <Plus />
            Invite someone
          </Button>
        </div>
      )}
    </Panel>
  );
}

function RolesTab() {
  return (
    <Panel className="overflow-x-auto">
      <table className="w-full min-w-[640px] text-[13px]">
        <thead>
          <tr className="border-b border-line">
            <th className="px-5 py-3 text-left font-normal">
              <span className="eyebrow">Permission</span>
            </th>
            {ROLES.map((role) => (
              <th key={role} className="px-3 py-3 text-center">
                <span className="block font-display text-[16px] font-normal text-ink">
                  {ROLE_LABELS[role]}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-line">
          {PERMISSION_IDS.map((permission) => (
            <tr key={permission}>
              <td className="px-5 py-2 text-ink-2">{PERMISSIONS[permission]}</td>
              {ROLES.map((role) => (
                <td key={role} className="px-3 py-2 text-center">
                  {ROLE_PERMISSIONS[role].includes(permission) ? (
                    <Check className="mx-auto size-4 text-positive" aria-label="Allowed" />
                  ) : (
                    <Minus className="mx-auto size-4 text-line-strong" aria-label="Not allowed" />
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t border-line bg-surface-2/50">
            <td className="px-5 py-3 text-[12.5px] text-ink-3">
              Enforced by the API, whatever the interface shows.
            </td>
            {ROLES.map((role) => (
              <td
                key={role}
                className="px-3 py-3 text-center text-[11.5px] leading-snug text-ink-3"
              >
                {ROLE_SUMMARIES[role]}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </Panel>
  );
}

function PolicyRow({ policy, editable }: { policy: ApprovalPolicy; editable: boolean }) {
  const client = useQueryClient();
  const [threshold, setThreshold] = useState(policy.threshold);

  const update = useMutation({
    mutationFn: (input: UpdatePolicyInput) =>
      api<ApprovalPolicy>(`/policies/${policy.id}`, { method: 'PATCH', body: input }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['team'] }),
    onError: toastError,
  });

  return (
    <li className="px-5 py-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-accent-soft-ink">
          <ShieldCheck className="size-4" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-bold text-ink">{policy.name}</p>
          <p className="mt-0.5 text-[13px] text-ink-2">{policy.description}</p>
          <p className="mt-1 text-[12.5px] text-ink-3">
            Applies to {policy.rails.map((rail) => RAIL_LABELS[rail]).join(', ')}
          </p>
        </div>
        <Switch
          aria-label={`Enable ${policy.name}`}
          disabled={!editable}
          checked={policy.enabled}
          onCheckedChange={(enabled) => update.mutate({ enabled })}
        />
      </div>
      {!policy.onlyNewRecipients && (
        <div className="mt-3 ml-12 max-w-md">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-[13px] font-semibold text-ink-2">Threshold</span>
            <span className="numeric text-[13.5px] font-bold text-ink">
              {moneyWhole(threshold)}
            </span>
          </div>
          <Slider
            aria-label={`Threshold for ${policy.name}`}
            disabled={!editable || !policy.enabled}
            min={500_000}
            max={25_000_000}
            step={500_000}
            value={threshold}
            onValueChange={setThreshold}
            onValueCommit={(value) => update.mutate({ threshold: value })}
          />
        </div>
      )}
    </li>
  );
}

function PoliciesTab() {
  const can = useCan();
  const { data: policies } = usePolicies();
  return (
    <Panel className="overflow-hidden">
      {!policies ? (
        <RowsSkeleton rows={3} />
      ) : (
        <ul className="divide-y divide-line">
          {policies.map((policy) => (
            <PolicyRow key={policy.id} policy={policy} editable={can('policies:manage')} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

function AuditTab() {
  const { data: events } = useAuditLog(true);
  return (
    <Panel className="overflow-hidden">
      {!events ? (
        <RowsSkeleton />
      ) : (
        <ul className="divide-y divide-line">
          {events.map((event) => (
            <li key={event.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-5 py-2.5">
              <Monogram name={event.actorName} size="sm" round />
              <p className="min-w-0 flex-1 basis-56 text-[13.5px] text-ink">
                <span className="font-bold">{event.actorName}</span>{' '}
                <span className="text-ink-2">{event.action.toLowerCase()}</span>{' '}
                <span className="font-semibold">{event.target}</span>
                {event.detail && <span className="text-ink-3"> · {event.detail}</span>}
              </p>
              <span className="shrink-0 text-[12.5px] text-ink-3">{dateTime(event.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function InviteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const client = useQueryClient();
  const [form, setForm] = useState<InviteUserInput>({
    name: '',
    email: '',
    title: '',
    role: 'bookkeeper',
  });

  const invite = useMutation({
    mutationFn: () => api<User>('/team/invite', { method: 'POST', body: form }),
    onSuccess: (user) => {
      void client.invalidateQueries({ queryKey: ['team'] });
      toast({
        title: 'Invitation sent',
        description: `${user.name} will get an email.`,
        tone: 'positive',
      });
      setForm({ name: '', email: '', title: '', role: 'bookkeeper' });
      onClose();
    },
    onError: toastError,
  });

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()} title="Invite a team member">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          invite.mutate();
        }}
      >
        <div className="grid gap-4 p-6 sm:grid-cols-2">
          <Field label="Full name">
            {(id) => (
              <TextInput
                id={id}
                required
                autoFocus
                value={form.name}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
              />
            )}
          </Field>
          <Field label="Work email">
            {(id) => (
              <TextInput
                id={id}
                required
                type="email"
                value={form.email}
                onChange={(event) => setForm({ ...form, email: event.target.value })}
              />
            )}
          </Field>
          <Field label="Title">
            {(id) => (
              <TextInput
                id={id}
                required
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
              />
            )}
          </Field>
          <Field label="Role" hint={ROLE_SUMMARIES[form.role]}>
            {(id) => (
              <Select
                id={id}
                value={form.role}
                options={ROLE_OPTIONS}
                onValueChange={(role) => setForm({ ...form, role })}
              />
            )}
          </Field>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" loading={invite.isPending}>
            Send invitation
          </Button>
        </DialogFooter>
      </form>
    </Dialog>
  );
}

export function TeamView() {
  const can = useCan();
  const [tab, setTab] = useQueryState('tab', parseAsStringLiteral(TABS).withDefault('people'));
  const [inviting, setInviting] = useState(false);

  return (
    <Reveal>
      <RevealItem>
        <PageHeader
          title="Team & controls"
          description="Who can do what, and which payments need a second pair of eyes."
        />
      </RevealItem>
      <RevealItem>
        <Tabs
          value={tab}
          onValueChange={setTab}
          className="mb-4"
          tabs={[
            { value: 'people', label: 'People' },
            { value: 'roles', label: 'Roles' },
            ...(can('accounts:view')
              ? [{ value: 'policies' as const, label: 'Approval policies' }]
              : []),
            ...(can('audit:view') ? [{ value: 'audit' as const, label: 'Audit log' }] : []),
          ]}
        />
      </RevealItem>
      <RevealItem>
        {tab === 'people' && <PeopleTab onInvite={() => setInviting(true)} />}
        {tab === 'roles' && <RolesTab />}
        {tab === 'policies' && <PoliciesTab />}
        {tab === 'audit' && <AuditTab />}
      </RevealItem>
      <InviteDialog open={inviting} onClose={() => setInviting(false)} />
    </Reveal>
  );
}
