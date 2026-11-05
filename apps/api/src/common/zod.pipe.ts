import type { PipeTransform } from '@nestjs/common';
import type { z } from 'zod';
import { DomainError } from './domain-error.js';

/** Validates a body or query against a shared contract schema. */
export class ZodPipe<T extends z.ZodType> implements PipeTransform<unknown, z.output<T>> {
  constructor(private readonly schema: T) {}

  transform(value: unknown): z.output<T> {
    const result = this.schema.safeParse(value);
    if (result.success) return result.data;

    const fields: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.') || 'body';
      fields[path] ??= issue.message;
    }
    const first = result.error.issues[0]?.message ?? 'The request is invalid.';
    throw new DomainError(400, 'validation_failed', first, fields);
  }
}
