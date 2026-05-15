import { z } from "zod";
import { fetchJson, postJson } from "@/api/client";

const STATUS_API_PREFIX = "/api/v1/platforms/status";
const ADMIN_API_PREFIX = "/api/v1/platforms";
const ADMIN_CSRF_HEADER = "X-Echo-CSRF-Token";

const platformStatusSchema = z.enum(["healthy", "unhealthy", "unknown"]);

const platformConnectionSchema = z.object({
  id: z.string(),
  platform: z.string(),
  displayName: z.string(),
  accountHandle: z
    .string()
    .nullable()
    .optional()
    .transform((value) => value ?? ""),
  enabled: z.boolean(),
  lastCheckedAt: z
    .string()
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  lastHealthStatus: platformStatusSchema,
});

const platformsResponseSchema = z.object({
  data: z.array(platformConnectionSchema),
});

const adminPlatformConnectionSchema = z
  .object({
    id: z.string(),
    platform: z.string(),
    displayName: z.string(),
    externalAccountHandle: z
      .string()
      .nullable()
      .optional()
      .transform((value) => value ?? ""),
    enabled: z.boolean(),
    lastCheckedAt: z
      .string()
      .nullable()
      .optional()
      .transform((value) => value ?? null),
    lastHealthStatus: platformStatusSchema,
  })
  .transform((value) => ({
    id: value.id,
    platform: value.platform,
    displayName: value.displayName,
    accountHandle: value.externalAccountHandle,
    enabled: value.enabled,
    lastCheckedAt: value.lastCheckedAt,
    lastHealthStatus: value.lastHealthStatus,
  }));

export type PlatformStatus = z.infer<typeof platformStatusSchema>;
export type PlatformConnection = z.infer<typeof platformConnectionSchema>;
export type PlatformsResponse = z.infer<typeof platformsResponseSchema>;

export type ListPlatformsParams = {
  /** Pass from React Query `queryFn` context to cancel superseded requests. */
  signal?: AbortSignal;
};

export type AdminPlatformParams = {
  csrfToken: string;
  signal?: AbortSignal;
};

export type PlatformKind = "x" | "facebook";

export type CreatePlatformInput = {
  platform: PlatformKind;
  displayName: string;
  credentials: {
    accessToken: string;
  };
  enabled: boolean;
};

export type UpdatePlatformInput = {
  displayName?: string;
  enabled?: boolean;
  credentials?: {
    accessToken: string;
  };
};

export type StartXOAuthInput = {
  displayName: string;
  enabled: boolean;
};

export type StartFacebookOAuthInput = {
  displayName: string;
  pageId?: string;
  enabled: boolean;
};

export type StartXOAuthResponse = {
  authorizationUrl: string;
};

const startXOAuthResponseSchema = z.object({
  authorizationUrl: z.string().url(),
});

export async function listPlatforms(
  params: ListPlatformsParams = {}
): Promise<PlatformsResponse> {
  const data = await fetchJson<unknown>(STATUS_API_PREFIX, {
    signal: params.signal,
  });
  return platformsResponseSchema.parse(data);
}

export async function createPlatform(
  input: CreatePlatformInput,
  params: AdminPlatformParams
): Promise<PlatformConnection> {
  const headers = new Headers();
  headers.set(ADMIN_CSRF_HEADER, params.csrfToken);

  const data = await postJson<unknown>(ADMIN_API_PREFIX, input, {
    credentials: "include",
    headers,
    signal: params.signal,
  });
  return adminPlatformConnectionSchema.parse(data);
}

export async function startXOAuthConnection(
  input: StartXOAuthInput,
  params: AdminPlatformParams
): Promise<StartXOAuthResponse> {
  const headers = new Headers();
  headers.set(ADMIN_CSRF_HEADER, params.csrfToken);

  const data = await postJson<unknown>(
    `${ADMIN_API_PREFIX}/x/oauth/start`,
    input,
    {
      credentials: "include",
      headers,
      signal: params.signal,
    }
  );
  return startXOAuthResponseSchema.parse(data);
}

export async function startFacebookOAuthConnection(
  input: StartFacebookOAuthInput,
  params: AdminPlatformParams
): Promise<StartXOAuthResponse> {
  const headers = new Headers();
  headers.set(ADMIN_CSRF_HEADER, params.csrfToken);

  const data = await postJson<unknown>(
    `${ADMIN_API_PREFIX}/facebook/oauth/start`,
    input,
    {
      credentials: "include",
      headers,
      signal: params.signal,
    }
  );
  return startXOAuthResponseSchema.parse(data);
}

export async function updatePlatform(
  id: string,
  input: UpdatePlatformInput,
  params: AdminPlatformParams
): Promise<PlatformConnection> {
  const headers = new Headers();
  headers.set(ADMIN_CSRF_HEADER, params.csrfToken);
  headers.set("Content-Type", "application/json");

  const data = await fetchJson<unknown>(
    `${ADMIN_API_PREFIX}/${encodeURIComponent(id)}`,
    {
      body: JSON.stringify(input),
      credentials: "include",
      headers,
      method: "PATCH",
      signal: params.signal,
    }
  );
  return adminPlatformConnectionSchema.parse(data);
}

export async function deletePlatform(
  id: string,
  params: AdminPlatformParams
): Promise<void> {
  const headers = new Headers();
  headers.set(ADMIN_CSRF_HEADER, params.csrfToken);

  await fetchJson<void>(`${ADMIN_API_PREFIX}/${encodeURIComponent(id)}`, {
    credentials: "include",
    headers,
    method: "DELETE",
    signal: params.signal,
  });
}
