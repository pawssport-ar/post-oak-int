import { Controller, Get, Header, HttpCode, Param, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Account, AccountSecrets, Statement, User } from '@post-oak/contracts';
import { Actor, CurrentWorkspace, RequirePermission } from '../../common/request-context.js';
import type { Workspace } from '../../core/workspace/workspace.js';
import { AccountsService } from './accounts.service.js';

@ApiTags('Accounts')
@Controller('accounts')
export class AccountsController {
  constructor(private readonly accounts: AccountsService) {}

  @Get()
  @RequirePermission('accounts:view')
  @ApiOperation({ summary: 'List deposit accounts with balances and a 30-day trend' })
  list(@CurrentWorkspace() workspace: Workspace): Account[] {
    return this.accounts.list(workspace);
  }

  @Get(':id')
  @RequirePermission('accounts:view')
  @ApiOperation({ summary: 'Get one account' })
  get(@CurrentWorkspace() workspace: Workspace, @Param('id') id: string): Account {
    return this.accounts.get(workspace, id);
  }

  @Post(':id/reveal')
  @HttpCode(200)
  @RequirePermission('accounts:reveal')
  @ApiOperation({ summary: 'Reveal the full account number. Every call is audited.' })
  reveal(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Param('id') id: string,
  ): AccountSecrets {
    return this.accounts.reveal(workspace, actor, id);
  }

  @Get(':id/statements')
  @RequirePermission('accounts:view')
  @ApiOperation({ summary: 'List monthly statements' })
  statements(@CurrentWorkspace() workspace: Workspace, @Param('id') id: string): Statement[] {
    return this.accounts.statements(workspace, id);
  }

  @Get(':id/statements/:period/csv')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @RequirePermission('accounts:view')
  @ApiOperation({ summary: 'Download a statement as CSV' })
  statementCsv(
    @CurrentWorkspace() workspace: Workspace,
    @Param('id') id: string,
    @Param('period') period: string,
  ): string {
    return this.accounts.statementCsv(workspace, id, period);
  }
}
