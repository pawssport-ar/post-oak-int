import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { can, type Permission, PERMISSIONS, ROLE_LABELS } from '@post-oak/contracts';
import { DomainError } from './domain-error.js';
import { type ContextualRequest, PERMISSION_KEY } from './request-context.js';

/** Enforces `@RequirePermission()` on the server, whatever the UI chose to show. */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const permission = this.reflector.getAllAndOverride<Permission | undefined>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!permission) return true;

    const { context: requestContext } = context.switchToHttp().getRequest<ContextualRequest>();
    if (!requestContext) return false;

    const { role } = requestContext.actor;
    if (can(role, permission)) return true;

    throw DomainError.forbidden(
      `${ROLE_LABELS[role]} accounts cannot do this. Required: ${PERMISSIONS[permission]}.`,
    );
  }
}
