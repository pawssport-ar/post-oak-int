import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type CreateRecipientInput,
  CreateRecipientSchema,
  type Recipient,
  type User,
} from '@post-oak/contracts';
import { Actor, CurrentWorkspace, RequirePermission } from '../../common/request-context.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import type { Workspace } from '../../core/workspace/workspace.js';
import { RecipientsService } from './recipients.service.js';

@ApiTags('Recipients')
@Controller('recipients')
export class RecipientsController {
  constructor(private readonly recipients: RecipientsService) {}

  @Get()
  @RequirePermission('payments:create')
  @ApiOperation({ summary: 'List saved recipients' })
  list(@CurrentWorkspace() workspace: Workspace): Recipient[] {
    return this.recipients.list(workspace);
  }

  @Get('bank-lookup')
  @RequirePermission('payments:create')
  @ApiOperation({ summary: 'Validate an ABA routing number and name its bank' })
  lookup(@Query('routing') routing: string): { valid: boolean; bankName: string | null } {
    return this.recipients.bankFor(routing ?? '');
  }

  @Post()
  @RequirePermission('payments:create')
  @ApiOperation({ summary: 'Add a recipient. Their first payment is reviewed by policy.' })
  create(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Body(new ZodPipe(CreateRecipientSchema)) input: CreateRecipientInput,
  ): Recipient {
    return this.recipients.create(workspace, actor, input);
  }
}
