import { createParamDecorator, type ExecutionContext, SetMetadata } from '@nestjs/common';
import type { Permission, User } from '@post-oak/contracts';
import type { Request } from 'express';
import type { Workspace } from '../core/workspace/workspace.js';

export interface RequestContext {
  workspace: Workspace;
  actor: User;
}

export type ContextualRequest = Request & { context?: RequestContext };

function contextOf(ctx: ExecutionContext): RequestContext {
  const request = ctx.switchToHttp().getRequest<ContextualRequest>();
  if (!request.context) throw new Error('WorkspaceGuard must run before reading the context');
  return request.context;
}

/** Injects the caller's sandboxed workspace. */
export const CurrentWorkspace = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): Workspace => contextOf(ctx).workspace,
);

/** Injects the user acting in this request. */
export const Actor = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): User => contextOf(ctx).actor,
);

export const PERMISSION_KEY = 'required-permission';

/** Declares the permission a route needs. Enforced by `PermissionsGuard`. */
export const RequirePermission = (permission: Permission) =>
  SetMetadata(PERMISSION_KEY, permission);

export const PUBLIC_KEY = 'public-route';

/** Opts a route out of workspace resolution (health checks). */
export const Public = () => SetMetadata(PUBLIC_KEY, true);
