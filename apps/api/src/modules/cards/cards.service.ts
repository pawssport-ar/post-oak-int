import { randomInt, randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  can,
  type Card,
  type CardSecrets,
  type Cents,
  formatCents,
  type IssueCardInput,
  type LimitPeriod,
  type UpdateCardInput,
  type User,
} from '@post-oak/contracts';
import { DomainError } from '../../common/domain-error.js';
import { addDays } from '../../common/time.js';
import { AuditService } from '../../core/audit/audit.service.js';
import { RealtimeService } from '../../core/realtime/realtime.service.js';
import type { CardRecord, Workspace } from '../../core/workspace/workspace.js';

@Injectable()
export class CardsService {
  constructor(
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  list(workspace: Workspace, actor: User): Card[] {
    const visible = can(actor.role, 'cards:manage')
      ? workspace.cards
      : workspace.cards.filter((card) => card.holderId === actor.id);
    return visible
      .filter((card) => card.status !== 'canceled')
      .map((card) => this.present(workspace, card));
  }

  get(workspace: Workspace, actor: User, id: string): Card {
    const card = this.find(workspace, id);
    this.assertCanSee(card, actor);
    return this.present(workspace, card);
  }

  issue(workspace: Workspace, actor: User, input: IssueCardInput): Card {
    const holder = workspace.users.find((user) => user.id === input.holderId);
    if (!holder) throw DomainError.notFound('Cardholder');
    if (!workspace.accounts.some((a) => a.id === input.accountId)) {
      throw DomainError.notFound('Account');
    }

    const last4 = String(randomInt(1000, 9999));
    const now = new Date();
    const card: CardRecord = {
      id: `crd_${randomUUID().slice(0, 12)}`,
      nickname: input.nickname,
      kind: input.kind,
      design: input.design,
      status: 'active',
      holderId: input.holderId,
      accountId: input.accountId,
      last4,
      expMonth: now.getUTCMonth() + 1,
      expYear: now.getUTCFullYear() + 4,
      limit: { amount: input.limitAmount, period: input.limitPeriod },
      controls: { online: true, atm: false, international: false, blockedMerchants: ['cash'] },
      createdAt: now.toISOString(),
      lastUsedAt: null,
      number: `4242 4242 4242 ${last4}`,
      cvc: String(randomInt(100, 999)),
    };
    workspace.cards.unshift(card);

    this.audit.record(
      workspace,
      actor,
      'Issued card',
      `${card.nickname} ••${last4}`,
      `${holder.name}, ${formatCents(input.limitAmount)} ${input.limitPeriod}`,
    );
    this.realtime.publish(workspace, 'card.issued', ['cards'], {
      title: input.kind === 'virtual' ? 'Virtual card ready' : 'Card on its way',
      body: `${card.nickname} ••${last4} issued to ${holder.name}.`,
      tone: 'positive',
      href: `/cards?card=${card.id}`,
    });
    return this.present(workspace, card);
  }

  update(workspace: Workspace, actor: User, id: string, input: UpdateCardInput): Card {
    const card = this.find(workspace, id);
    if (input.nickname) card.nickname = input.nickname;
    if (input.limitAmount !== undefined || input.limitPeriod) {
      card.limit = {
        amount: input.limitAmount ?? card.limit.amount,
        period: input.limitPeriod ?? card.limit.period,
      };
      this.audit.record(
        workspace,
        actor,
        'Updated limit',
        `${card.nickname} ••${card.last4}`,
        `${formatCents(card.limit.amount)} ${card.limit.period}`,
      );
    }
    if (input.online !== undefined) card.controls.online = input.online;
    if (input.atm !== undefined) card.controls.atm = input.atm;
    if (input.international !== undefined) card.controls.international = input.international;
    if (input.blockedMerchants) card.controls.blockedMerchants = input.blockedMerchants;
    this.realtime.publish(workspace, 'card.updated', ['cards']);
    return this.present(workspace, card);
  }

  setFrozen(workspace: Workspace, actor: User, id: string, frozen: boolean): Card {
    const card = this.find(workspace, id);
    this.assertCanSee(card, actor);
    if (card.status === 'canceled') {
      throw DomainError.conflict('card_canceled', 'This card has been canceled.');
    }
    card.status = frozen ? 'frozen' : 'active';
    this.audit.record(
      workspace,
      actor,
      frozen ? 'Froze card' : 'Unfroze card',
      `${card.nickname} ••${card.last4}`,
    );
    this.realtime.publish(workspace, 'card.updated', ['cards']);
    return this.present(workspace, card);
  }

  reveal(workspace: Workspace, actor: User, id: string): CardSecrets {
    const card = this.find(workspace, id);
    this.assertCanSee(card, actor);
    this.audit.record(workspace, actor, 'Revealed card', `${card.nickname} ••${card.last4}`);
    return {
      cardId: card.id,
      number: card.number,
      cvc: card.cvc,
      expiry: `${String(card.expMonth).padStart(2, '0')}/${String(card.expYear).slice(-2)}`,
    };
  }

  private assertCanSee(card: CardRecord, actor: User): void {
    if (can(actor.role, 'cards:manage') || card.holderId === actor.id) return;
    throw DomainError.forbidden('This card belongs to someone else.');
  }

  private find(workspace: Workspace, id: string): CardRecord {
    const card = workspace.cards.find((c) => c.id === id);
    if (!card) throw DomainError.notFound('Card');
    return card;
  }

  private present(workspace: Workspace, record: CardRecord): Card {
    const { number: _number, cvc: _cvc, ...card } = record;
    const holder = workspace.users.find((user) => user.id === card.holderId);
    const account = workspace.accounts.find((a) => a.id === card.accountId);
    const activity = workspace.transactions.filter((t) => t.cardId === card.id);
    return {
      ...card,
      holderName: holder?.name ?? 'Unknown',
      accountName: account?.name ?? 'Unknown',
      spent: this.spentInWindow(workspace, card.id, card.limit.period),
      lastUsedAt: activity[0]?.date ?? null,
    };
  }

  spentInWindow(workspace: Workspace, cardId: string, period: LimitPeriod): Cents {
    const windowStart = limitWindowStart(period, new Date());
    return workspace.transactions
      .filter((t) => t.cardId === cardId && t.amount < 0 && t.status !== 'failed')
      .filter((t) => new Date(t.date) >= windowStart)
      .reduce((sum, t) => sum - t.amount, 0);
  }
}

export function limitWindowStart(period: LimitPeriod, now: Date): Date {
  if (period === 'daily') {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  }
  return addDays(now, period === 'weekly' ? -7 : -30);
}
