import { z } from 'zod';
import { positiveCentsSchema, type Cents, type IsoDateTime } from './shared.js';
import { PAYMENT_RAILS, type PaymentRail } from './payments.js';

export const ROLES = ['owner', 'admin', 'bookkeeper', 'employee'] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  owner: 'Owner',
  admin: 'Finance admin',
  bookkeeper: 'Bookkeeper',
  employee: 'Cardholder',
};

export const ROLE_SUMMARIES: Record<Role, string> = {
  owner: 'Full control of the banking relationship, team and policies.',
  admin: 'Moves money, approves payments and manages cards.',
  bookkeeper: 'Prepares payments and reconciles books. Cannot approve.',
  employee: 'Sees their own cards and activity only.',
};

export const PERMISSIONS = {
  'accounts:view': 'View account balances and statements',
  'accounts:reveal': 'Reveal full account numbers',
  'transactions:edit': 'Categorize and annotate transactions',
  'payments:create': 'Create payments and manage recipients',
  'payments:approve': 'Approve or reject payments',
  'cards:manage': 'Issue cards and change limits',
  'cards:reveal': 'Reveal full card details',
  'bills:manage': 'Manage and pay bills',
  'invoices:manage': 'Create and send invoices',
  'insights:view': 'View insights and capital readiness',
  'team:manage': 'Manage people and roles',
  'policies:manage': 'Change approval policies',
  'audit:view': 'View the audit log',
} as const;

export type Permission = keyof typeof PERMISSIONS;
export const PERMISSION_IDS = Object.keys(PERMISSIONS) as Permission[];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  owner: PERMISSION_IDS,
  admin: [
    'accounts:view',
    'accounts:reveal',
    'transactions:edit',
    'payments:create',
    'payments:approve',
    'cards:manage',
    'cards:reveal',
    'bills:manage',
    'invoices:manage',
    'insights:view',
    'audit:view',
  ],
  bookkeeper: [
    'accounts:view',
    'transactions:edit',
    'payments:create',
    'bills:manage',
    'invoices:manage',
    'insights:view',
  ],
  employee: [],
};

export function can(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export interface User {
  id: string;
  name: string;
  initials: string;
  email: string;
  title: string;
  role: Role;
  status: 'active' | 'invited';
  twoFactor: boolean;
  lastActiveAt: IsoDateTime | null;
}

export const InviteUserSchema = z.object({
  name: z.string().trim().min(2, 'Enter a name').max(60),
  email: z.email('Enter a valid email'),
  title: z.string().trim().min(2, 'Enter a title').max(60),
  role: z.enum(ROLES),
});
export type InviteUserInput = z.infer<typeof InviteUserSchema>;

export const UpdateUserSchema = z.object({ role: z.enum(ROLES) });
export type UpdateUserInput = z.infer<typeof UpdateUserSchema>;

export interface ApprovalPolicy {
  id: string;
  name: string;
  description: string;
  rails: PaymentRail[];
  /** Applies at or above this amount. Zero means every payment on the rail. */
  threshold: Cents;
  onlyNewRecipients: boolean;
  approvalsRequired: number;
  enabled: boolean;
}

export const UpdatePolicySchema = z
  .object({
    enabled: z.boolean().optional(),
    threshold: positiveCentsSchema.optional(),
    rails: z.array(z.enum(PAYMENT_RAILS)).min(1).optional(),
  })
  .refine((value) => Object.keys(value).length > 0, { message: 'Provide at least one field' });
export type UpdatePolicyInput = z.infer<typeof UpdatePolicySchema>;

export interface AuditEvent {
  id: string;
  at: IsoDateTime;
  actorId: string | null;
  actorName: string;
  action: string;
  target: string;
  detail: string | null;
}
