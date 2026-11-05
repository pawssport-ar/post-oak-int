'use client';

import { Check, ChevronDown, X } from 'lucide-react';
import { type ReactNode, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Popover } from '@/components/ui/controls';
import { Field, MoneyInput, TextInput } from '@/components/ui/field';
import { cn } from '@/lib/cn';
import { money } from '@/lib/format';

function FilterButton({
  label,
  active,
  ...props
}: {
  label: ReactNode;
  active: boolean;
} & React.ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-[13px] font-semibold transition-colors',
        active
          ? 'border-accent bg-accent-soft text-accent-soft-ink'
          : 'border-line bg-surface text-ink-2 hover:border-line-strong hover:text-ink',
      )}
      {...props}
    >
      {label}
      <ChevronDown className="size-3.5 opacity-60" />
    </button>
  );
}

interface MultiFilterProps<T extends string> {
  label: string;
  options: { value: T; label: string }[];
  selected: T[];
  onChange: (values: T[]) => void;
}

export function MultiFilter<T extends string>({
  label,
  options,
  selected,
  onChange,
}: MultiFilterProps<T>) {
  const toggle = (value: T) =>
    onChange(
      selected.includes(value) ? selected.filter((item) => item !== value) : [...selected, value],
    );

  return (
    <Popover
      className="w-64"
      trigger={
        <FilterButton
          active={selected.length > 0}
          label={
            selected.length === 0
              ? label
              : selected.length === 1
                ? (options.find((option) => option.value === selected[0])?.label ?? label)
                : `${label} · ${selected.length}`
          }
        />
      }
    >
      <ul className="max-h-72 overflow-y-auto p-1.5">
        {options.map((option) => {
          const checked = selected.includes(option.value);
          return (
            <li key={option.value}>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => toggle(option.value)}
                className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-left text-[13.5px] text-ink transition-colors hover:bg-surface-2"
              >
                <span
                  className={cn(
                    'flex size-4 items-center justify-center rounded border transition-colors',
                    checked ? 'border-accent bg-accent text-accent-ink' : 'border-line-strong',
                  )}
                >
                  {checked && <Check className="size-3" strokeWidth={3} />}
                </span>
                {option.label}
              </button>
            </li>
          );
        })}
      </ul>
    </Popover>
  );
}

const DATE_PRESETS = [
  { label: 'Last 7 days', days: 7 },
  { label: 'Last 30 days', days: 30 },
  { label: 'Last 90 days', days: 90 },
  { label: 'Year to date', days: null },
] as const;

const isoDaysAgo = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().slice(0, 10);
};

export function DateFilter({
  from,
  to,
  onChange,
}: {
  from: string | null;
  to: string | null;
  onChange: (range: { from: string | null; to: string | null }) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = Boolean(from || to);
  const pick = (range: { from: string | null; to: string | null }) => {
    onChange(range);
    setOpen(false);
  };

  return (
    <Popover
      open={open}
      onOpenChange={setOpen}
      className="w-64"
      trigger={
        <FilterButton
          active={active}
          label={active ? `${from ?? 'Start'} to ${to ?? 'today'}` : 'Date'}
        />
      }
    >
      <div className="p-1.5">
        {DATE_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() =>
              pick({
                from:
                  preset.days === null
                    ? `${new Date().getFullYear()}-01-01`
                    : isoDaysAgo(preset.days),
                to: null,
              })
            }
            className="block w-full rounded-lg px-2.5 py-1.5 text-left text-[13.5px] text-ink transition-colors hover:bg-surface-2"
          >
            {preset.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 border-t border-line p-3">
        <Field label="From">
          {(id) => (
            <TextInput
              id={id}
              type="date"
              className="h-9 px-2 text-[12.5px]"
              value={from ?? ''}
              onChange={(event) => onChange({ from: event.target.value || null, to })}
            />
          )}
        </Field>
        <Field label="To">
          {(id) => (
            <TextInput
              id={id}
              type="date"
              className="h-9 px-2 text-[12.5px]"
              value={to ?? ''}
              onChange={(event) => onChange({ from, to: event.target.value || null })}
            />
          )}
        </Field>
      </div>
    </Popover>
  );
}

export function AmountFilter({
  min,
  max,
  onChange,
}: {
  min: number | null;
  max: number | null;
  onChange: (range: { min: number | null; max: number | null }) => void;
}) {
  const active = min !== null || max !== null;
  const label = !active
    ? 'Amount'
    : min !== null && max !== null
      ? `${money(min)} to ${money(max)}`
      : min !== null
        ? `Over ${money(min)}`
        : `Under ${money(max ?? 0)}`;

  return (
    <Popover className="w-64" trigger={<FilterButton active={active} label={label} />}>
      <div className="grid grid-cols-2 gap-2 p-3">
        <Field label="Minimum">
          {(id) => (
            <MoneyInput
              id={id}
              className="h-9"
              cents={min}
              onCentsChange={(next) => onChange({ min: next, max })}
            />
          )}
        </Field>
        <Field label="Maximum">
          {(id) => (
            <MoneyInput
              id={id}
              className="h-9"
              cents={max}
              onCentsChange={(next) => onChange({ min, max: next })}
            />
          )}
        </Field>
      </div>
    </Popover>
  );
}

export function ClearFilters({ onClear }: { onClear: () => void }) {
  return (
    <Button size="sm" variant="ghost" onClick={onClear}>
      <X />
      Clear
    </Button>
  );
}
