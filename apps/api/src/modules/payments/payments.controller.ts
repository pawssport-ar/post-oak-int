import { Body, Controller, Get, HttpCode, Param, Post, UseInterceptors } from '@nestjs/common';
import { ApiHeader, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type CreatePaymentInput,
  CreatePaymentSchema,
  type Payment,
  type PaymentDecisionInput,
  PaymentDecisionSchema,
  type PaymentQuote,
  type User,
} from '@post-oak/contracts';
import { IdempotencyInterceptor } from '../../common/idempotency.interceptor.js';
import { Actor, CurrentWorkspace, RequirePermission } from '../../common/request-context.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import type { Workspace } from '../../core/workspace/workspace.js';
import { PaymentsService } from './payments.service.js';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  @RequirePermission('accounts:view')
  @ApiOperation({ summary: 'List payments, newest first' })
  list(@CurrentWorkspace() workspace: Workspace): Payment[] {
    return this.payments.list(workspace);
  }

  @Post('quote')
  @HttpCode(200)
  @RequirePermission('payments:create')
  @ApiOperation({ summary: 'Preview fees, arrival, approvals and warnings without moving money' })
  quote(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Body(new ZodPipe(CreatePaymentSchema)) input: CreatePaymentInput,
  ): PaymentQuote {
    return this.payments.quote(workspace, actor, input);
  }

  @Post()
  @UseInterceptors(IdempotencyInterceptor)
  @RequirePermission('payments:create')
  @ApiHeader({ name: 'Idempotency-Key', required: false })
  @ApiOperation({ summary: 'Create a payment. Retries with the same key are safe.' })
  create(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Body(new ZodPipe(CreatePaymentSchema)) input: CreatePaymentInput,
  ): Payment {
    return this.payments.create(workspace, actor, input);
  }

  @Get(':id')
  @RequirePermission('accounts:view')
  @ApiOperation({ summary: 'Get one payment with its full timeline' })
  get(@CurrentWorkspace() workspace: Workspace, @Param('id') id: string): Payment {
    return this.payments.get(workspace, id);
  }

  @Post(':id/approve')
  @HttpCode(200)
  @RequirePermission('payments:approve')
  @ApiOperation({ summary: 'Approve a payment. The creator can never approve their own.' })
  approve(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Param('id') id: string,
    @Body(new ZodPipe(PaymentDecisionSchema)) input: PaymentDecisionInput,
  ): Payment {
    return this.payments.approve(workspace, actor, id, input.note);
  }

  @Post(':id/reject')
  @HttpCode(200)
  @RequirePermission('payments:approve')
  @ApiOperation({ summary: 'Reject a payment' })
  reject(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Param('id') id: string,
    @Body(new ZodPipe(PaymentDecisionSchema)) input: PaymentDecisionInput,
  ): Payment {
    return this.payments.reject(workspace, actor, id, input.note);
  }

  @Post(':id/cancel')
  @HttpCode(200)
  @RequirePermission('payments:create')
  @ApiOperation({ summary: 'Cancel a payment that has not left the bank' })
  cancel(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Param('id') id: string,
  ): Payment {
    return this.payments.cancel(workspace, actor, id);
  }
}
