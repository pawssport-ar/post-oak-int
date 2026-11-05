import type { Permission } from '@post-oak/contracts';
import {
  ArrowLeftRight,
  ChartSpline,
  CreditCard,
  FileText,
  Landmark,
  LayoutDashboard,
  type LucideIcon,
  ReceiptText,
  Send,
  UsersRound,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { ColumnMark } from '@/components/brand/logo';

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon | ComponentType<{ className?: string }>;
  /** Hidden when the acting user lacks this permission. */
  permission?: Permission;
  badge?: 'approvals' | 'bills';
}

export interface NavGroup {
  label?: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    items: [
      { href: '/', label: 'Overview', icon: LayoutDashboard, permission: 'accounts:view' },
      { href: '/accounts', label: 'Accounts', icon: Landmark, permission: 'accounts:view' },
      { href: '/transactions', label: 'Transactions', icon: ArrowLeftRight },
    ],
  },
  {
    label: 'Move money',
    items: [
      {
        href: '/payments',
        label: 'Payments',
        icon: Send,
        permission: 'accounts:view',
        badge: 'approvals',
      },
      { href: '/cards', label: 'Cards', icon: CreditCard },
      {
        href: '/bills',
        label: 'Bills',
        icon: ReceiptText,
        permission: 'accounts:view',
        badge: 'bills',
      },
      { href: '/invoices', label: 'Invoices', icon: FileText, permission: 'accounts:view' },
    ],
  },
  {
    label: 'Grow',
    items: [
      { href: '/insights', label: 'Insights', icon: ChartSpline, permission: 'insights:view' },
      { href: '/capital', label: 'Capital', icon: ColumnMark, permission: 'insights:view' },
    ],
  },
  {
    label: 'Company',
    items: [{ href: '/team', label: 'Team & controls', icon: UsersRound }],
  },
];

export function isActive(href: string, pathname: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href);
}
