import { Body, Controller, Get, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type CreateInvoiceInput,
  CreateInvoiceSchema,
  type Invoice,
  type ReceivablesSummary,
  type User,
} from '@post-oak/contracts';
import { Actor, CurrentWorkspace, RequirePermission } from '../../common/request-context.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import type { Workspace } from '../../core/workspace/workspace.js';
import { InvoicesService } from './invoices.service.js';

@ApiTags('Invoices')
@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoices: InvoicesService) {}

  @Get()
  @RequirePermission('accounts:view')
  @ApiOperation({ summary: 'List invoices, newest first' })
  list(@CurrentWorkspace() workspace: Workspace): Invoice[] {
    return this.invoices.list(workspace);
  }

  @Get('summary')
  @RequirePermission('accounts:view')
  @ApiOperation({ summary: 'Receivables totals and the aging report' })
  summary(@CurrentWorkspace() workspace: Workspace): ReceivablesSummary {
    return this.invoices.summary(workspace);
  }

  @Post()
  @RequirePermission('invoices:manage')
  @ApiOperation({ summary: 'Create an invoice, optionally sending it right away' })
  create(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Body(new ZodPipe(CreateInvoiceSchema)) input: CreateInvoiceInput,
  ): Invoice {
    return this.invoices.create(workspace, actor, input);
  }

  @Post(':id/send')
  @HttpCode(200)
  @RequirePermission('invoices:manage')
  @ApiOperation({ summary: 'Send a draft' })
  send(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Param('id') id: string,
  ): Invoice {
    return this.invoices.send(workspace, actor, id);
  }

  @Post(':id/remind')
  @HttpCode(200)
  @RequirePermission('invoices:manage')
  @ApiOperation({ summary: 'Send a payment reminder' })
  remind(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Param('id') id: string,
  ): Invoice {
    return this.invoices.remind(workspace, actor, id);
  }

  @Post(':id/mark-paid')
  @HttpCode(200)
  @RequirePermission('invoices:manage')
  @ApiOperation({ summary: 'Record a payment and post it to the ledger' })
  markPaid(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Param('id') id: string,
  ): Invoice {
    return this.invoices.markPaid(workspace, actor, id);
  }

  @Post(':id/void')
  @HttpCode(200)
  @RequirePermission('invoices:manage')
  @ApiOperation({ summary: 'Void an unpaid invoice' })
  void(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Param('id') id: string,
  ): Invoice {
    return this.invoices.void(workspace, actor, id);
  }
}
