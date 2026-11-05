import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type Bill,
  type CreateBillInput,
  CreateBillSchema,
  type PayBillInput,
  PayBillSchema,
  type User,
} from '@post-oak/contracts';
import { Actor, CurrentWorkspace, RequirePermission } from '../../common/request-context.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import type { Workspace } from '../../core/workspace/workspace.js';
import { BillsService } from './bills.service.js';

@ApiTags('Bills')
@Controller('bills')
export class BillsController {
  constructor(private readonly bills: BillsService) {}

  @Get()
  @RequirePermission('accounts:view')
  @ApiOperation({ summary: 'List bills by due date' })
  list(@CurrentWorkspace() workspace: Workspace): Bill[] {
    return this.bills.list(workspace);
  }

  @Post()
  @RequirePermission('bills:manage')
  @ApiOperation({ summary: 'Add a bill' })
  create(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Body(new ZodPipe(CreateBillSchema)) input: CreateBillInput,
  ): Bill {
    return this.bills.create(workspace, actor, input);
  }

  @Post(':id/pay')
  @HttpCode(200)
  @RequirePermission('bills:manage')
  @ApiOperation({ summary: 'Pay or schedule a bill. Approval policies still apply.' })
  pay(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Param('id') id: string,
    @Body(new ZodPipe(PayBillSchema)) input: PayBillInput,
  ): Bill {
    return this.bills.pay(workspace, actor, id, input);
  }
}
