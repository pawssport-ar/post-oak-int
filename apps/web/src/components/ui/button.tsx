import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { Slot } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '@/lib/cn';

const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition-[background-color,border-color,color,transform,box-shadow] duration-150 active:scale-[0.985] disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary: 'bg-accent text-accent-ink hover:bg-accent-hover',
        secondary:
          'border border-line-strong bg-surface text-ink hover:border-ink-3 hover:bg-surface-2',
        ghost: 'text-ink-2 hover:bg-surface-2 hover:text-ink',
        soft: 'bg-accent-soft text-accent-soft-ink hover:brightness-[0.97]',
        danger: 'bg-negative text-white hover:brightness-110 dark:text-oak-950',
        'danger-ghost': 'text-negative hover:bg-negative-soft',
        brass: 'bg-brass-400 text-oak-950 hover:bg-brass-300',
        'on-dark': 'border border-white/20 bg-white/8 text-white hover:bg-white/15',
      },
      size: {
        sm: 'h-8 px-3 text-[13px]',
        md: 'h-9.5 px-4 text-[13.5px]',
        lg: 'h-11 px-5 text-sm',
        icon: 'size-9',
        'icon-sm': 'size-8',
      },
    },
    defaultVariants: { variant: 'secondary', size: 'md' },
  },
);

export type ButtonProps = ComponentProps<'button'> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    loading?: boolean;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  disabled,
  children,
  type = 'button',
  ...props
}: ButtonProps) {
  const classes = cn(buttonVariants({ variant, size }), className);
  if (asChild) {
    return (
      <Slot.Root className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }
  return (
    <button type={type} className={classes} disabled={disabled || loading} {...props}>
      {loading && <Loader2 className="animate-spin" />}
      {children}
    </button>
  );
}
