import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** The standard content surface. Hairline-framed, like a page in an offering memorandum. */
export function Panel({ className, ...props }: ComponentProps<'section'>) {
  return (
    <section
      className={cn('rounded-xl border border-line bg-surface shadow-card', className)}
      {...props}
    />
  );
}

interface PanelHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function PanelHeader({ title, description, action, className }: PanelHeaderProps) {
  return (
    <header className={cn('flex items-start justify-between gap-4 px-5 pt-4.5 pb-3', className)}>
      <div className="min-w-0">
        <h2 className="font-display text-[21px] leading-tight text-ink">{title}</h2>
        {description && <p className="mt-0.5 text-[13px] text-ink-3">{description}</p>}
      </div>
      {action && <div className="flex shrink-0 items-center gap-2">{action}</div>}
    </header>
  );
}

interface PageHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0">
        <h1 className="font-display text-[34px] leading-[1.1] tracking-[-0.01em] text-ink">
          {title}
        </h1>
        {description && <p className="mt-1.5 max-w-2xl text-[14px] text-ink-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
