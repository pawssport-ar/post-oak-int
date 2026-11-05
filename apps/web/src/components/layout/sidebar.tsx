'use client';

import { ChevronsUpDown } from 'lucide-react';
import { motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Logo } from '@/components/brand/logo';
import { Popover } from '@/components/ui/controls';
import { Monogram } from '@/components/ui/monogram';
import { Skeleton } from '@/components/ui/skeleton';
import { useOverview, useSession } from '@/lib/api/queries';
import { cn } from '@/lib/cn';
import { useCan } from '@/lib/use-permission';
import { DemoMenu } from './demo-menu';
import { isActive, NAV, type NavItem } from './nav';

export function Sidebar() {
  const pathname = usePathname();
  const can = useCan();
  const { data: session } = useSession();
  const { data: overview } = useOverview(can('accounts:view'));

  const badgeFor = (item: NavItem): number | undefined => {
    if (item.badge === 'approvals') return overview?.pendingApprovals.count;
    if (item.badge === 'bills') return overview?.upcomingBills.overdueCount;
    return undefined;
  };

  return (
    <aside className="flutes relative hidden w-[248px] shrink-0 flex-col text-frame-ink lg:flex">
      <div className="px-5 pt-6 pb-5">
        <Link href="/" aria-label="Overview" className="inline-block">
          <Logo />
        </Link>
      </div>

      <div className="mx-3 mb-4 flex items-center gap-2.5 rounded-lg border border-frame-line bg-frame-hover px-2.5 py-2">
        <span className="flex size-7 items-center justify-center rounded-md bg-white/12 font-display text-[12.5px]">
          {session?.company.initials ?? ''}
        </span>
        <div className="min-w-0 leading-tight">
          <p className="truncate text-[13px] font-bold">{session?.company.name ?? ' '}</p>
          <p className="truncate text-[11.5px] text-frame-ink-2">
            {session?.company.location ?? ' '}
          </p>
        </div>
      </div>

      <nav className="no-scrollbar flex-1 space-y-4 overflow-y-auto px-3 pb-3">
        {NAV.map((group, index) => {
          const items = group.items.filter((item) => !item.permission || can(item.permission));
          if (items.length === 0) return null;
          return (
            <div key={group.label ?? index}>
              {group.label && (
                <p className="mb-1 px-2.5 text-[10.5px] font-bold tracking-[0.1em] text-frame-ink-2 uppercase">
                  {group.label}
                </p>
              )}
              <ul className="space-y-0.5">
                {items.map((item) => {
                  const active = isActive(item.href, pathname);
                  const badge = badgeFor(item);
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        aria-current={active ? 'page' : undefined}
                        className={cn(
                          'relative flex h-9 items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-semibold transition-colors',
                          active
                            ? 'text-white'
                            : 'text-frame-ink-2 hover:bg-frame-hover hover:text-frame-ink',
                        )}
                      >
                        {active && (
                          <motion.span
                            layoutId="sidebar-active"
                            className="absolute inset-0 rounded-lg bg-frame-active"
                            transition={{ type: 'spring', stiffness: 480, damping: 40 }}
                          />
                        )}
                        <item.icon className="relative size-[17px] shrink-0" />
                        <span className="relative flex-1">{item.label}</span>
                        {badge !== undefined && badge > 0 && (
                          <span className="numeric relative flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-brass-400 px-1 text-[11px] font-bold text-oak-950">
                            {badge}
                          </span>
                        )}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </nav>

      <div className="border-t border-frame-line p-3">
        <Popover
          side="top"
          align="start"
          className="w-[300px]"
          trigger={
            <button
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg p-1.5 text-left transition-colors hover:bg-frame-hover"
            >
              {session ? (
                <Monogram
                  name={session.user.name}
                  initials={session.user.initials}
                  size="sm"
                  round
                  className="bg-white/90 text-oak-900 dark:bg-white/90 dark:text-oak-900"
                />
              ) : (
                <Skeleton className="size-7 rounded-full opacity-30" />
              )}
              <span className="min-w-0 flex-1 leading-tight">
                <span className="block truncate text-[13px] font-bold">
                  {session?.user.name ?? ' '}
                </span>
                <span className="block truncate text-[11.5px] text-frame-ink-2">
                  {session?.user.title ?? ' '}
                </span>
              </span>
              <ChevronsUpDown className="size-3.5 shrink-0 text-frame-ink-2" />
            </button>
          }
        >
          <DemoMenu />
        </Popover>
      </div>
    </aside>
  );
}
