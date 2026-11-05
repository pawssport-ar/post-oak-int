import { Body, Controller, Get, HttpCode, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type AskInput,
  AskSchema,
  type AssistantAnswer,
  BALANCE_RANGES,
  type BalancePoint,
  type BalanceRange,
  type CashFlowMonth,
  type Forecast,
  type ForecastQuery,
  ForecastQuerySchema,
  type OverviewSummary,
  type SearchResults,
  SPENDING_PERIODS,
  type SpendingBreakdown,
  type SpendingPeriod,
  type TreasurySweep,
} from '@post-oak/contracts';
import { z } from 'zod';
import { CurrentWorkspace, RequirePermission } from '../../common/request-context.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import type { Workspace } from '../../core/workspace/workspace.js';
import { AssistantService } from './assistant.service.js';
import { InsightsService } from './insights.service.js';
import { SearchService } from './search.service.js';

const rangeSchema = z.enum(BALANCE_RANGES).default('90d');
const periodSchema = z.enum(SPENDING_PERIODS).default('30d');

@ApiTags('Insights')
@Controller()
export class InsightsController {
  constructor(
    private readonly insights: InsightsService,
    private readonly assistant: AssistantService,
    private readonly searchService: SearchService,
  ) {}

  @Get('overview')
  @RequirePermission('accounts:view')
  @ApiOperation({ summary: 'Headline treasury metrics for the dashboard' })
  overview(@CurrentWorkspace() workspace: Workspace): OverviewSummary {
    return this.insights.overview(workspace);
  }

  @Get('insights/balance')
  @RequirePermission('accounts:view')
  @ApiOperation({ summary: 'Daily closing cash for a range' })
  balance(
    @CurrentWorkspace() workspace: Workspace,
    @Query('range', new ZodPipe(rangeSchema)) range: BalanceRange,
  ): BalancePoint[] {
    return this.insights.balanceHistory(workspace, range);
  }

  @Get('insights/cash-flow')
  @RequirePermission('insights:view')
  @ApiOperation({ summary: 'Monthly money in and out, excluding internal transfers' })
  cashFlow(@CurrentWorkspace() workspace: Workspace): CashFlowMonth[] {
    return this.insights.cashFlow(workspace);
  }

  @Get('insights/spending')
  @RequirePermission('insights:view')
  @ApiOperation({ summary: 'Spend by category and vendor, against the prior period' })
  spending(
    @CurrentWorkspace() workspace: Workspace,
    @Query('period', new ZodPipe(periodSchema)) period: SpendingPeriod,
  ): SpendingBreakdown {
    return this.insights.spending(workspace, period);
  }

  @Get('insights/forecast')
  @RequirePermission('insights:view')
  @ApiOperation({ summary: 'Cash projection with scenario levers' })
  forecast(
    @CurrentWorkspace() workspace: Workspace,
    @Query(new ZodPipe(ForecastQuerySchema)) query: ForecastQuery,
  ): Forecast {
    return this.insights.forecast(workspace, query);
  }

  @Get('insights/sweep')
  @RequirePermission('insights:view')
  @ApiOperation({ summary: 'Suggest moving idle operating cash into the yield reserve' })
  sweep(@CurrentWorkspace() workspace: Workspace): TreasurySweep | null {
    return this.insights.sweep(workspace);
  }

  @Post('assistant/ask')
  @HttpCode(200)
  @RequirePermission('insights:view')
  @ApiOperation({ summary: 'Answer a plain-English treasury question from the ledger' })
  ask(
    @CurrentWorkspace() workspace: Workspace,
    @Body(new ZodPipe(AskSchema)) input: AskInput,
  ): AssistantAnswer {
    return this.assistant.ask(workspace, input.question);
  }

  @Get('search')
  @RequirePermission('accounts:view')
  @ApiOperation({ summary: 'Global search for the command palette' })
  search(@CurrentWorkspace() workspace: Workspace, @Query('q') q: string): SearchResults {
    return this.searchService.search(workspace, q ?? '');
  }
}
