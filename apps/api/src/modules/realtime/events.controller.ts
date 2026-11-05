import { Controller, type MessageEvent, Sse } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { defer, finalize, interval, map, merge, type Observable } from 'rxjs';
import { CurrentWorkspace } from '../../common/request-context.js';
import { RealtimeService } from '../../core/realtime/realtime.service.js';
import type { Workspace } from '../../core/workspace/workspace.js';

const HEARTBEAT_MS = 20_000;

@ApiTags('Realtime')
@Controller()
export class EventsController {
  constructor(private readonly realtime: RealtimeService) {}

  /** Server-Sent Events: one-way, proxy-friendly, and reconnects on its own. */
  @Sse('events')
  @ApiOperation({ summary: 'Live stream of ledger, payment and card events' })
  stream(@CurrentWorkspace() workspace: Workspace): Observable<MessageEvent> {
    return defer(() => {
      const disconnect = this.realtime.connect(workspace.id);
      const events = this.realtime
        .stream(workspace.id)
        .pipe(map((event): MessageEvent => ({ data: event })));
      const heartbeat = interval(HEARTBEAT_MS).pipe(
        map((): MessageEvent => ({ type: 'heartbeat', data: '' })),
      );
      return merge(events, heartbeat).pipe(finalize(disconnect));
    });
  }
}
