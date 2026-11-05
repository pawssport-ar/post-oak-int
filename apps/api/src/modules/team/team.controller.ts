import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type ApprovalPolicy,
  type AuditEvent,
  type InviteUserInput,
  InviteUserSchema,
  type UpdatePolicyInput,
  UpdatePolicySchema,
  type UpdateUserInput,
  UpdateUserSchema,
  type User,
} from '@post-oak/contracts';
import { Actor, CurrentWorkspace, RequirePermission } from '../../common/request-context.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import type { Workspace } from '../../core/workspace/workspace.js';
import { TeamService } from './team.service.js';

@ApiTags('Team & controls')
@Controller()
export class TeamController {
  constructor(private readonly team: TeamService) {}

  @Get('team')
  @ApiOperation({ summary: 'List people and their roles' })
  list(@CurrentWorkspace() workspace: Workspace): User[] {
    return workspace.users;
  }

  @Post('team/invite')
  @RequirePermission('team:manage')
  @ApiOperation({ summary: 'Invite a team member' })
  invite(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Body(new ZodPipe(InviteUserSchema)) input: InviteUserInput,
  ): User {
    return this.team.invite(workspace, actor, input);
  }

  @Patch('team/:id')
  @RequirePermission('team:manage')
  @ApiOperation({ summary: 'Change a role' })
  update(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Param('id') id: string,
    @Body(new ZodPipe(UpdateUserSchema)) input: UpdateUserInput,
  ): User {
    return this.team.updateRole(workspace, actor, id, input);
  }

  @Get('policies')
  @RequirePermission('accounts:view')
  @ApiOperation({ summary: 'List approval policies' })
  policies(@CurrentWorkspace() workspace: Workspace): ApprovalPolicy[] {
    return workspace.policies;
  }

  @Patch('policies/:id')
  @RequirePermission('policies:manage')
  @ApiOperation({ summary: 'Enable, disable or re-threshold a policy' })
  updatePolicy(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Param('id') id: string,
    @Body(new ZodPipe(UpdatePolicySchema)) input: UpdatePolicyInput,
  ): ApprovalPolicy {
    return this.team.updatePolicy(workspace, actor, id, input);
  }

  @Get('audit-log')
  @RequirePermission('audit:view')
  @ApiOperation({ summary: 'Read the audit trail' })
  audit(@CurrentWorkspace() workspace: Workspace): AuditEvent[] {
    return workspace.audit.slice(0, 100);
  }
}
