'use client';

import { ArrowLeftRight, CreditCard, LayoutDashboard, Menu, Send, X } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { Logo } from '@/components/brand/logo';
import { cn } from '@/lib/cn';
import { useCan } from '@/lib/use-permission';
import { useAppActions } from './app-context';
import { DemoMenu } from './demo-menu';
import { isActive, NAV } from './nav';

const TABS = [
  { href: '/', label: 'Overview', icon: LayoutDashboard },
  { href: '/transactions', label: 'Activity', icon: ArrowLeftRight },
  { href: '/cards', label: 'Cards', icon: CreditCard },
];

export function MobileNav() {
  const pathname = usePathname();
  const can = useCan();
  const { openSendMoney } = useAppActions();
  const [menuOpen, setMenuOpen] = useState(false);

  const tabs = TABS.filter((tab) => tab.href !== '/' || can('accounts:view'));

  return (
    <>
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-30 flex items-stretch border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-md lg:hidden"
      >
        {tabs.slice(0, 2).map((tab) => (
          <TabLink key={tab.href} {...tab} active={isActive(tab.href, pathname)} />
        ))}
        {can('payments:create') && (
          <button
            type="button"
            onClick={() => openSendMoney()}
            aria-label="Send money"
            className="flex flex-1 items-center justify-center"
          >
            <span className="flex size-11 items-center justify-center rounded-full bg-accent text-accent-ink shadow-pop">
              <Send className="size-[18px]" />
            </span>
          </button>
        )}
        {tabs.slice(2).map((tab) => (
          <TabLink key={tab.href} {...tab} active={isActive(tab.href, pathname)} />
        ))}
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex h-[58px] flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-bold text-ink-3"
        >
          <Menu className="size-5" />
          More
        </button>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="fixed inset-0 z-50 overflow-y-auto bg-frame text-frame-ink lg:hidden"
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="flex items-center justify-between px-5 pt-5 pb-4">
              <Logo />
              <button
                type="button"
                aria-label="Close menu"
                onClick={() => setMenuOpen(false)}
                className="flex size-10 items-center justify-center rounded-lg bg-frame-hover"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="space-y-5 px-4 pb-6">
              {NAV.map((group, index) => {
                const items = group.items.filter(
                  (item) => !item.permission || can(item.permission),
                );
                if (items.length === 0) return null;
                return (
                  <div key={group.label ?? index}>
                    {group.label && (
                      <p className="mb-1 px-2 text-[11px] font-bold tracking-[0.1em] text-frame-ink-2 uppercase">
                        {group.label}
                      </p>
                    )}
                    {items.map((item) => (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMenuOpen(false)}
                        className={cn(
                          'flex h-12 items-center gap-3 rounded-lg px-2 text-[16px] font-semibold',
                          isActive(item.href, pathname) ? 'bg-frame-active' : 'text-frame-ink-2',
                        )}
                      >
                        <item.icon className="size-5" />
                        {item.label}
                      </Link>
                    ))}
                  </div>
                );
              })}
              <div className="rounded-xl bg-surface text-ink">
                <DemoMenu />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function TabLink({
  href,
  label,
  icon: Icon,
  active,
}: {
  href: string;
  label: string;
  icon: typeof Menu;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        'flex h-[58px] flex-1 flex-col items-center justify-center gap-1 text-[10.5px] font-bold transition-colors',
        active ? 'text-ink' : 'text-ink-3',
      )}
    >
      <Icon className="size-5" />
      {label}
    </Link>
  );
}
