import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { type Observable, of, tap } from 'rxjs';
import type { ContextualRequest } from './request-context.js';

const IDEMPOTENCY_HEADER = 'idempotency-key';

/**
 * Money-moving POSTs must be safe to retry. A repeated `Idempotency-Key` replays the
 * stored response instead of creating a second payment, which is what protects users
 * from double-submits and flaky networks.
 */
@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<ContextualRequest>();
    const key = request.header(IDEMPOTENCY_HEADER);
    const workspace = request.context?.workspace;
    if (!key || !workspace) return next.handle();

    const scopedKey = `${request.method}:${request.path}:${key}`;
    if (workspace.idempotency.has(scopedKey)) {
      return of(workspace.idempotency.get(scopedKey));
    }
    return next.handle().pipe(tap((body) => workspace.idempotency.set(scopedKey, body)));
  }
}
