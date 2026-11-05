import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type Notification,
  ROLE_PERMISSIONS,
  type Session,
  type SwitchPersonaInput,
  SwitchPersonaSchema,
  type User,
} from '@post-oak/contracts';
import { DomainError } from '../../common/domain-error.js';
import { Actor, CurrentWorkspace } from '../../common/request-context.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import { RealtimeService } from '../../core/realtime/realtime.service.js';
import type { Workspace } from '../../core/workspace/workspace.js';
import { WorkspaceStore } from '../../core/workspace/workspace.store.js';

@ApiTags('Session')
@Controller()
export class SessionController {
  constructor(
    private readonly store: WorkspaceStore,
    private readonly realtime: RealtimeService,
  ) {}

  @Get('session')
  @ApiOperation({ summary: 'The company, acting user, permissions and demo personas' })
  session(@CurrentWorkspace() workspace: Workspace, @Actor() actor: User): Session {
    return this.present(workspace, actor);
  }

  @Post('session/persona')
  @HttpCode(200)
  @ApiOperation({ summary: 'Act as another team member, to demonstrate roles and approvals' })
  switchPersona(
    @CurrentWorkspace() workspace: Workspace,
    @Body(new ZodPipe(SwitchPersonaSchema)) input: SwitchPersonaInput,
  ): Session {
    const user = workspace.users.find((u) => u.id === input.userId && u.status === 'active');
    if (!user) throw DomainError.notFound('Team member');
    workspace.actingUserId = user.id;
    return this.present(workspace, user);
  }

  @Post('session/reset')
  @HttpCode(200)
  @ApiOperation({ summary: 'Restore this sandbox to its original data' })
  reset(@CurrentWorkspace() workspace: Workspace): { ok: true } {
    const fresh = this.store.reset(workspace.id);
    this.realtime.publish(fresh, 'workspace.reset', [
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
    ]);
    return { ok: true };
  }

  @Get('notifications')
  @ApiOperation({ summary: 'Recent notifications' })
  notifications(@CurrentWorkspace() workspace: Workspace): Notification[] {
    return workspace.notifications.slice(0, 30);
  }

  @Post('notifications/read')
  @HttpCode(200)
  @ApiOperation({ summary: 'Mark every notification as read' })
  markRead(@CurrentWorkspace() workspace: Workspace): { ok: true } {
    for (const notification of workspace.notifications) notification.read = true;
    return { ok: true };
  }

  private present(workspace: Workspace, actor: User): Session {
    return {
      company: workspace.company,
      user: actor,
      permissions: [...ROLE_PERMISSIONS[actor.role]],
      personas: workspace.users.filter((user) => user.status === 'active'),
      sandboxCreatedAt: workspace.createdAt.toISOString(),
    };
  }
}
