import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { User } from '@post-oak/contracts';
import type { Workspace } from '../workspace/workspace.js';

/** Append-only trail of sensitive actions. */
@Injectable()
export class AuditService {
  record(
    workspace: Workspace,
    actor: User | null,
    action: string,
    target: string,
    detail: string | null = null,
  ): void {
    workspace.audit.unshift({
      id: `aud_${randomUUID().slice(0, 10)}`,
      at: new Date().toISOString(),
      actorId: actor?.id ?? null,
      actorName: actor?.name ?? 'System',
      action,
      target,
      detail,
    });
  }
}
