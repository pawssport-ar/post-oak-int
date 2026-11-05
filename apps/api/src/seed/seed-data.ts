import type {
  Cents,
  CategoryId,
  Notification,
  Payment,
  PaymentRail,
  PaymentStatus,
  Rail,
  Recipient,
  Transaction,
  User,
} from '@post-oak/contracts';
import {
  addDays,
  atUtcHour,
  daysBetween,
  isWeekend,
  nextBusinessDay,
  toIsoDate,
} from '../common/time.js';
import type {
  AccountRecord,
  BillRecord,
  CardRecord,
  InvoiceRecord,
  WorkspaceData,
} from '../core/workspace/workspace.js';
import {
  ACCOUNTS,
  CARDS,
  CARRIERS,
  COMPANY,
  CUSTOMERS,
  FUEL_MERCHANTS,
  MEAL_MERCHANTS,
  PARTS_MERCHANTS,
  POLICIES,
  RECURRING_SOFTWARE,
  ROUTING_NUMBER,
  TEAM,
  TRAVEL_MERCHANTS,
  VENDORS,
} from './catalog.js';
import { Random } from './random.js';

const HISTORY_DAYS = 430;
const PROCESSOR_SEED = 20_261_105;

type AccountId = (typeof ACCOUNTS)[number]['id'];

interface Draft {
  accountId: AccountId;
  at: Date;
  counterparty: string;
  description: string;
  amount: Cents;
  rail: Rail;
  category: CategoryId;
  cardId?: string;
  status?: Transaction['status'];
  memo?: string;
  tags?: string[];
  invoiceId?: string;
  billId?: string;
  paymentId?: string;
  receipt?: string;
}

/**
 * Generates a coherent 14-month history for the demo company: seasonal receipts,
 * biweekly payroll, fleet costs, quarterly taxes and the transfers that fund them.
 * Output depends only on `now`, so a given day always produces the same story.
 */
export function buildSeedData(now: Date): WorkspaceData {
  const rng = new Random(PROCESSOR_SEED);
  const today = atUtcHour(now, 12);
  const start = addDays(today, -HISTORY_DAYS);
  const drafts: Draft[] = [];

  const users = buildUsers(now, rng);
  const cardLabels = new Map(CARDS.map((card) => [card.id, `${card.nickname} ••${card.last4}`]));
  const invoices: InvoiceRecord[] = [];
  let invoiceSequence = 2010;

  const growthAt = (date: Date) => 1 + 0.15 * (daysBetween(start, date) / 365);
  // Freight peaks in the fourth quarter.
  const seasonAt = (date: Date) =>
    1 + 0.08 * Math.sin((2 * Math.PI * (date.getUTCMonth() - 7)) / 12);

  /** A business-hours timestamp on `date`, nudged off weekends. */
  const businessTime = (date: Date): Date => {
    let day = date;
    while (isWeekend(day)) day = addDays(day, 1);
    return atUtcHour(day, rng.int(14, 22), rng.int(0, 59));
  };

  const inPast = (date: Date) => date.getTime() < now.getTime();

  // Monthly anchors drive everything that repeats on a calendar.
  const firstMonth = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1, 12));
  for (let m = 0; ; m += 1) {
    const monthStart = new Date(
      Date.UTC(firstMonth.getUTCFullYear(), firstMonth.getUTCMonth() + m, 1, 12),
    );
    if (monthStart > today) break;
    const year = monthStart.getUTCFullYear();
    const month = monthStart.getUTCMonth();
    const dayOf = (day: number) => new Date(Date.UTC(year, month, day, 12));
    const lastDay = new Date(Date.UTC(year, month + 1, 0, 12)).getUTCDate();
    const scale = growthAt(monthStart);
    const costScale = 1 + (scale - 1) * 0.62;
    const revenue = 3_180_000 * scale * seasonAt(monthStart);

    const push = (draft: Draft) => {
      if (draft.at >= start && inPast(draft.at)) drafts.push(draft);
    };

    // Customer receipts.
    for (const customer of CUSTOMERS) {
      for (let i = 0; i < customer.payments; i += 1) {
        const day = Math.min(
          lastDay,
          3 + Math.floor(((i + 0.2 + rng.next() * 0.6) * 26) / customer.payments),
        );
        const at = businessTime(dayOf(day));
        const amount = Math.round(
          ((revenue * customer.weight) / customer.payments) * rng.between(0.84, 1.16) * 100,
        );
        const wire = amount > 18_000_000 && rng.chance(0.6);
        const recent = daysBetween(at, today) <= 75;
        let invoiceId: string | undefined;
        let invoiceNumber = `INV-${rng.int(1000, 1999)}`;
        if (recent) {
          invoiceSequence += 1;
          invoiceNumber = `INV-${invoiceSequence}`;
          invoiceId = `inv_${invoiceSequence}`;
          const daysToPay = rng.int(26, 52);
          const issued = addDays(at, -daysToPay);
          invoices.push({
            id: invoiceId,
            number: invoiceNumber,
            customer: customer.name,
            customerEmail: customer.email,
            lines: [
              {
                description: `Freight services, ${toIsoDate(issued).slice(0, 7)} lanes`,
                quantity: 1,
                unitPrice: amount,
              },
            ],
            subtotal: amount,
            tax: 0,
            total: amount,
            issuedOn: toIsoDate(issued),
            dueOn: toIsoDate(addDays(issued, 45)),
            status: 'paid',
            paidAt: at.toISOString(),
            lastReminderAt: null,
            memo: null,
          });
        }
        push({
          accountId: 'acc_operating',
          at,
          counterparty: customer.name,
          description: `${wire ? 'WIRE IN' : 'ACH CREDIT'} ${customer.name.toUpperCase()} ${invoiceNumber}`,
          amount,
          rail: wire ? 'wire' : 'ach',
          category: 'revenue',
          ...(invoiceId ? { invoiceId } : {}),
        });
      }
    }

    // Subcontract carriers.
    const carrierRuns = rng.int(18, 26);
    for (let i = 0; i < carrierRuns; i += 1) {
      const name = rng.pick(CARRIERS);
      const at = businessTime(dayOf(rng.int(1, lastDay)));
      push({
        accountId: 'acc_operating',
        at,
        counterparty: name,
        description: `ACH DEBIT ${name.toUpperCase()} SETTLEMENT`,
        amount: -Math.round(rng.between(13_000, 58_000) * costScale * 100),
        rail: 'ach',
        category: 'carriers',
      });
    }

    // Fixed monthly obligations.
    push({
      accountId: 'acc_operating',
      at: businessTime(dayOf(5)),
      counterparty: 'Meridian Fleet Leasing',
      description: 'WIRE OUT MERIDIAN FLEET LEASING TRACTOR LEASE',
      amount: -Math.round(186_400 * costScale * 100),
      rail: 'wire',
      category: 'equipment',
    });
    push({
      accountId: 'acc_operating',
      at: businessTime(dayOf(10)),
      counterparty: 'Gulf States Mutual',
      description: 'ACH DEBIT GULF STATES MUTUAL COMMERCIAL AUTO',
      amount: -Math.round(97_850 * costScale * 100),
      rail: 'ach',
      category: 'insurance',
    });
    push({
      accountId: 'acc_operating',
      at: businessTime(dayOf(1)),
      counterparty: 'Westchase Industrial Partners',
      description: 'ACH DEBIT WESTCHASE INDUSTRIAL RENT',
      amount: -6_840_000,
      rail: 'ach',
      category: 'facilities',
    });
    push({
      accountId: 'acc_operating',
      at: businessTime(dayOf(1)),
      counterparty: 'Bayport Logistics Park',
      description: 'ACH DEBIT BAYPORT LOGISTICS PARK RENT',
      amount: -4_610_000,
      rail: 'ach',
      category: 'facilities',
    });
    push({
      accountId: 'acc_operating',
      at: businessTime(dayOf(14)),
      counterparty: 'CenterPoint Energy',
      description: 'ACH DEBIT CENTERPOINT ENERGY UTIL',
      amount: -rng.cents(9_200, 13_400),
      rail: 'ach',
      category: 'utilities',
    });
    push({
      accountId: 'acc_operating',
      at: businessTime(dayOf(16)),
      counterparty: 'AT&T Business',
      description: 'ACH DEBIT AT&T BUSINESS FIBER',
      amount: -rng.cents(6_100, 7_300),
      rail: 'ach',
      category: 'utilities',
    });
    push({
      accountId: 'acc_payroll',
      at: businessTime(dayOf(3)),
      counterparty: 'Blue Cross Blue Shield of Texas',
      description: 'ACH DEBIT BCBSTX GROUP HEALTH',
      amount: -Math.round(84_200 * costScale * 100),
      rail: 'ach',
      category: 'payroll',
    });
    push({
      accountId: 'acc_operating',
      at: businessTime(dayOf(rng.int(6, 12))),
      counterparty: 'Haynes & Cole LLP',
      description: 'ACH DEBIT HAYNES COLE LLP RETAINER',
      amount: -rng.cents(14_500, 21_000),
      rail: 'ach',
      category: 'professional',
    });
    push({
      accountId: 'acc_operating',
      at: businessTime(dayOf(rng.int(18, 24))),
      counterparty: 'Baker Ridge CPAs',
      description: 'ACH DEBIT BAKER RIDGE CPAS',
      amount: -rng.cents(9_800, 13_800),
      rail: 'ach',
      category: 'professional',
    });

    // Maintenance.
    for (let i = 0; i < rng.int(5, 8); i += 1) {
      const name = rng.pick(['Rush Truck Centers', 'Cummins Southern Plains'] as const);
      push({
        accountId: 'acc_operating',
        at: businessTime(dayOf(rng.int(1, lastDay))),
        counterparty: name,
        description: `ACH DEBIT ${name.toUpperCase()} RO-${rng.digits(5)}`,
        amount: -Math.round(rng.between(6_500, 21_000) * costScale * 100),
        rail: 'ach',
        category: 'maintenance',
      });
    }

    // Recurring software on the virtual card.
    for (const app of RECURRING_SOFTWARE) {
      push({
        accountId: 'acc_operating',
        at: businessTime(dayOf(rng.int(1, 8))),
        counterparty: app.name,
        description: `${app.name.toUpperCase()} SUBSCRIPTION`,
        amount: -rng.cents(app.amount[0], app.amount[1]),
        rail: 'card',
        category: 'software',
        cardId: 'crd_software',
      });
    }

    // Fuel on the yard cards.
    for (let i = 0; i < rng.int(34, 44); i += 1) {
      const merchant = rng.pick(FUEL_MERCHANTS);
      const cardId = rng.chance(0.62) ? 'crd_houston' : 'crd_beaumont';
      push({
        accountId: 'acc_operating',
        at: businessTime(dayOf(rng.int(1, lastDay))),
        counterparty: merchant,
        description: `${merchant.toUpperCase()} #${rng.digits(4)}`,
        amount: -rng.cents(310, 1_580),
        rail: 'card',
        category: 'fuel',
        cardId,
        ...(rng.chance(0.4) ? { receipt: `receipt-${rng.digits(6)}.pdf` } : {}),
      });
    }

    // Parts.
    for (let i = 0; i < rng.int(9, 15); i += 1) {
      const merchant = rng.pick(PARTS_MERCHANTS);
      push({
        accountId: 'acc_operating',
        at: businessTime(dayOf(rng.int(1, lastDay))),
        counterparty: merchant,
        description: `${merchant.toUpperCase()} #${rng.digits(4)}`,
        amount: -rng.cents(140, 2_300),
        rail: 'card',
        category: 'maintenance',
        cardId: 'crd_parts',
      });
    }

    // Travel and meals.
    for (let i = 0; i < rng.int(10, 16); i += 1) {
      const travel = rng.chance(0.55);
      const merchant = rng.pick(travel ? TRAVEL_MERCHANTS : MEAL_MERCHANTS);
      const cardId = rng.chance(0.3) ? 'crd_executive' : 'crd_ops';
      push({
        accountId: 'acc_operating',
        at: businessTime(dayOf(rng.int(1, lastDay))),
        counterparty: merchant,
        description: merchant.toUpperCase(),
        amount: travel ? -rng.cents(160, 1_450) : -rng.cents(18, 380),
        rail: 'card',
        category: 'travel',
        cardId,
        ...(rng.chance(0.5) ? { receipt: `receipt-${rng.digits(6)}.jpg` } : {}),
      });
    }

    // Marketing.
    push({
      accountId: 'acc_operating',
      at: businessTime(dayOf(rng.int(2, 9))),
      counterparty: 'Google Ads',
      description: 'GOOGLE ADS MONTHLY',
      amount: -rng.cents(3_200, 5_400),
      rail: 'card',
      category: 'marketing',
      cardId: 'crd_marketing',
    });
    push({
      accountId: 'acc_operating',
      at: businessTime(dayOf(rng.int(10, 20))),
      counterparty: 'LinkedIn',
      description: 'LINKEDIN RECRUITER',
      amount: -rng.cents(1_800, 2_600),
      rail: 'card',
      category: 'marketing',
      cardId: 'crd_marketing',
    });

    // Interest and fees.
    const monthEnd = businessTime(dayOf(lastDay));
    push({
      accountId: 'acc_reserve',
      at: monthEnd,
      counterparty: 'Interest earned',
      description: 'INTEREST PAYMENT 4.12% APY',
      amount: rng.cents(6_400, 7_900),
      rail: 'interest',
      category: 'interest',
    });
    push({
      accountId: 'acc_tax',
      at: monthEnd,
      counterparty: 'Interest earned',
      description: 'INTEREST PAYMENT 2.15% APY',
      amount: rng.cents(1_050, 1_400),
      rail: 'interest',
      category: 'interest',
    });
    push({
      accountId: 'acc_operating',
      at: monthEnd,
      counterparty: 'Account analysis',
      description: 'MONTHLY TREASURY MANAGEMENT FEE',
      amount: -18_500,
      rail: 'fee',
      category: 'fees',
    });

    // Monthly set-aside into the tax reserve.
    const taxTransfer = 7_400_000;
    const taxDate = businessTime(dayOf(20));
    push({
      accountId: 'acc_operating',
      at: taxDate,
      counterparty: 'Tax Reserve ••3310',
      description: 'BOOK TRANSFER TO TAX RESERVE',
      amount: -taxTransfer,
      rail: 'book',
      category: 'transfer',
    });
    push({
      accountId: 'acc_tax',
      at: taxDate,
      counterparty: 'Operating ••4821',
      description: 'BOOK TRANSFER FROM OPERATING',
      amount: taxTransfer,
      rail: 'book',
      category: 'transfer',
    });

    // Quarterly obligations.
    if ([0, 3, 5, 8].includes(month)) {
      push({
        accountId: 'acc_tax',
        at: businessTime(dayOf(15)),
        counterparty: 'US Treasury EFTPS',
        description: 'EFTPS FEDERAL ESTIMATED TAX 1120',
        amount: -Math.round(204_000 * costScale * 100),
        rail: 'ach',
        category: 'taxes',
      });
    }
    if (month === 4) {
      push({
        accountId: 'acc_tax',
        at: businessTime(dayOf(14)),
        counterparty: 'Texas Comptroller',
        description: 'TX FRANCHISE TAX 05-158',
        amount: -5_820_000,
        rail: 'ach',
        category: 'taxes',
      });
    }
    if (month % 3 === 0) {
      const sweep = 18_000_000;
      const sweepDate = businessTime(dayOf(22));
      push({
        accountId: 'acc_operating',
        at: sweepDate,
        counterparty: 'Treasury Reserve ••9054',
        description: 'BOOK TRANSFER TO TREASURY RESERVE',
        amount: -sweep,
        rail: 'book',
        category: 'transfer',
      });
      push({
        accountId: 'acc_reserve',
        at: sweepDate,
        counterparty: 'Operating ••4821',
        description: 'BOOK TRANSFER FROM OPERATING',
        amount: sweep,
        rail: 'book',
        category: 'transfer',
      });
    }

    // Weekly fuel settlement.
    for (let day = 4; day <= lastDay; day += 7) {
      push({
        accountId: 'acc_operating',
        at: businessTime(dayOf(day)),
        counterparty: 'Comdata Fleet Settlement',
        description: 'ACH DEBIT COMDATA FLEET WEEKLY',
        amount: -Math.round(rng.between(82_000, 104_000) * costScale * 100),
        rail: 'ach',
        category: 'fuel',
      });
    }
  }

  // Biweekly payroll, funded the day before by a book transfer.
  let payday = lastFridayBefore(start);
  while (payday < now) {
    const scale = 1 + (growthAt(payday) - 1) * 0.62;
    const net = Math.round(404_000 * scale * rng.between(0.985, 1.02) * 100);
    const taxes = Math.round(net * 0.222);
    const funding = addDays(payday, -1);
    if (payday >= start && payday < now) {
      drafts.push(
        {
          accountId: 'acc_operating',
          at: atUtcHour(funding, 15, 5),
          counterparty: 'Payroll ••7703',
          description: 'BOOK TRANSFER TO PAYROLL',
          amount: -(net + taxes),
          rail: 'book',
          category: 'transfer',
        },
        {
          accountId: 'acc_payroll',
          at: atUtcHour(funding, 15, 5),
          counterparty: 'Operating ••4821',
          description: 'BOOK TRANSFER FROM OPERATING',
          amount: net + taxes,
          rail: 'book',
          category: 'transfer',
        },
        {
          accountId: 'acc_payroll',
          at: atUtcHour(payday, 13, 0),
          counterparty: 'Payroll run',
          description: 'ACH DEBIT BIWEEKLY PAYROLL 148 EMPLOYEES',
          amount: -net,
          rail: 'ach',
          category: 'payroll',
        },
        {
          accountId: 'acc_payroll',
          at: atUtcHour(payday, 13, 30),
          counterparty: 'US Treasury EFTPS',
          description: 'EFTPS 941 PAYROLL TAX DEPOSIT',
          amount: -taxes,
          rail: 'ach',
          category: 'payroll',
        },
      );
    }
    payday = addDays(payday, 14);
  }

  // A little of what real ledgers contain.
  drafts.push({
    accountId: 'acc_operating',
    at: atUtcHour(addDays(today, -19), 17, 12),
    counterparty: 'Piney Woods Freight',
    description: 'ACH RETURN R03 PINEY WOODS FREIGHT',
    amount: -2_184_000,
    rail: 'ach',
    category: 'carriers',
    status: 'returned',
    memo: 'Wrong account on file. Vendor updated their details and was repaid.',
  });
  for (const hoursAgo of [2, 5, 9]) {
    const merchant = rng.pick(FUEL_MERCHANTS);
    drafts.push({
      accountId: 'acc_operating',
      at: new Date(now.getTime() - hoursAgo * 3_600_000),
      counterparty: merchant,
      description: `${merchant.toUpperCase()} #${rng.digits(4)}`,
      amount: -rng.cents(340, 1_240),
      rail: 'card',
      category: 'fuel',
      cardId: 'crd_houston',
      status: 'pending',
    });
  }

  const { accounts, transactions } = settleLedger(drafts, cardLabels, now, rng);
  const recipients = buildRecipients(transactions, now, rng);
  const payments = buildPayments(transactions, recipients, accounts, users, now, rng);
  const open = buildOpenInvoices(now, rng, invoiceSequence);
  const bills = buildBills(recipients, now);

  return {
    company: COMPANY,
    actingUserId: 'usr_elena',
    users,
    accounts,
    transactions,
    recipients,
    payments,
    cards: buildCards(now, rng),
    bills,
    invoices: [...open, ...invoices].sort((a, b) => b.issuedOn.localeCompare(a.issuedOn)),
    policies: structuredClone(POLICIES),
    audit: buildAudit(now),
    notifications: buildNotifications(now),
    advisoryRequests: [],
  };
}

function lastFridayBefore(date: Date): Date {
  let day = date;
  while (day.getUTCDay() !== 5) day = addDays(day, -1);
  return day;
}

function initialsOf(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);
}

function buildUsers(now: Date, rng: Random): User[] {
  return TEAM.map((member, index) => ({
    id: member.id,
    name: member.name,
    initials: initialsOf(member.name),
    email: `${member.name.split(' ')[0]?.toLowerCase()}@brazosgulf.example`,
    title: member.title,
    role: member.role,
    status: member.status ?? 'active',
    twoFactor: member.status !== 'invited',
    lastActiveAt:
      member.status === 'invited'
        ? null
        : new Date(now.getTime() - (index * 5 + rng.int(1, 4)) * 3_600_000).toISOString(),
  }));
}

/**
 * Orders the drafts and replays them through a running balance. Opening balances are
 * back-solved so each account lands exactly on its target today.
 */
function settleLedger(
  drafts: Draft[],
  cardLabels: Map<string, string>,
  now: Date,
  rng: Random,
): { accounts: AccountRecord[]; transactions: Transaction[] } {
  const ordered = [...drafts].sort((a, b) => a.at.getTime() - b.at.getTime());
  const settled = (draft: Draft) => (draft.status ?? 'posted') === 'posted';

  const accounts: AccountRecord[] = ACCOUNTS.map((account, index) => ({
    id: account.id,
    name: account.name,
    kind: account.kind,
    purpose: account.purpose,
    last4: account.last4,
    accountNumber: `40021${String(1000 + index * 37)}${account.last4}`,
    routingNumber: ROUTING_NUMBER,
    balance: account.targetBalance,
    apyBps: account.apyBps,
    openedAt: addDays(now, -1_460).toISOString(),
  }));

  const running = new Map<string, Cents>();
  for (const account of ACCOUNTS) {
    const net = ordered
      .filter((draft) => draft.accountId === account.id && settled(draft))
      .reduce((sum, draft) => sum + draft.amount, 0);
    running.set(account.id, account.targetBalance - net);
  }

  const transactions = ordered.map((draft, index): Transaction => {
    const status = draft.status ?? 'posted';
    let balanceAfter: Cents | null = null;
    if (status === 'posted') {
      balanceAfter = (running.get(draft.accountId) ?? 0) + draft.amount;
      running.set(draft.accountId, balanceAfter);
    }
    const account = ACCOUNTS.find((a) => a.id === draft.accountId);
    return {
      id: `txn_${String(100_000 + index)}`,
      accountId: draft.accountId,
      accountName: account?.name ?? '',
      date: draft.at.toISOString(),
      counterparty: draft.counterparty,
      description: draft.description,
      amount: draft.amount,
      rail: draft.rail,
      status,
      category: draft.category,
      reference: rng.reference(),
      balanceAfter,
      memo: draft.memo ?? null,
      tags: draft.tags ?? [],
      receipt: draft.receipt ?? null,
      cardId: draft.cardId ?? null,
      cardLabel: draft.cardId ? (cardLabels.get(draft.cardId) ?? null) : null,
      paymentId: draft.paymentId ?? null,
      invoiceId: draft.invoiceId ?? null,
      billId: draft.billId ?? null,
      timeline: buildTimeline(draft, status),
    };
  });

  return { accounts, transactions: transactions.reverse() };
}

function buildTimeline(draft: Draft, status: Transaction['status']): Transaction['timeline'] {
  const at = draft.at.toISOString();
  if (status === 'pending') return [{ label: 'Authorized', at }];
  if (status === 'returned') {
    return [
      { label: 'Submitted to the ACH network', at },
      { label: 'Returned by receiving bank', at, detail: 'R03: No account found' },
    ];
  }
  if (draft.rail === 'card') {
    return [
      { label: 'Authorized', at: new Date(draft.at.getTime() - 3_600_000 * 20).toISOString() },
      { label: 'Posted to ledger', at },
    ];
  }
  return [
    { label: draft.amount > 0 ? 'Received' : 'Submitted', at },
    { label: 'Posted to ledger', at },
  ];
}

function buildRecipients(transactions: Transaction[], now: Date, rng: Random): Recipient[] {
  const statsFor = (name: string) => {
    const paid = transactions.filter(
      (t) => t.counterparty === name && t.amount < 0 && t.status === 'posted',
    );
    return {
      totalPaid: paid.reduce((sum, t) => sum - t.amount, 0),
      paymentCount: paid.length,
      lastPaidAt: paid[0]?.date ?? null,
    };
  };

  const banks = [
    'Frost Bank',
    'Amegy Bank',
    'Texas Capital Bank',
    'Prosperity Bank',
    'Wells Fargo',
  ];
  const carriers: Recipient[] = CARRIERS.map((name, index) => ({
    id: `rcp_carrier_${index + 1}`,
    name,
    type: 'contractor',
    email: `billing@${name.toLowerCase().replaceAll(/[^a-z]/g, '')}.example`,
    bankName: rng.pick(banks),
    routingNumber: '114000093',
    accountLast4: rng.digits(4),
    defaultRail: 'ach',
    defaultCategory: 'carriers',
    createdAt: addDays(now, -rng.int(380, 900)).toISOString(),
    isNew: false,
    ...statsFor(name),
  }));

  const vendors: Recipient[] = VENDORS.map((vendor, index) => ({
    id: `rcp_vendor_${index + 1}`,
    name: vendor.name,
    type: vendor.type,
    email:
      vendor.type === 'tax_authority'
        ? null
        : `ar@${vendor.name.toLowerCase().replaceAll(/[^a-z]/g, '')}.example`,
    bankName: vendor.bank,
    routingNumber: '121000248',
    accountLast4: rng.digits(4),
    defaultRail: vendor.rail,
    defaultCategory: vendor.category,
    createdAt: addDays(now, -rng.int(380, 1_100)).toISOString(),
    isNew: false,
    ...statsFor(vendor.name),
  }));

  const newcomer: Recipient = {
    id: 'rcp_tejas',
    name: 'Tejas Crane & Rigging',
    type: 'vendor',
    email: 'billing@tejascrane.example',
    bankName: 'Texas Capital Bank',
    routingNumber: '111000614',
    accountLast4: '6039',
    defaultRail: 'wire',
    defaultCategory: 'maintenance',
    createdAt: addDays(now, -2).toISOString(),
    lastPaidAt: null,
    totalPaid: 0,
    paymentCount: 0,
    isNew: true,
  };

  return [newcomer, ...vendors, ...carriers].sort((a, b) => b.totalPaid - a.totalPaid);
}

function buildPayments(
  transactions: Transaction[],
  recipients: Recipient[],
  accounts: AccountRecord[],
  users: User[],
  now: Date,
  rng: Random,
): Payment[] {
  const operating = accounts[0];
  const priya = users.find((user) => user.id === 'usr_priya');
  const marcus = users.find((user) => user.id === 'usr_marcus');
  if (!operating || !priya || !marcus) throw new Error('Seed team is incomplete');

  const destinationOf = (recipient: Recipient) => ({
    type: 'recipient' as const,
    id: recipient.id,
    name: recipient.name,
    bankName: recipient.bankName,
    last4: recipient.accountLast4,
  });

  const base = (
    id: string,
    recipient: Recipient,
    rail: PaymentRail,
    amount: Cents,
    status: PaymentStatus,
    createdAt: Date,
    memo: string,
  ): Payment => ({
    id,
    reference: rng.reference(),
    fromAccountId: operating.id,
    fromAccountName: operating.name,
    fromLast4: operating.last4,
    destination: destinationOf(recipient),
    rail,
    amount,
    fee: rail === 'wire' ? 2_500 : 0,
    memo,
    status,
    scheduledFor: null,
    estimatedArrival: nextBusinessDay(createdAt).toISOString(),
    createdAt: createdAt.toISOString(),
    createdById: priya.id,
    createdByName: priya.name,
    requiredApprovals: 0,
    decisions: [],
    policyName: null,
    billId: null,
    timeline: [
      {
        status: 'created',
        label: `Created by ${priya.name}`,
        at: createdAt.toISOString(),
        actor: priya.name,
      },
    ],
  });

  const history: Payment[] = [];
  const cutoff = addDays(now, -45).getTime();
  for (const transaction of transactions) {
    if (new Date(transaction.date).getTime() < cutoff) break;
    if (transaction.amount >= 0 || transaction.status !== 'posted') continue;
    if (transaction.rail !== 'ach' && transaction.rail !== 'wire') continue;
    const recipient = recipients.find((r) => r.name === transaction.counterparty);
    if (!recipient) continue;

    const settledAt = new Date(transaction.date);
    const createdAt = addDays(settledAt, -1);
    const payment = base(
      `pay_${transaction.id.slice(4)}`,
      recipient,
      transaction.rail,
      -transaction.amount,
      'settled',
      createdAt,
      transaction.description.replace(/^(ACH DEBIT|WIRE OUT) /, ''),
    );
    payment.estimatedArrival = settledAt.toISOString();
    payment.timeline.push(
      {
        status: 'processing',
        label: 'Submitted to the network',
        at: createdAt.toISOString(),
        actor: null,
      },
      { status: 'settled', label: 'Settled', at: settledAt.toISOString(), actor: null },
    );
    transaction.paymentId = payment.id;
    history.push(payment);
  }

  const byName = (name: string) => {
    const recipient = recipients.find((r) => r.name === name);
    if (!recipient) throw new Error(`Unknown seed recipient ${name}`);
    return recipient;
  };

  const awaiting = (
    id: string,
    name: string,
    rail: PaymentRail,
    amount: Cents,
    hoursAgo: number,
    memo: string,
    policyName: string,
  ): Payment => {
    const payment = base(
      id,
      byName(name),
      rail,
      amount,
      'pending_approval',
      new Date(now.getTime() - hoursAgo * 3_600_000),
      memo,
    );
    payment.requiredApprovals = 1;
    payment.policyName = policyName;
    return payment;
  };

  const inFlight = base(
    'pay_inflight',
    byName('Alamo Reefer Lines'),
    'ach',
    3_418_250,
    'in_transit',
    new Date(now.getTime() - 5 * 3_600_000),
    'Reefer settlement, week 44',
  );
  inFlight.timeline.push({
    status: 'in_transit',
    label: 'Submitted to the network',
    at: new Date(now.getTime() - 4 * 3_600_000).toISOString(),
    actor: null,
  });

  const scheduled = base(
    'pay_scheduled',
    byName('Westchase Industrial Partners'),
    'ach',
    6_840_000,
    'scheduled',
    new Date(now.getTime() - 26 * 3_600_000),
    'Monthly rent',
  );
  scheduled.scheduledFor = toIsoDate(addDays(now, 6));
  scheduled.estimatedArrival = addDays(now, 7).toISOString();
  scheduled.createdById = marcus.id;
  scheduled.createdByName = marcus.name;

  return [
    awaiting(
      'pay_meridian',
      'Meridian Fleet Leasing',
      'wire',
      18_450_000,
      3,
      'Six new tractor units, deposit',
      'Dual approval on large wires',
    ),
    awaiting(
      'pay_tejas',
      'Tejas Crane & Rigging',
      'wire',
      4_800_000,
      7,
      'Yard crane service contract',
      'New recipient review',
    ),
    awaiting(
      'pay_coastal',
      'Coastal Bend Carriers',
      'ach',
      6_230_000,
      22,
      'October lane settlement',
      'Dual approval on large ACH',
    ),
    inFlight,
    scheduled,
    ...history,
  ];
}

function buildOpenInvoices(now: Date, rng: Random, startSequence: number): InvoiceRecord[] {
  const plan: [number, number, 'sent' | 'viewed'][] = [
    [0, 62, 'viewed'],
    [1, 58, 'viewed'],
    [0, 49, 'sent'],
    [3, 47, 'viewed'],
    [7, 38, 'viewed'],
    [2, 31, 'viewed'],
    [4, 27, 'sent'],
    [0, 24, 'viewed'],
    [5, 19, 'sent'],
    [1, 16, 'viewed'],
    [6, 12, 'sent'],
    [0, 9, 'sent'],
    [8, 6, 'sent'],
    [2, 4, 'sent'],
    [9, 2, 'sent'],
  ];

  return plan.map(([customerIndex, age, status], index) => {
    const customer = CUSTOMERS[customerIndex];
    if (!customer) throw new Error('Unknown seed customer');
    const sequence = startSequence + index + 1;
    const issued = addDays(now, -age);
    const loads = rng.int(14, 62);
    const unitPrice = rng.cents(2_450, 5_200);
    const accessorials = rng.cents(1_800, 8_400);
    const subtotal = loads * unitPrice + accessorials;
    return {
      id: `inv_${sequence}`,
      number: `INV-${sequence}`,
      customer: customer.name,
      customerEmail: customer.email,
      lines: [
        { description: 'Linehaul, Gulf Coast lanes', quantity: loads, unitPrice },
        { description: 'Accessorials and detention', quantity: 1, unitPrice: accessorials },
      ],
      subtotal,
      tax: 0,
      total: subtotal,
      issuedOn: toIsoDate(issued),
      dueOn: toIsoDate(addDays(issued, 45)),
      status,
      paidAt: null,
      lastReminderAt: age > 50 ? addDays(now, -4).toISOString() : null,
      memo: null,
    };
  });
}

function buildBills(recipients: Recipient[], now: Date): BillRecord[] {
  const idOf = (name: string) => recipients.find((r) => r.name === name)?.id ?? null;
  const bill = (
    id: string,
    vendor: string,
    invoiceNumber: string,
    amount: Cents,
    category: CategoryId,
    dueIn: number,
    note: string | null = null,
  ): BillRecord => ({
    id,
    vendor,
    recipientId: idOf(vendor),
    invoiceNumber,
    amount,
    category,
    issuedOn: toIsoDate(addDays(now, dueIn - 30)),
    dueOn: toIsoDate(addDays(now, dueIn)),
    status: 'awaiting_payment',
    scheduledFor: null,
    paidAt: null,
    paymentId: null,
    note,
  });

  return [
    bill(
      'bil_rush',
      'Rush Truck Centers',
      'RO-58213',
      2_184_730,
      'maintenance',
      -3,
      'Engine rebuild, unit 214',
    ),
    bill('bil_gulf', 'Gulf States Mutual', 'POL-7741-11', 9_925_000, 'insurance', 4),
    bill('bil_cummins', 'Cummins Southern Plains', 'SP-90233', 1_462_810, 'maintenance', 7),
    bill(
      'bil_haynes',
      'Haynes & Cole LLP',
      '2026-1147',
      1_875_000,
      'professional',
      9,
      'November retainer',
    ),
    bill('bil_center', 'CenterPoint Energy', '88213390', 1_184_266, 'utilities', 11),
    bill('bil_meridian', 'Meridian Fleet Leasing', 'ML-5519', 19_180_000, 'equipment', 14),
    bill('bil_baker', 'Baker Ridge CPAs', 'BR-3302', 1_240_000, 'professional', 18, 'Q3 review'),
    bill('bil_bayport', 'Bayport Logistics Park', 'BLP-12', 4_610_000, 'facilities', 24),
  ];
}

function buildCards(now: Date, rng: Random): CardRecord[] {
  return CARDS.map((card) => ({
    id: card.id,
    nickname: card.nickname,
    kind: card.kind,
    design: card.design,
    status: card.frozen ? 'frozen' : 'active',
    holderId: card.holderId,
    accountId: card.accountId,
    last4: card.last4,
    expMonth: rng.int(1, 12),
    expYear: now.getUTCFullYear() + rng.int(2, 4),
    limit: { amount: card.limit, period: card.period },
    controls: {
      online: true,
      atm: card.kind === 'physical' && card.id === 'crd_executive',
      international: card.id === 'crd_executive',
      blockedMerchants: card.blockedMerchants,
    },
    createdAt: addDays(now, -rng.int(120, 700)).toISOString(),
    lastUsedAt: null,
    // Stripe-style test PAN: visibly fake, never routable.
    number: `4242 4242 4242 ${card.last4}`,
    cvc: rng.digits(3),
  }));
}

function buildAudit(now: Date): WorkspaceData['audit'] {
  const rows: [number, string, string, string, string, string | null][] = [
    [
      1,
      'usr_priya',
      'Priya Nair',
      'Created payment',
      'Meridian Fleet Leasing',
      'Wire, $184,500.00',
    ],
    [3, 'usr_priya', 'Priya Nair', 'Created payment', 'Tejas Crane & Rigging', 'Wire, $48,000.00'],
    [9, 'usr_marcus', 'Marcus Reed', 'Revealed account number', 'Operating ••4821', null],
    [20, 'usr_priya', 'Priya Nair', 'Created payment', 'Coastal Bend Carriers', 'ACH, $62,300.00'],
    [
      28,
      'usr_marcus',
      'Marcus Reed',
      'Scheduled payment',
      'Westchase Industrial Partners',
      'ACH, $68,400.00',
    ],
    [
      47,
      'usr_priya',
      'Priya Nair',
      'Added recipient',
      'Tejas Crane & Rigging',
      'First-payment review applies',
    ],
    [
      55,
      'usr_elena',
      'Elena Vasquez',
      'Froze card',
      'Marketing ••1178',
      'Paused until the Q1 budget',
    ],
    [
      72,
      'usr_marcus',
      'Marcus Reed',
      'Updated limit',
      'Parts & Repairs ••6420',
      '$30,000.00 monthly',
    ],
    [
      96,
      'usr_marcus',
      'Marcus Reed',
      'Approved payment',
      'Three Rivers Trucking',
      'ACH, $57,212.40',
    ],
    [130, 'usr_elena', 'Elena Vasquez', 'Invited team member', 'Daniel Okafor', 'Bookkeeper'],
    [
      168,
      'usr_elena',
      'Elena Vasquez',
      'Updated policy',
      'Dual approval on large wires',
      'Threshold $25,000.00',
    ],
  ];
  return rows.map(([hoursAgo, actorId, actorName, action, target, detail], index) => ({
    id: `aud_seed_${index}`,
    at: new Date(now.getTime() - hoursAgo * 3_600_000).toISOString(),
    actorId,
    actorName,
    action,
    target,
    detail,
  }));
}

function buildNotifications(now: Date): Notification[] {
  const hoursAgo = (hours: number) => new Date(now.getTime() - hours * 3_600_000).toISOString();
  return [
    {
      id: 'ntf_seed_1',
      at: hoursAgo(3),
      title: 'Wire waiting for approval',
      body: 'Priya Nair sent $184,500.00 to Meridian Fleet Leasing for review.',
      tone: 'attention',
      href: '/payments',
      read: false,
    },
    {
      id: 'ntf_seed_2',
      at: hoursAgo(7),
      title: 'New recipient needs review',
      body: 'First payment to Tejas Crane & Rigging is on hold until approved.',
      tone: 'attention',
      href: '/payments',
      read: false,
    },
    {
      id: 'ntf_seed_3',
      at: hoursAgo(30),
      title: 'Bill past due',
      body: 'Rush Truck Centers RO-58213 is 3 days overdue.',
      tone: 'attention',
      href: '/bills',
      read: true,
    },
    {
      id: 'ntf_seed_4',
      at: hoursAgo(52),
      title: 'Capital readiness updated',
      body: 'Your score rose 2 points on stronger collections.',
      tone: 'positive',
      href: '/capital',
      read: true,
    },
  ];
}
