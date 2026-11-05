import type { IsoDateTime } from './shared.js';

/** Client cache scopes a server event can invalidate. */
export const QUERY_SCOPES = [
  'session',
  'overview',
  'accounts',
  'transactions',
  'payments',
  'recipients',
  'cards',
  'bills',
  'invoices',
  'insights',
  'capital',
  'team',
  'notifications',
] as const;
export type QueryScope = (typeof QUERY_SCOPES)[number];

export type NotificationTone = 'neutral' | 'positive' | 'attention';

export interface Notification {
  id: string;
  at: IsoDateTime;
  title: string;
  body: string;
  tone: NotificationTone;
  href: string | null;
  read: boolean;
}

export interface RealtimeEvent {
  id: string;
  type: string;
  at: IsoDateTime;
  invalidate: QueryScope[];
  /** Present when the event should surface to the person using the app. */
  notification: Notification | null;
}
