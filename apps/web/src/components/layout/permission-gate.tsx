'use client';

import type { Permission } from '@post-oak/contracts';
import { ROLE_LABELS } from '@post-oak/contracts';
import { ShieldOff } from 'lucide-react';
import type { ReactNode } from 'react';
import { Panel } from '@/components/ui/panel';
import { useSession } from '@/lib/api/queries';

/**
 * Explains a restricted page instead of showing a broken one. The API would refuse
 * the data regardless, so this is courtesy rather than security.
 */
export function PermissionGate({
  permission,
  children,
}: {
  permission: Permission;
  children: ReactNode;
}) {
  const { data: session } = useSession();
  if (!session || session.permissions.includes(permission)) return children;

  return (
    <Panel className="mx-auto mt-16 max-w-md px-8 py-10 text-center">
      <ShieldOff className="mx-auto size-7 text-ink-3" />
      <h1 className="mt-3 font-display text-[26px] leading-tight text-ink">
        Not available for this role
      </h1>
      <p className="mt-1.5 text-[14px] text-ink-2">
        {ROLE_LABELS[session.user.role]} access does not include this page. Switch persona from the
        menu at the bottom of the sidebar to compare.
      </p>
    </Panel>
  );
}
