import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { CreateRecipientInput, Recipient, User } from '@post-oak/contracts';
import { isValidRoutingNumber } from '@post-oak/contracts';
import { DomainError } from '../../common/domain-error.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { RealtimeService } from '../../core/realtime/realtime.service.js';
import type { Workspace } from '../../core/workspace/workspace.js';
import { KNOWN_BANKS } from '../../seed/catalog.js';

@Injectable()
export class RecipientsService {
  constructor(
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  list(workspace: Workspace): Recipient[] {
    return workspace.recipients;
  }

  bankFor(routingNumber: string): { valid: boolean; bankName: string | null } {
    if (!isValidRoutingNumber(routingNumber)) return { valid: false, bankName: null };
    return { valid: true, bankName: KNOWN_BANKS[routingNumber] ?? 'US financial institution' };
  }

  create(workspace: Workspace, actor: User, input: CreateRecipientInput): Recipient {
    const duplicate = workspace.recipients.some(
      (r) => r.name.toLowerCase() === input.name.toLowerCase(),
    );
    if (duplicate) {
      throw DomainError.conflict('duplicate_recipient', `${input.name} is already saved.`);
    }

    const recipient: Recipient = {
      id: `rcp_${randomUUID().slice(0, 12)}`,
      name: input.name,
      type: input.type,
      email: input.email || null,
      bankName: this.bankFor(input.routingNumber).bankName ?? 'US financial institution',
      routingNumber: input.routingNumber,
      accountLast4: input.accountNumber.slice(-4),
      defaultRail: input.defaultRail,
      defaultCategory: 'uncategorized',
      createdAt: new Date().toISOString(),
      lastPaidAt: null,
      totalPaid: 0,
      paymentCount: 0,
      isNew: true,
    };
    workspace.recipients.unshift(recipient);
    this.audit.record(
      workspace,
      actor,
      'Added recipient',
      recipient.name,
      'First-payment review applies',
    );
    this.realtime.publish(workspace, 'recipient.created', ['recipients']);
    return recipient;
  }
}
