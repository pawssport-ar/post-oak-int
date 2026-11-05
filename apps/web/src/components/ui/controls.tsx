'use client';

import { motion } from 'motion/react';
import {
  Popover as RadixPopover,
  Slider as RadixSlider,
  Switch as RadixSwitch,
  Tooltip as RadixTooltip,
} from 'radix-ui';
import { type ReactNode, useId } from 'react';
import { cn } from '@/lib/cn';

interface SwitchProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  'aria-label'?: string;
}

export function Switch({ checked, onCheckedChange, disabled, 'aria-label': label }: SwitchProps) {
  return (
    <RadixSwitch.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      {...(disabled === undefined ? {} : { disabled })}
      {...(label ? { 'aria-label': label } : {})}
      className="relative h-[22px] w-[38px] shrink-0 rounded-full bg-line-strong transition-colors data-[state=checked]:bg-accent disabled:opacity-50"
    >
      <RadixSwitch.Thumb className="block size-[18px] translate-x-0.5 rounded-full bg-white shadow-sm transition-transform duration-200 ease-out-soft data-[state=checked]:translate-x-[18px] dark:data-[state=checked]:bg-oak-900" />
    </RadixSwitch.Root>
  );
}

interface SliderProps {
  value: number;
  onValueChange: (value: number) => void;
  onValueCommit?: (value: number) => void;
  min: number;
  max: number;
  step: number;
  'aria-label': string;
  disabled?: boolean;
}

export function Slider({
  value,
  onValueChange,
  onValueCommit,
  min,
  max,
  step,
  disabled,
  'aria-label': label,
}: SliderProps) {
  return (
    <RadixSlider.Root
      value={[value]}
      onValueChange={([next]) => next !== undefined && onValueChange(next)}
      {...(onValueCommit
        ? { onValueCommit: ([next]: number[]) => next !== undefined && onValueCommit(next) }
        : {})}
      min={min}
      max={max}
      step={step}
      {...(disabled === undefined ? {} : { disabled })}
      className="relative flex h-5 w-full touch-none items-center select-none data-[disabled]:opacity-50"
    >
      <RadixSlider.Track className="relative h-1.5 grow overflow-hidden rounded-full bg-surface-3">
        <RadixSlider.Range className="absolute h-full rounded-full bg-accent" />
      </RadixSlider.Track>
      <RadixSlider.Thumb
        aria-label={label}
        className="block size-[18px] rounded-full border-2 border-accent bg-surface shadow-sm transition-transform outline-none hover:scale-110 focus-visible:ring-3 focus-visible:ring-oak-500/30"
      />
    </RadixSlider.Root>
  );
}

interface SegmentedProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  options: { value: T; label: ReactNode }[];
  tone?: 'default' | 'on-dark';
  className?: string;
  'aria-label': string;
}

/** Compact mutually exclusive choice, with a pill that slides between options. */
export function Segmented<T extends string>({
  value,
  onValueChange,
  options,
  tone = 'default',
  className,
  'aria-label': label,
}: SegmentedProps<T>) {
  const id = useId();
  const dark = tone === 'on-dark';
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn(
        'inline-flex shrink-0 rounded-lg p-0.5',
        dark ? 'bg-white/8' : 'bg-surface-2',
        className,
      )}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onValueChange(option.value)}
            className={cn(
              'relative h-7 rounded-md px-2.5 text-[12.5px] font-semibold whitespace-nowrap transition-colors',
              dark
                ? active
                  ? 'text-oak-950'
                  : 'text-white/65 hover:text-white'
                : active
                  ? 'text-ink'
                  : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {active && (
              <motion.span
                layoutId={`segmented-${id}`}
                className={cn(
                  'absolute inset-0 rounded-md shadow-sm',
                  dark ? 'bg-white' : 'bg-surface',
                )}
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

interface TabsProps<T extends string> {
  value: T;
  onValueChange: (value: T) => void;
  tabs: { value: T; label: ReactNode; count?: number | undefined }[];
  className?: string;
}

/** Underlined page-level tabs. */
export function Tabs<T extends string>({ value, onValueChange, tabs, className }: TabsProps<T>) {
  const id = useId();
  return (
    <div
      role="tablist"
      className={cn('no-scrollbar flex gap-6 overflow-x-auto border-b border-line', className)}
    >
      {tabs.map((tab) => {
        const active = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onValueChange(tab.value)}
            className={cn(
              'relative flex h-10 shrink-0 items-center gap-1.5 text-[13.5px] font-semibold transition-colors',
              active ? 'text-ink' : 'text-ink-3 hover:text-ink-2',
            )}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span className="numeric rounded-full bg-surface-3 px-1.5 text-[11px] text-ink-2">
                {tab.count}
              </span>
            )}
            {active && (
              <motion.span
                layoutId={`tabs-${id}`}
                className="absolute inset-x-0 -bottom-px h-0.5 bg-accent"
                transition={{ type: 'spring', stiffness: 500, damping: 40 }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

export function Tooltip({
  content,
  children,
  side = 'top',
}: {
  content: ReactNode;
  children: ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
}) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          side={side}
          sideOffset={6}
          className="z-[70] max-w-64 rounded-lg bg-oak-950 px-2.5 py-1.5 text-[12px] leading-snug text-white shadow-pop"
        >
          {content}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}

interface PopoverProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

export function Popover({
  trigger,
  children,
  align = 'start',
  side = 'bottom',
  className,
  open,
  onOpenChange,
}: PopoverProps) {
  return (
    <RadixPopover.Root
      {...(open === undefined ? {} : { open })}
      {...(onOpenChange ? { onOpenChange } : {})}
    >
      <RadixPopover.Trigger asChild>{trigger}</RadixPopover.Trigger>
      <RadixPopover.Portal>
        <RadixPopover.Content
          align={align}
          side={side}
          sideOffset={8}
          collisionPadding={12}
          className={cn(
            'z-50 w-72 rounded-xl border border-line bg-surface shadow-pop outline-none',
            className,
          )}
        >
          {children}
        </RadixPopover.Content>
      </RadixPopover.Portal>
    </RadixPopover.Root>
  );
}

export function Kbd({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        'inline-flex h-5 min-w-5 items-center justify-center rounded border border-line-strong bg-surface-2 px-1 font-sans text-[10.5px] font-semibold text-ink-3',
        className,
      )}
    >
      {children}
    </kbd>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
      <p className="font-display text-[21px] text-ink">{title}</p>
      {description && <p className="mt-1 max-w-sm text-[13.5px] text-ink-3">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
