import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { WorkspaceStore } from '../core/workspace/workspace.store.js';
import { type ContextualRequest, PUBLIC_KEY } from './request-context.js';

const SANDBOX_HEADER = 'x-sandbox-id';
const DEFAULT_SANDBOX = 'public-sandbox';
const SANDBOX_ID = /^[a-zA-Z0-9-]{8,64}$/;

/**
 * Every visitor gets an isolated copy of the demo data, keyed by a sandbox id the
 * web app stores in an httpOnly cookie. In production this guard is where session
 * authentication and tenant resolution would live.
 */
@Injectable()
export class WorkspaceGuard implements CanActivate {
  constructor(
    private readonly store: WorkspaceStore,
    private readonly reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<ContextualRequest>();
    const header = request.header(SANDBOX_HEADER);
    const sandboxId = header && SANDBOX_ID.test(header) ? header : DEFAULT_SANDBOX;

    const workspace = this.store.resolve(sandboxId);
    const actor = workspace.users.find((user) => user.id === workspace.actingUserId);
    if (!actor) throw new Error(`Workspace ${workspace.id} has no acting user`);

    request.context = { workspace, actor };
    return true;
  }
}
