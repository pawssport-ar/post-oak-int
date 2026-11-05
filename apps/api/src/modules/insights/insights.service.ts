import { Injectable } from '@nestjs/common';
import type {
  BalancePoint,
  BalanceRange,
  CashFlowMonth,
  CategoryId,
  Cents,
  Forecast,
  ForecastMilestone,
  ForecastPoint,
  ForecastQuery,
  OverviewSummary,
  SpendingBreakdown,
  SpendingPeriod,
  Transaction,
  TreasurySweep,
} from '@post-oak/contracts';
import { addDays, DAY_MS, isWeekend, toIsoDate } from '../../common/time.js';
import type { Workspace } from '../../core/workspace/workspace.js';
import { Random } from '../../seed/random.js';
import { InvoicesService } from '../invoices/invoices.service.js';
import { PaymentsService } from '../payments/payments.service.js';
import {
  dailyBalances,
  isExternal,
  isPosted,
  sumInflow,
  sumOutflow,
  totalCash,
  windowed,
} from './analytics.js';

const RANGE_DAYS: Record<BalanceRange, number> = { '30d': 30, '90d': 90, '1y': 365 };
const OPERATING_FLOOR: Cents = 600_000_000;
const BUSINESS_DAYS_IN_90 = 64;
const SWEEP_BUFFER_DAYS = 30;
const SWEEP_MINIMUM: Cents = 10_000_000;
const SWEEP_ROUNDING: Cents = 5_000_000;

/** Costs that land on known dates, and are placed on the calendar rather than averaged. */
const SCHEDULED_CATEGORIES = new Set<CategoryId>([
  'payroll',
  'equipment',
  'facilities',
  'insurance',
  'taxes',
]);

const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

@Injectable()
export class InsightsService {
  constructor(
    private readonly payments: PaymentsService,
    private readonly invoices: InvoicesService,
  ) {}

  overview(workspace: Workspace): OverviewSummary {
    const current = windowed(workspace, 30);
    const previous = windowed(workspace, 60, 30);
    const cash = totalCash(workspace);
    const history = dailyBalances(workspace, 31);
    const startOf30 = history[0]?.balance ?? cash;
    const moneyOut90 = sumOutflow(windowed(workspace, 90));
    const moneyIn30d = sumInflow(current);
    const moneyOut30d = sumOutflow(current);
    const year = new Date().getUTCFullYear().toString();
    const today = toIsoDate(new Date());
    const openBills = workspace.bills.filter(
      (bill) => bill.status === 'awaiting_payment' || bill.status === 'scheduled',
    );
    const receivables = this.invoices.summary(workspace);

    return {
      totalCash: cash,
      change30d: cash - startOf30,
      changePct30d: startOf30 === 0 ? 0 : (cash - startOf30) / startOf30,
      moneyIn30d,
      moneyOut30d,
      moneyInPrev30d: sumInflow(previous),
      moneyOutPrev30d: sumOutflow(previous),
      net30d: moneyIn30d - moneyOut30d,
      daysCashOnHand: moneyOut90 === 0 ? 0 : Math.round(cash / (moneyOut90 / 90)),
      yieldEarnedYtd: workspace.transactions
        .filter((t) => t.category === 'interest' && t.date.startsWith(year))
        .reduce((sum, t) => sum + t.amount, 0),
      pendingApprovals: this.payments.pendingApprovalTotal(workspace),
      upcomingBills: {
        count: openBills.length,
        total: openBills.reduce((sum, bill) => sum + bill.amount, 0),
        overdueCount: openBills.filter(
          (bill) => bill.status === 'awaiting_payment' && bill.dueOn < today,
        ).length,
      },
      receivables: { outstanding: receivables.outstanding, overdue: receivables.overdue },
    };
  }

  balanceHistory(workspace: Workspace, range: BalanceRange): BalancePoint[] {
    return dailyBalances(workspace, RANGE_DAYS[range]);
  }

  cashFlow(workspace: Workspace, months = 12): CashFlowMonth[] {
    const now = new Date();
    const buckets = new Map<string, { inflow: Cents; outflow: Cents }>();
    for (const t of workspace.transactions) {
      if (!isPosted(t) || !isExternal(t)) continue;
      const key = t.date.slice(0, 7);
      const bucket = buckets.get(key) ?? { inflow: 0, outflow: 0 };
      if (t.amount > 0) bucket.inflow += t.amount;
      else bucket.outflow -= t.amount;
      buckets.set(key, bucket);
    }

    const result: CashFlowMonth[] = [];
    for (let offset = months - 1; offset >= 0; offset -= 1) {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - offset, 1));
      const month = date.toISOString().slice(0, 7);
      const bucket = buckets.get(month) ?? { inflow: 0, outflow: 0 };
      result.push({
        month,
        label: monthFormat.format(date),
        inflow: bucket.inflow,
        outflow: bucket.outflow,
        net: bucket.inflow - bucket.outflow,
        partial: offset === 0,
      });
    }
    return result;
  }

  spending(workspace: Workspace, period: SpendingPeriod): SpendingBreakdown {
    const days = this.periodDays(period);
    const current = windowed(workspace, days).filter((t) => t.amount < 0);
    const previous = windowed(workspace, days * 2, days).filter((t) => t.amount < 0);
    const total = sumOutflow(current);

    const byCategory = this.groupBy(current, (t) => t.category);
    const previousByCategory = this.groupBy(previous, (t) => t.category);
    const categories = [...byCategory.entries()]
      .map(([category, items]) => {
        const amount = sumOutflow(items);
        const before = sumOutflow(previousByCategory.get(category) ?? []);
        return {
          category,
          amount,
          share: total === 0 ? 0 : amount / total,
          previous: before,
          changePct: before === 0 ? null : (amount - before) / before,
        };
      })
      .sort((a, b) => b.amount - a.amount);

    const vendors = [...this.groupBy(current, (t) => t.counterparty).entries()]
      .map(([name, items]) => ({
        name,
        amount: sumOutflow(items),
        count: items.length,
        category: items[0]?.category ?? 'uncategorized',
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    return { period, total, previousTotal: sumOutflow(previous), categories, vendors };
  }

  /**
   * Projects daily cash from trailing run-rates plus the calendar of known obligations.
   * The band widens with the square root of time, the usual shape of forecast error.
   */
  forecast(workspace: Workspace, query: ForecastQuery): Forecast {
    const now = new Date();
    const start = totalCash(workspace);
    const recent = windowed(workspace, 90);
    const noise = new Random(7);

    const revenueFactor = 1 + query.revenuePct / 100;
    const expenseFactor = 1 + query.expensePct / 100;
    const dailyInflow = sumInflow(recent) / BUSINESS_DAYS_IN_90;
    const dailyVariableCost =
      sumOutflow(recent.filter((t) => !SCHEDULED_CATEGORIES.has(t.category))) / BUSINESS_DAYS_IN_90;

    const obligations = this.recurringObligations(recent);
    const nextPayday = this.nextPayday(workspace, now);

    let balance = start;
    let lowest = { date: toIsoDate(now), amount: start };
    const points: ForecastPoint[] = [
      { date: toIsoDate(now), expected: start, low: start, high: start },
    ];
    const milestones: ForecastMilestone[] = [];

    for (let day = 1; day <= query.horizon; day += 1) {
      const date = addDays(now, day);
      const iso = toIsoDate(date);
      const dayOfMonth = date.getUTCDate();

      if (!isWeekend(date)) {
        const collecting = day <= query.collectionDelayDays ? 0.35 : 1;
        balance += Math.round(dailyInflow * revenueFactor * collecting * noise.between(0.82, 1.18));
        balance -= Math.round(dailyVariableCost * expenseFactor * noise.between(0.88, 1.12));
      }

      const isPayday = Math.round((date.getTime() - nextPayday.getTime()) / DAY_MS) % 14 === 0;
      if (isPayday && date >= nextPayday) {
        const amount = Math.round(obligations.payrollRun * expenseFactor);
        balance -= amount;
        milestones.push({ date: iso, label: 'Payroll', amount: -amount });
      }
      if (dayOfMonth === 1) balance -= Math.round(obligations.facilities * expenseFactor);
      if (dayOfMonth === 5) balance -= Math.round(obligations.equipment * expenseFactor);
      if (dayOfMonth === 10) balance -= Math.round(obligations.insurance * expenseFactor);
      if (dayOfMonth === 15 && [0, 3, 5, 8].includes(date.getUTCMonth())) {
        balance -= obligations.quarterlyTax;
        milestones.push({
          date: iso,
          label: 'Estimated taxes',
          amount: -obligations.quarterlyTax,
        });
      }
      if (query.oneTimeOutflow > 0 && day === 14) {
        balance -= query.oneTimeOutflow;
        milestones.push({
          date: iso,
          label: 'One-time outflow',
          amount: -query.oneTimeOutflow,
        });
      }

      const spread = Math.round(start * 0.0052 * Math.sqrt(day));
      points.push({ date: iso, expected: balance, low: balance - spread, high: balance + spread });
      if (balance < lowest.amount) lowest = { date: iso, amount: balance };
    }

    return {
      start,
      end: balance,
      lowest,
      floor: OPERATING_FLOOR,
      breachesFloor: lowest.amount < OPERATING_FLOOR,
      points,
      milestones,
    };
  }

  /** Finds operating cash above a month of outflows that could be earning yield instead. */
  sweep(workspace: Workspace): TreasurySweep | null {
    const operating = workspace.accounts.find((a) => a.kind === 'operating');
    const reserve = workspace.accounts.find((a) => a.kind === 'reserve');
    if (!operating || !reserve?.apyBps) return null;

    const dailyOutflow = sumOutflow(windowed(workspace, 90)) / 90;
    const buffer = dailyOutflow * SWEEP_BUFFER_DAYS;
    const excess = operating.balance - buffer;
    const amount = Math.floor(excess / SWEEP_ROUNDING) * SWEEP_ROUNDING;
    if (amount < SWEEP_MINIMUM) return null;

    return {
      fromAccountId: operating.id,
      fromAccountName: operating.name,
      toAccountId: reserve.id,
      toAccountName: reserve.name,
      amount,
      annualYield: Math.round((amount * reserve.apyBps) / 10_000),
      apyBps: reserve.apyBps,
      bufferDays: SWEEP_BUFFER_DAYS,
    };
  }

  private recurringObligations(recent: Transaction[]) {
    const monthly = (category: CategoryId) =>
      sumOutflow(recent.filter((t) => t.category === category)) / 3;
    const payroll = recent.filter((t) => t.category === 'payroll');
    const runs = new Set(
      payroll.filter((t) => t.counterparty === 'Payroll run').map((t) => t.date.slice(0, 10)),
    ).size;
    return {
      payrollRun: runs === 0 ? 0 : sumOutflow(payroll) / runs,
      facilities: monthly('facilities'),
      equipment: monthly('equipment'),
      insurance: monthly('insurance'),
      quarterlyTax: 22_000_000,
    };
  }

  private nextPayday(workspace: Workspace, now: Date): Date {
    const last = workspace.transactions.find((t) => t.counterparty === 'Payroll run');
    let payday = last ? new Date(last.date) : now;
    while (payday <= now) payday = addDays(payday, 14);
    return payday;
  }

  private periodDays(period: SpendingPeriod): number {
    if (period === '30d') return 30;
    if (period === '90d') return 90;
    const now = new Date();
    return Math.ceil((now.getTime() - Date.UTC(now.getUTCFullYear(), 0, 1)) / DAY_MS);
  }

  private groupBy<K>(items: Transaction[], key: (t: Transaction) => K): Map<K, Transaction[]> {
    const groups = new Map<K, Transaction[]>();
    for (const item of items) {
      const group = groups.get(key(item));
      if (group) group.push(item);
      else groups.set(key(item), [item]);
    }
    return groups;
  }
}
