'use client';

import { Check, ChevronDown } from 'lucide-react';
import { Select as Radix } from 'radix-ui';
import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import { inputClasses } from './field';

export interface SelectOption<T extends string> {
  value: T;
  label: ReactNode;
  hint?: ReactNode;
}

interface SelectProps<T extends string> {
  id?: string;
  value: T | undefined;
  onValueChange: (value: T) => void;
  options: SelectOption<T>[];
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  'aria-label'?: string;
}

export function Select<T extends string>({
  id,
  value,
  onValueChange,
  options,
  placeholder = 'Select',
  className,
  disabled,
  'aria-label': ariaLabel,
}: SelectProps<T>) {
  return (
    <Radix.Root
      {...(value === undefined ? {} : { value })}
      onValueChange={(next) => onValueChange(next as T)}
      {...(disabled === undefined ? {} : { disabled })}
    >
      <Radix.Trigger
        {...(id ? { id } : {})}
        {...(ariaLabel ? { 'aria-label': ariaLabel } : {})}
        className={cn(
          inputClasses,
          'flex items-center justify-between gap-2 text-left data-[placeholder]:text-ink-3',
          className,
        )}
      >
        <span className="truncate">
          <Radix.Value placeholder={placeholder} />
        </span>
        <Radix.Icon>
          <ChevronDown className="size-4 text-ink-3" />
        </Radix.Icon>
      </Radix.Trigger>
      <Radix.Portal>
        <Radix.Content
          position="popper"
          sideOffset={6}
          className="z-[60] max-h-72 w-[var(--radix-select-trigger-width)] min-w-44 overflow-hidden rounded-xl border border-line bg-surface shadow-pop"
        >
          <Radix.Viewport className="p-1">
            {options.map((option) => (
              <Radix.Item
                key={option.value}
                value={option.value}
                className="relative flex cursor-pointer items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-[13.5px] text-ink outline-none select-none data-[highlighted]:bg-surface-2"
              >
                <Radix.ItemText>{option.label}</Radix.ItemText>
                <span className="flex items-center gap-2">
                  {option.hint && <span className="text-[12px] text-ink-3">{option.hint}</span>}
                  <Radix.ItemIndicator>
                    <Check className="size-4 text-positive" />
                  </Radix.ItemIndicator>
                </span>
              </Radix.Item>
            ))}
          </Radix.Viewport>
        </Radix.Content>
      </Radix.Portal>
    </Radix.Root>
  );
}
