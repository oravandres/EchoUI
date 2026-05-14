import { z } from "zod";
import { fetchJson } from "@/api/client";

const API_PREFIX = "/api/v1/platforms/status";

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

export type PlatformStatus = z.infer<typeof platformStatusSchema>;
export type PlatformConnection = z.infer<typeof platformConnectionSchema>;
export type PlatformsResponse = z.infer<typeof platformsResponseSchema>;

export type ListPlatformsParams = {
  /** Pass from React Query `queryFn` context to cancel superseded requests. */
  signal?: AbortSignal;
};

export async function listPlatforms(
  params: ListPlatformsParams = {}
): Promise<PlatformsResponse> {
  const data = await fetchJson<unknown>(API_PREFIX, {
    signal: params.signal,
  });
  return platformsResponseSchema.parse(data);
}
