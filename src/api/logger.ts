import { ApiError, NetworkError } from "@/api/client";

interface LogContext {
  source?: string;
  key?: unknown;
}

/**
 * Structured error logger for API and network failures. Called by the global
 * QueryCache / MutationCache error hooks so every failed request emits a
 * machine-readable log event without per-call boilerplate.
 */
export function logApiError(error: unknown, ctx: LogContext = {}): void {
  if (error instanceof ApiError) {
    console.error("[echo:api-error]", {
      source: ctx.source,
      key: ctx.key,
      status: error.status,
      path: error.path,
      method: error.method,
      requestId: error.requestId,
      message: error.message,
    });
    return;
  }

  if (error instanceof NetworkError) {
    console.error("[echo:network-error]", {
      source: ctx.source,
      key: ctx.key,
      path: error.path,
      method: error.method,
      message: error.message,
    });
    return;
  }

  console.error("[echo:unknown-error]", {
    source: ctx.source,
    key: ctx.key,
    message: error instanceof Error ? error.message : String(error),
  });
}
