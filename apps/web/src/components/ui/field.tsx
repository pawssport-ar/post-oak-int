'use client';

import type { ComponentProps, ReactNode } from 'react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

export const inputClasses =
  'h-10 w-full rounded-lg border border-line-strong bg-surface px-3 text-[14px] text-ink outline-none transition placeholder:text-ink-3 hover:border-ink-3 focus:border-oak-500 focus:ring-3 focus:ring-oak-500/15 disabled:opacity-60';

interface FieldProps {
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
  className?: string;
  children: (id: string) => ReactNode;
}

export function Field({ label, hint, error, className, children }: FieldProps) {
  const id = useId();
  return (
    <div className={cn('space-y-1.5', className)}>
      <label htmlFor={id} className="block text-[13px] font-semibold text-ink-2">
        {label}
      </label>
      {children(id)}
      {error ? (
        <p className="text-[12.5px] text-negative">{error}</p>
      ) : (
        hint && <p className="text-[12.5px] text-ink-3">{hint}</p>
      )}
    </div>
  );
}

export function TextInput({ className, ...props }: ComponentProps<'input'>) {
  return <input className={cn(inputClasses, className)} {...props} />;
}

export function TextArea({ className, ...props }: ComponentProps<'textarea'>) {
  return <textarea className={cn(inputClasses, 'h-auto min-h-20 py-2.5', className)} {...props} />;
}

interface MoneyInputProps extends Omit<ComponentProps<'input'>, 'value' | 'onChange'> {
  /** Controlled value in cents, or null when empty. */
  cents: number | null;
  onCentsChange: (cents: number | null) => void;
}

function toDisplay(cents: number | null): string {
  if (cents === null) return '';
  const dollars = Math.floor(cents / 100).toLocaleString('en-US');
  const fraction = cents % 100;
  return fraction === 0 ? dollars : `${dollars}.${String(fraction).padStart(2, '0')}`;
}

/** Dollars in the input, integer cents in state. */
export function MoneyInput({ cents, onCentsChange, className, ...props }: MoneyInputProps) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-3">
        $
      </span>
      <input
        inputMode="decimal"
        className={cn(inputClasses, 'numeric pl-6.5', className)}
        value={toDisplay(cents)}
        onChange={(event) => {
          const digits = event.target.value.replace(/[^\d.]/g, '');
          if (digits === '') {
            onCentsChange(null);
            return;
          }
          const [whole = '0', fraction = ''] = digits.split('.');
          const value = Number(whole) * 100 + Number(fraction.padEnd(2, '0').slice(0, 2));
          if (Number.isSafeInteger(value)) onCentsChange(value);
        }}
        {...props}
      />
    </div>
  );
}
