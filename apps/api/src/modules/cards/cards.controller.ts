import { Body, Controller, Get, HttpCode, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  type Card,
  type CardSecrets,
  type IssueCardInput,
  IssueCardSchema,
  type UpdateCardInput,
  UpdateCardSchema,
  type User,
} from '@post-oak/contracts';
import { Actor, CurrentWorkspace, RequirePermission } from '../../common/request-context.js';
import { ZodPipe } from '../../common/zod.pipe.js';
import type { Workspace } from '../../core/workspace/workspace.js';
import { CardsService } from './cards.service.js';

@ApiTags('Cards')
@Controller('cards')
export class CardsController {
  constructor(private readonly cards: CardsService) {}

  @Get()
  @ApiOperation({ summary: 'List cards. Cardholders only see their own.' })
  list(@CurrentWorkspace() workspace: Workspace, @Actor() actor: User): Card[] {
    return this.cards.list(workspace, actor);
  }

  @Post()
  @RequirePermission('cards:manage')
  @ApiOperation({ summary: 'Issue a physical or virtual card' })
  issue(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Body(new ZodPipe(IssueCardSchema)) input: IssueCardInput,
  ): Card {
    return this.cards.issue(workspace, actor, input);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get one card' })
  get(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Param('id') id: string,
  ): Card {
    return this.cards.get(workspace, actor, id);
  }

  @Patch(':id')
  @RequirePermission('cards:manage')
  @ApiOperation({ summary: 'Change limits and spend controls' })
  update(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Param('id') id: string,
    @Body(new ZodPipe(UpdateCardSchema)) input: UpdateCardInput,
  ): Card {
    return this.cards.update(workspace, actor, id, input);
  }

  @Post(':id/freeze')
  @HttpCode(200)
  @ApiOperation({ summary: 'Freeze a card instantly' })
  freeze(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Param('id') id: string,
  ): Card {
    return this.cards.setFrozen(workspace, actor, id, true);
  }

  @Post(':id/unfreeze')
  @HttpCode(200)
  @ApiOperation({ summary: 'Unfreeze a card' })
  unfreeze(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Param('id') id: string,
  ): Card {
    return this.cards.setFrozen(workspace, actor, id, false);
  }

  @Post(':id/reveal')
  @HttpCode(200)
  @ApiOperation({ summary: 'Reveal the test card number. Every call is audited.' })
  reveal(
    @CurrentWorkspace() workspace: Workspace,
    @Actor() actor: User,
    @Param('id') id: string,
  ): CardSecrets {
    return this.cards.reveal(workspace, actor, id);
  }
}
