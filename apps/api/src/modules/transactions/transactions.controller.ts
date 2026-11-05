import { Body, Controller, Get, Header, Param, Patch, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type Transaction,
  type TransactionPage,
  type TransactionQuery,
  TransactionQuerySchema,
  type UpdateTransactionInput,
  UpdateTransactionSchema,
  type User,
} from '@post-oak/contracts';
import { Actor, CurrentWorkspace, RequirePermission } from '../../common/request-context.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import type { Workspace } from '../../core/workspace/workspace.js';
import { TransactionsService } from './transactions.service.js';

@ApiTags('Transactions')
@Controller('transactions')
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}

  @Get()
  @ApiOperation({ summary: 'Search, filter, sort and paginate the ledger' })
  search(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Query(new ZodPipe(TransactionQuerySchema)) query: TransactionQuery,
  ): TransactionPage {
    return this.transactions.search(workspace, actor, query);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @ApiOperation({ summary: 'Export the current filter as CSV' })
  export(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Query(new ZodPipe(TransactionQuerySchema)) query: TransactionQuery,
  ): string {
    return this.transactions.exportCsv(workspace, actor, query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one transaction with its timeline' })
  get(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Param('id') id: string,
  ): Transaction {
    return this.transactions.get(workspace, actor, id);
  }

  @Patch(':id')
  @RequirePermission('transactions:edit')
  @ApiOperation({ summary: 'Update category, memo, tags or receipt' })
  update(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Param('id') id: string,
    @Body(new ZodPipe(UpdateTransactionSchema)) input: UpdateTransactionInput,
  ): Transaction {
    return this.transactions.update(workspace, actor, id, input);
  }
}
