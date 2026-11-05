/**
 * Expected business failure. Services throw these with a stable `code`, and the
 * exception filter renders them as RFC 9457 problem documents.
 */
export class DomainError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fields?: Record<string, string>,
  ) {
    super(message);
    this.name = 'DomainError';
  }

  static notFound(resource: string): DomainError {
    return new DomainError(404, 'not_found', `${resource} was not found.`);
  }

  static forbidden(message: string): DomainError {
    return new DomainError(403, 'forbidden', message);
  }

  static conflict(code: string, message: string): DomainError {
    return new DomainError(409, code, message);
  }

  static unprocessable(code: string, message: string): DomainError {
    return new DomainError(422, code, message);
  }
}
