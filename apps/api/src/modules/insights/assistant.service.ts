import { Injectable } from '@nestjs/common';
import {
  type AssistantAnswer,
  CATEGORIES,
  type CategoryId,
  formatCents,
  type IsoDate,
} from '@post-oak/contracts';
import { addDays, toIsoDate } from '../../common/time.js';
import type { Workspace } from '../../core/workspace/workspace.js';
import { isExternal, isPosted, sumOutflow, totalCash } from './analytics.js';
import { InsightsService } from './insights.service.js';

const CATEGORY_KEYWORDS: [RegExp, CategoryId][] = [
  [/fuel|diesel|gas\b/, 'fuel'],
  [/payroll|salar|wages/, 'payroll'],
  [/carrier|subcontract|drayage/, 'carriers'],
  [/software|saas|subscription/, 'software'],
  [/insurance/, 'insurance'],
  [/rent|facilit/, 'facilities'],
  [/lease|equipment|tractor/, 'equipment'],
  [/maintenance|repair|parts/, 'maintenance'],
  [/travel|flight|hotel|meal/, 'travel'],
  [/marketing|ads\b/, 'marketing'],
  [/legal|accounting|professional/, 'professional'],
  [/tax/, 'taxes'],
  [/utilit|telecom/, 'utilities'],
];

interface Period {
  label: string;
  from: IsoDate;
  to: IsoDate;
}

/**
 * Answers plain-English treasury questions straight from the ledger. It is a
 * deterministic intent parser, so the demo needs no model key and never invents a
 * number. A production build would put an LLM in front of these same tools.
 */
@Injectable()
export class AssistantService {
  constructor(private readonly insights: InsightsService) {}

  ask(workspace: Workspace, question: string): AssistantAnswer {
    const text = question.toLowerCase();
    const overview = this.insights.overview(workspace);

    if (/owe|receivable|overdue invoice|collect/.test(text)) {
      return {
        answer: `Customers owe ${formatCents(overview.receivables.outstanding)}, of which ${formatCents(overview.receivables.overdue)} is past due.`,
        facts: [],
        link: { label: 'Open receivables', href: '/invoices' },
      };
    }
    if (/runway|cash on hand|how long|last us/.test(text)) {
      return {
        answer: `At the current burn you hold ${overview.daysCashOnHand} days of cash on hand.`,
        facts: [
          { label: 'Total cash', value: formatCents(overview.totalCash) },
          { label: 'Net, last 30 days', value: formatCents(overview.net30d) },
        ],
        link: { label: 'Run a forecast', href: '/insights' },
      };
    }
    if (/approv/.test(text)) {
      const { count, total } = overview.pendingApprovals;
      return {
        answer:
          count === 0
            ? 'Nothing is waiting on approval.'
            : `${count} ${count === 1 ? 'payment is' : 'payments are'} waiting on approval, worth ${formatCents(total)}.`,
        facts: [],
        link: { label: 'Review payments', href: '/payments' },
      };
    }
    if (/\bbills?\b|due soon|payable/.test(text)) {
      const { count, total, overdueCount } = overview.upcomingBills;
      return {
        answer: `${count} open bills total ${formatCents(total)}. ${overdueCount} ${overdueCount === 1 ? 'is' : 'are'} past due.`,
        facts: [],
        link: { label: 'Open bills', href: '/bills' },
      };
    }
    if (/worth|valuation|ready|readiness|raise|sell|exit/.test(text)) {
      return {
        answer: 'Your capital readiness view shows where you stand before a raise or a sale.',
        facts: [],
        link: { label: 'Open capital readiness', href: '/capital' },
      };
    }

    const vendor = this.matchVendor(workspace, text);
    const category = CATEGORY_KEYWORDS.find(([pattern]) => pattern.test(text))?.[1];
    if (vendor || category || /spen[dt]|cost/.test(text)) {
      return this.spendAnswer(workspace, text, vendor, category);
    }

    if (/balance|cash|how much/.test(text)) {
      return {
        answer: `You hold ${formatCents(totalCash(workspace))} across ${workspace.accounts.length} accounts.`,
        facts: workspace.accounts.map((account) => ({
          label: account.name,
          value: formatCents(account.balance),
        })),
        link: { label: 'View accounts', href: '/accounts' },
      };
    }

    return {
      answer:
        'I can answer questions about balances, spending, receivables, bills and approvals. Try "How much did we spend on fuel last month?"',
      facts: [],
      link: null,
    };
  }

  private spendAnswer(
    workspace: Workspace,
    text: string,
    vendor: string | null,
    category: CategoryId | undefined,
  ): AssistantAnswer {
    const period = this.parsePeriod(text);
    const matches = workspace.transactions.filter((t) => {
      if (!isPosted(t) || !isExternal(t) || t.amount >= 0) return false;
      const day = t.date.slice(0, 10);
      if (day < period.from || day > period.to) return false;
      if (vendor) return t.counterparty === vendor;
      return category ? t.category === category : true;
    });

    const subject = vendor ?? (category ? CATEGORIES[category].label.toLowerCase() : 'everything');
    const params = new URLSearchParams({ from: period.from, to: period.to, direction: 'out' });
    if (vendor) params.set('q', vendor);
    else if (category) params.set('category', category);

    const largest = [...matches].sort((a, b) => a.amount - b.amount)[0];
    return {
      answer: `You spent ${formatCents(sumOutflow(matches))} on ${subject} ${period.label}.`,
      facts: [
        { label: 'Transactions', value: String(matches.length) },
        ...(largest
          ? [
              {
                label: 'Largest',
                value: `${largest.counterparty}, ${formatCents(-largest.amount)}`,
              },
            ]
          : []),
      ],
      link: { label: 'See these transactions', href: `/transactions?${params.toString()}` },
    };
  }

  private matchVendor(workspace: Workspace, text: string): string | null {
    const names = new Set(workspace.transactions.slice(0, 900).map((t) => t.counterparty));
    for (const name of names) {
      const first = name.toLowerCase().split(/[\s,]/)[0] ?? '';
      if (first.length > 3 && text.includes(first)) return name;
    }
    return null;
  }

  private parsePeriod(text: string): Period {
    const now = new Date();
    const today = toIsoDate(now);
    const year = now.getUTCFullYear();
    const month = now.getUTCMonth();

    if (/last month/.test(text)) {
      return {
        label: 'last month',
        from: toIsoDate(new Date(Date.UTC(year, month - 1, 1))),
        to: toIsoDate(new Date(Date.UTC(year, month, 0))),
      };
    }
    if (/this month/.test(text)) {
      return {
        label: 'this month',
        from: toIsoDate(new Date(Date.UTC(year, month, 1))),
        to: today,
      };
    }
    if (/this year|ytd|year to date/.test(text)) {
      return { label: 'this year', from: `${year}-01-01`, to: today };
    }
    if (/this week|last 7/.test(text)) {
      return { label: 'in the last 7 days', from: toIsoDate(addDays(now, -7)), to: today };
    }
    if (/quarter|last 90|3 months/.test(text)) {
      return { label: 'in the last 90 days', from: toIsoDate(addDays(now, -90)), to: today };
    }
    return { label: 'in the last 30 days', from: toIsoDate(addDays(now, -30)), to: today };
  }
}
