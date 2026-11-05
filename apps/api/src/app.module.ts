import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ActivitySimulator } from './baas/activity-simulator.js';
import { BAAS_PROVIDER } from './baas/baas.port.js';
import { MockBaasProvider } from './baas/mock-baas.provider.js';
import { PermissionsGuard } from './common/permissions.guard.js';
import { ProblemDetailsFilter } from './common/problem-details.filter.js';
import { WorkspaceGuard } from './common/workspace.guard.js';
import { CoreModule } from './core/core.module.js';
import { AccountsController } from './modules/accounts/accounts.controller.js';
import { AccountsService } from './modules/accounts/accounts.service.js';
import { BillsController } from './modules/bills/bills.controller.js';
import { BillsService } from './modules/bills/bills.service.js';
import { CapitalController } from './modules/capital/capital.controller.js';
import { CapitalService } from './modules/capital/capital.service.js';
import { CardsController } from './modules/cards/cards.controller.js';
import { CardsService } from './modules/cards/cards.service.js';
import { HealthController } from './modules/health/health.controller.js';
import { AssistantService } from './modules/insights/assistant.service.js';
import { InsightsController } from './modules/insights/insights.controller.js';
import { InsightsService } from './modules/insights/insights.service.js';
import { SearchService } from './modules/insights/search.service.js';
import { InvoicesController } from './modules/invoices/invoices.controller.js';
import { InvoicesService } from './modules/invoices/invoices.service.js';
import { PaymentsController } from './modules/payments/payments.controller.js';
import { PaymentsService } from './modules/payments/payments.service.js';
import { EventsController } from './modules/realtime/events.controller.js';
import { RecipientsController } from './modules/recipients/recipients.controller.js';
import { RecipientsService } from './modules/recipients/recipients.service.js';
import { SessionController } from './modules/session/session.controller.js';
import { TeamController } from './modules/team/team.controller.js';
import { TeamService } from './modules/team/team.service.js';
import { TransactionsController } from './modules/transactions/transactions.controller.js';
import { TransactionsService } from './modules/transactions/transactions.service.js';

@Module({
  imports: [CoreModule],
  controllers: [
    AccountsController,
    BillsController,
    CapitalController,
    CardsController,
    EventsController,
    HealthController,
    InsightsController,
    InvoicesController,
    PaymentsController,
    RecipientsController,
    SessionController,
    TeamController,
    TransactionsController,
  ],
  providers: [
    // Swap this one line for a real adapter (Unit, Column, Treasury Prime...) in production.
    { provide: BAAS_PROVIDER, useClass: MockBaasProvider },
    AccountsService,
    ActivitySimulator,
    AssistantService,
    BillsService,
    CapitalService,
    CardsService,
    InsightsService,
    InvoicesService,
    PaymentsService,
    RecipientsService,
    SearchService,
    TeamService,
    TransactionsService,
    { provide: APP_GUARD, useClass: WorkspaceGuard },
    { provide: APP_GUARD, useClass: PermissionsGuard },
    { provide: APP_FILTER, useClass: ProblemDetailsFilter },
  ],
})
export class AppModule {}
