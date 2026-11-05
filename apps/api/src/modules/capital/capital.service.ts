import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import {
  ADVISORY_TOPICS,
  type AdvisoryRequest,
  type CapitalReadiness,
  type CreateAdvisoryRequestInput,
  type User,
} from '@post-oak/contracts';
import { AuditService } from '../../core/audit/audit.service.js';
import { RealtimeService } from '../../core/realtime/realtime.service.js';
import type { Workspace } from '../../core/workspace/workspace.js';
import { ADVISOR } from '../../seed/catalog.js';
import { sumInflow, sumOutflow, windowed } from '../insights/analytics.js';
import { InsightsService } from '../insights/insights.service.js';
import { InvoicesService } from '../invoices/invoices.service.js';
import {
  bandFor,
  headlineFor,
  indicativeValuation,
  overallScore,
  scorePillars,
} from './readiness.js';

const monthFormat = new Intl.DateTimeFormat('en-US', { month: 'short', timeZone: 'UTC' });

@Injectable()
export class CapitalService {
  constructor(
    private readonly insights: InsightsService,
    private readonly invoices: InvoicesService,
    private readonly audit: AuditService,
    private readonly realtime: RealtimeService,
  ) {}

  readiness(workspace: Workspace): CapitalReadiness {
    const overview = this.insights.overview(workspace);
    const year = windowed(workspace, 365);
    const receipts = year.filter((t) => t.category === 'revenue');
    const revenueTtm = sumInflow(receipts);
    const operatingCashTtm = sumInflow(year) - sumOutflow(year);

    const latestHalf = sumInflow(windowed(workspace, 182).filter((t) => t.category === 'revenue'));
    const previousHalf = sumInflow(
      windowed(workspace, 364, 182).filter((t) => t.category === 'revenue'),
    );

    const totals = new Map<string, number>();
    for (const t of receipts)
      totals.set(t.counterparty, (totals.get(t.counterparty) ?? 0) + t.amount);
    const [topName, topAmount] = [...totals.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0];

    const pillars = scorePillars({
      daysCashOnHand: overview.daysCashOnHand,
      revenueGrowth: previousHalf === 0 ? 0 : latestHalf / previousHalf - 1,
      operatingMargin: revenueTtm === 0 ? 0 : operatingCashTtm / revenueTtm,
      topCustomerShare: revenueTtm === 0 ? 0 : topAmount / revenueTtm,
      topCustomerName: topName,
      averageDaysToPay: this.invoices.summary(workspace).averageDaysToPay,
    });

    const score = overallScore(pillars);
    const band = bandFor(score);
    return {
      score,
      band,
      headline: headlineFor(band),
      pillars,
      history: this.scoreHistory(score),
      operatingCashTtm,
      revenueTtm,
      valuation: indicativeValuation(operatingCashTtm, score),
      advisor: ADVISOR,
      requests: workspace.advisoryRequests,
    };
  }

  requestAdvisor(
    workspace: Workspace,
    actor: User,
    input: CreateAdvisoryRequestInput,
  ): AdvisoryRequest {
    const request: AdvisoryRequest = {
      id: `adv_${randomUUID().slice(0, 10)}`,
      topic: input.topic,
      note: input.note || null,
      createdAt: new Date().toISOString(),
      status: 'received',
    };
    workspace.advisoryRequests.unshift(request);
    this.audit.record(workspace, actor, 'Requested advisory', ADVISORY_TOPICS[input.topic]);
    this.realtime.publish(workspace, 'capital.request', ['capital'], {
      title: 'Request sent to your advisor',
      body: `${ADVISOR.name} will reach out within 48 hours.`,
      tone: 'positive',
      href: '/capital',
    });
    return request;
  }

  /** Trailing six months. Earlier readings step toward today's score. */
  private scoreHistory(score: number): CapitalReadiness['history'] {
    const steps = [7, 6, 4, 3, 2, 0];
    const now = new Date();
    return steps.map((step, index) => {
      const date = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (5 - index), 1));
      return {
        month: date.toISOString().slice(0, 7),
        label: monthFormat.format(date),
        score: score - step,
      };
    });
  }
}
