import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  type ApprovalPolicy,
  formatCents,
  type InviteUserInput,
  ROLE_LABELS,
  type UpdatePolicyInput,
  type UpdateUserInput,
  type User,
} from '@post-oak/contracts';
import { DomainError } from '../../common/domain-error.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { RealtimeService } from '../../core/realtime/realtime.service.js';
import type { Workspace } from '../../core/workspace/workspace.js';

@Injectable()
export class TeamService {
  constructor(
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  invite(workspace: Workspace, actor: User, input: InviteUserInput): User {
    if (workspace.users.some((u) => u.email.toLowerCase() === input.email.toLowerCase())) {
      throw DomainError.conflict('duplicate_user', `${input.email} is already on the team.`);
    }
    const user: User = {
      id: `usr_${randomUUID().slice(0, 10)}`,
      name: input.name,
      initials: input.name
        .split(' ')
        .map((part) => part[0])
        .join('')
        .slice(0, 2)
        .toUpperCase(),
      email: input.email,
      title: input.title,
      role: input.role,
      status: 'invited',
      twoFactor: false,
      lastActiveAt: null,
    };
    workspace.users.push(user);
    this.audit.record(workspace, actor, 'Invited team member', user.name, ROLE_LABELS[user.role]);
    this.realtime.publish(workspace, 'team.invited', ['team', 'session']);
    return user;
  }

  updateRole(workspace: Workspace, actor: User, id: string, input: UpdateUserInput): User {
    const user = workspace.users.find((u) => u.id === id);
    if (!user) throw DomainError.notFound('Team member');
    if (user.id === actor.id) {
      throw DomainError.forbidden('Ask another owner to change your own role.');
    }
    const owners = workspace.users.filter((u) => u.role === 'owner');
    if (user.role === 'owner' && owners.length === 1 && input.role !== 'owner') {
      throw DomainError.conflict('last_owner', 'The company must keep at least one owner.');
    }
    const previous = user.role;
    user.role = input.role;
    this.audit.record(
      workspace,
      actor,
      'Changed role',
      user.name,
      `${ROLE_LABELS[previous]} to ${ROLE_LABELS[input.role]}`,
    );
    this.realtime.publish(workspace, 'team.updated', ['team', 'session']);
    return user;
  }

  updatePolicy(
    workspace: Workspace,
    actor: User,
    id: string,
    input: UpdatePolicyInput,
  ): ApprovalPolicy {
    const policy = workspace.policies.find((p) => p.id === id);
    if (!policy) throw DomainError.notFound('Policy');
    if (input.enabled !== undefined) policy.enabled = input.enabled;
    if (input.threshold !== undefined) policy.threshold = input.threshold;
    if (input.rails) policy.rails = input.rails;
    this.audit.record(
      workspace,
      actor,
      'Updated policy',
      policy.name,
      policy.enabled ? `Threshold ${formatCents(policy.threshold)}` : 'Disabled',
    );
    this.realtime.publish(workspace, 'policy.updated', ['team']);
    return policy;
  }
}
