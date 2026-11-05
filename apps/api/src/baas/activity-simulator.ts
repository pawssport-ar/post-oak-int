import { Injectable, type OnApplicationShutdown, type OnModuleInit } from '@nestjs/common';
import { type Card, formatCents, MERCHANT_GROUPS, type MerchantGroup } from '@post-oak/contracts';
import { LedgerService } from '../core/ledger/ledger.service.js';
import { RealtimeService } from '../core/realtime/realtime.service.js';
import type { CardRecord, Workspace } from '../core/workspace/workspace.js';
import { WorkspaceStore } from '../core/workspace/workspace.store.js';
import { CardsService } from '../modules/cards/cards.service.js';
import { InvoicesService } from '../modules/invoices/invoices.service.js';
import { FUEL_MERCHANTS, PARTS_MERCHANTS, TRAVEL_MERCHANTS } from '../seed/catalog.js';
import { Random } from '../seed/random.js';

const TICK_MS = 4_000;
const FIRST_EVENT_MS = 15_000;
const CARD_SETTLE_MS = 20_000;

interface SimulatedPurchase {
  merchant: string;
  group: MerchantGroup;
  category: 'fuel' | 'maintenance' | 'travel';
  minDollars: number;
  maxDollars: number;
}

/**
 * Keeps the demo alive: card swipes and customer payments arrive the way they would
 * from a provider's webhooks. It only runs for sandboxes with a browser connected.
 */
@Injectable()
export class ActivitySimulator implements OnModuleInit, OnApplicationShutdown {
  private readonly rng = new Random(Date.now());
  private readonly nextEventAt = new Map<string, number>();
  private timer: NodeJS.Timeout | undefined;

  constructor(
    private readonly store: WorkspaceStore,
    private readonly realtime: RealtimeService,
    private readonly ledger: LedgerService,
    private readonly cards: CardsService,
    private readonly invoices: InvoicesService,
  ) {}

  onModuleInit(): void {
    if (process.env['NODE_ENV'] === 'test') return;
    this.timer = setInterval(() => this.tick(), TICK_MS);
    this.timer.unref();
  }

  onApplicationShutdown(): void {
    clearInterval(this.timer);
  }

  private tick(): void {
    const now = Date.now();
    const connected = new Set(this.realtime.connectedWorkspaceIds());

    for (const id of this.nextEventAt.keys()) {
      if (!connected.has(id)) this.nextEventAt.delete(id);
    }
    for (const id of connected) {
      const due = this.nextEventAt.get(id);
      if (due === undefined) {
        this.nextEventAt.set(id, now + FIRST_EVENT_MS);
        continue;
      }
      if (now < due) continue;
      const workspace = this.store.peek(id);
      if (workspace) this.emit(workspace);
      this.nextEventAt.set(id, now + this.rng.int(32_000, 65_000));
    }
  }

  private emit(workspace: Workspace): void {
    if (this.rng.chance(0.45) && this.receiveCustomerPayment(workspace)) return;
    this.swipeCard(workspace);
  }

  private receiveCustomerPayment(workspace: Workspace): boolean {
    const open = workspace.invoices.filter((i) => i.status === 'sent' || i.status === 'viewed');
    if (open.length === 0) return false;
    this.invoices.markPaid(workspace, null, this.rng.pick(open).id);
    return true;
  }

  private swipeCard(workspace: Workspace): void {
    const candidates = workspace.cards.filter((card) => card.status !== 'canceled');
    if (candidates.length === 0) return;
    const card = this.rng.pick(candidates);
    const purchase = this.purchaseFor(card);
    const amount = this.rng.cents(purchase.minDollars, purchase.maxDollars);

    const decline = this.declineReason(workspace, card, purchase, amount);
    if (decline) {
      this.realtime.publish(workspace, 'card.declined', ['cards'], {
        title: 'Card declined',
        body: `${purchase.merchant} on ${card.nickname} ••${card.last4}: ${decline}.`,
        tone: 'attention',
        href: `/cards?card=${card.id}`,
      });
      return;
    }

    const hold = this.ledger.hold(workspace, {
      accountId: card.accountId,
      counterparty: purchase.merchant,
      description: `${purchase.merchant.toUpperCase()} #${this.rng.digits(4)}`,
      amount: -amount,
      rail: 'card',
      category: purchase.category,
      cardId: card.id,
      cardLabel: `${card.nickname} ••${card.last4}`,
    });
    this.realtime.publish(
      workspace,
      'card.authorized',
      ['transactions', 'cards', 'accounts', 'overview'],
      {
        title: `${formatCents(amount)} at ${purchase.merchant}`,
        body: `${card.nickname} ••${card.last4}`,
        tone: 'neutral',
        href: `/transactions?cardId=${card.id}`,
      },
    );

    const timer = setTimeout(() => {
      workspace.timers.delete(timer);
      this.ledger.settle(workspace, hold.id);
      this.realtime.publish(workspace, 'card.settled', ['transactions', 'accounts', 'overview']);
    }, CARD_SETTLE_MS);
    workspace.timers.add(timer);
  }

  private purchaseFor(card: CardRecord): SimulatedPurchase {
    if (card.nickname.startsWith('Fleet')) {
      return {
        merchant: this.rng.pick(FUEL_MERCHANTS),
        group: 'fuel',
        category: 'fuel',
        minDollars: 280,
        maxDollars: 1_350,
      };
    }
    if (card.id === 'crd_parts') {
      return {
        merchant: this.rng.pick(PARTS_MERCHANTS),
        group: 'fleet',
        category: 'maintenance',
        minDollars: 120,
        maxDollars: 1_900,
      };
    }
    return {
      merchant: this.rng.pick(TRAVEL_MERCHANTS),
      group: 'travel',
      category: 'travel',
      minDollars: 45,
      maxDollars: 840,
    };
  }

  /** Honours whatever the user just changed on the card, which is the point of the demo. */
  private declineReason(
    workspace: Workspace,
    card: CardRecord,
    purchase: SimulatedPurchase,
    amount: number,
  ): string | null {
    if (card.status === 'frozen') return 'the card is frozen';
    if (card.controls.blockedMerchants.includes(purchase.group)) {
      return `${MERCHANT_GROUPS[purchase.group].toLowerCase()} are blocked`;
    }
    const limit: Card['limit'] = card.limit;
    const spent = this.cards.spentInWindow(workspace, card.id, limit.period);
    return spent + amount > limit.amount ? `the ${limit.period} limit was reached` : null;
  }
}
