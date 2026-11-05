'use client';

import type { Permission } from '@post-oak/contracts';
import { useSession } from './api/queries';

/** Mirrors the server's permission check, purely to shape the UI. The API still enforces it. */
export function useCan(): (permission: Permission) => boolean {
  const { data } = useSession();
  return (permission) => data?.permissions.includes(permission) ?? false;
}
