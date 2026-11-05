import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type AdvisoryRequest,
  type CapitalReadiness,
  type CreateAdvisoryRequestInput,
  CreateAdvisoryRequestSchema,
  type User,
} from '@post-oak/contracts';
import { Actor, CurrentWorkspace, RequirePermission } from '../../common/request-context.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import type { Workspace } from '../../core/workspace/workspace.js';
import { CapitalService } from './capital.service.js';

@ApiTags('Capital')
@Controller('capital')
export class CapitalController {
  constructor(private readonly capital: CapitalService) {}

  @Get('readiness')
  @RequirePermission('insights:view')
  @ApiOperation({ summary: 'Score transaction readiness from banking data' })
  readiness(@CurrentWorkspace() workspace: Workspace): CapitalReadiness {
    return this.capital.readiness(workspace);
  }

  @Post('requests')
  @RequirePermission('insights:view')
  @ApiOperation({ summary: 'Ask a Post Oak advisor for a conversation' })
  request(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Body(new ZodPipe(CreateAdvisoryRequestSchema)) input: CreateAdvisoryRequestInput,
  ): AdvisoryRequest {
    return this.capital.requestAdvisor(workspace, actor, input);
  }
}
