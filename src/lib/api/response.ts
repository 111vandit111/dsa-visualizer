import { logger } from "@/lib/logger";
import type { ApiErrorBody, ApiErrorCode, ApiFieldIssue } from "@/lib/types/question";

export class ApiHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
    readonly details?: ApiFieldIssue[],
  ) {
    super(message);
    this.name = "ApiHttpError";
  }
}

export function ok<T>(data: T, status = 200): Response {
  return Response.json({ data }, { status });
}

export function fail(code: ApiErrorCode, message: string, status: number, details?: ApiFieldIssue[]): Response {
  const error: ApiErrorBody = details ? { code, message, details } : { code, message };
  return Response.json({ error }, { status });
}

export function handleError(error: unknown, context: string): Response {
  if (error instanceof ApiHttpError) return fail(error.code, error.message, error.status, error.details);
  logger.error(`Unhandled error in ${context}`, { error });
  return fail("internal_error", "Something went wrong on the server", 500);
}
