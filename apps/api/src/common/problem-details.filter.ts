import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  Logger,
} from '@nestjs/common';
import type { ProblemDetails } from '@post-oak/contracts';
import type { Response } from 'express';
import { DomainError } from './domain-error.js';

const STATUS_TITLES: Record<number, string> = {
  400: 'Invalid request',
  401: 'Unauthorized',
  403: 'Not allowed',
  404: 'Not found',
  409: 'Conflict',
  422: 'Unprocessable request',
  429: 'Too many requests',
  500: 'Something went wrong',
};

/** Renders every failure as an RFC 9457 problem document, so clients handle one shape. */
@Catch()
export class ProblemDetailsFilter implements ExceptionFilter {
  private readonly logger = new Logger(ProblemDetailsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const problem = this.toProblem(exception);
    if (problem.status >= 500) this.logger.error(exception);
    if (response.headersSent) return;
    response.status(problem.status).type('application/problem+json').json(problem);
  }

  private toProblem(exception: unknown): ProblemDetails {
    if (exception instanceof DomainError) {
      return this.build(exception.status, exception.code, exception.message, exception.fields);
    }
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return this.build(status, 'http_error', exception.message);
    }
    return this.build(500, 'internal_error', 'An unexpected error occurred. Please try again.');
  }

  private build(
    status: number,
    code: string,
    detail: string,
    fields?: Record<string, string>,
  ): ProblemDetails {
    return {
      type: `https://docs.postoak.example/problems/${code}`,
      title: STATUS_TITLES[status] ?? 'Request failed',
      status,
      detail,
      code,
      ...(fields ? { fields } : {}),
    };
  }
}
