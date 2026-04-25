const DEV_DEFAULT_BASE = "http://localhost:8001";

/**
 * Base URL for the Echo HTTP API (no trailing slash).
 * In development, defaults to Echo's default bind (`API_PORT=8001`) if unset.
 * In production builds, `VITE_ECHO_API_BASE_URL` is required (also enforced in `vite.config.ts` at build time).
 */
export function getApiBaseUrl(): string {
  const raw = import.meta.env.VITE_ECHO_API_BASE_URL;
  if (typeof raw === "string" && raw.trim() !== "") {
    return raw.replace(/\/$/, "");
  }
  if (import.meta.env.DEV) {
    return DEV_DEFAULT_BASE;
  }
  throw new Error(
    "Missing VITE_ECHO_API_BASE_URL. Set it when building for production."
  );
}

/**
 * Optional metadata attached to an `ApiError` for observability.
 */
export interface ApiErrorMeta {
  path?: string;
  method?: string;
  requestId?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;
  readonly path?: string;
  readonly method?: string;
  readonly requestId?: string;

  constructor(
    message: string,
    status: number,
    body: unknown,
    meta: ApiErrorMeta = {}
  ) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
    this.path = meta.path;
    this.method = meta.method;
    this.requestId = meta.requestId;
  }
}

/**
 * Transport-level failure: the `fetch` promise rejected before any HTTP
 * response was produced (offline, DNS failure, TLS error, CORS rejection, etc.).
 */
export class NetworkError extends Error {
  readonly path?: string;
  readonly method?: string;

  constructor(
    message: string,
    meta: { path?: string; method?: string } = {},
    options?: { cause?: unknown }
  ) {
    super(message, options);
    this.name = "NetworkError";
    this.path = meta.path;
    this.method = meta.method;
  }
}

function isAbortError(err: unknown): boolean {
  return (
    (err instanceof DOMException && err.name === "AbortError") ||
    (err instanceof Error && err.name === "AbortError")
  );
}

function buildUrl(path: string): string {
  const base = getApiBaseUrl();
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${base}${p}`;
}

/** Parses Echo JSON error bodies: `{ "error": string, "details"?: string }`. */
function errorMessageFromBody(data: unknown, fallback: string): string {
  if (
    data &&
    typeof data === "object" &&
    "error" in data &&
    typeof (data as { error: unknown }).error === "string"
  ) {
    return (data as { error: string }).error;
  }
  return fallback;
}

function readRequestId(headers: Headers): string | undefined {
  const raw = headers.get("x-request-id");
  if (raw === null) return undefined;
  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

export async function fetchJson<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const headers = new Headers(init?.headers);
  const method = (init?.method ?? "GET").toUpperCase();

  let res: Response;
  try {
    res = await fetch(buildUrl(path), { ...init, headers });
  } catch (err) {
    if (isAbortError(err)) throw err;
    throw new NetworkError(
      err instanceof Error ? err.message : String(err),
      { path, method },
      { cause: err }
    );
  }
  const requestId = readRequestId(res.headers);
  const text = await res.text();
  let data: unknown;
  if (text.length > 0) {
    try {
      data = JSON.parse(text) as unknown;
    } catch {
      throw new ApiError("Response is not valid JSON", res.status, text, {
        path,
        method,
        requestId,
      });
    }
  } else {
    data = undefined;
  }

  if (!res.ok) {
    throw new ApiError(
      errorMessageFromBody(data, res.statusText),
      res.status,
      data,
      { path, method, requestId }
    );
  }

  return data as T;
}

/** POST with a JSON-serialized body and `Content-Type: application/json`. */
export async function postJson<TResponse>(
  path: string,
  body: unknown,
  init?: Omit<RequestInit, "body" | "method">
): Promise<TResponse> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  return fetchJson<TResponse>(path, {
    ...init,
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

/** PUT with a JSON-serialized body and `Content-Type: application/json`. */
export async function putJson<TResponse>(
  path: string,
  body: unknown,
  init?: Omit<RequestInit, "body" | "method">
): Promise<TResponse> {
  const headers = new Headers(init?.headers);
  headers.set("Content-Type", "application/json");
  return fetchJson<TResponse>(path, {
    ...init,
    method: "PUT",
    headers,
    body: JSON.stringify(body),
  });
}
