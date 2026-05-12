import { z } from "zod";
import { fetchJson } from "@/api/client";

const API_PREFIX = "/api/v1/platforms";

export const PLATFORMS_PAGE_SIZE = 20;

const platformStatusSchema = z.enum([
  "healthy",
  "degraded",
  "disconnected",
  "unknown",
]);

const platformConnectionSchema = z.object({
  id: z.string(),
  platform: z.string(),
  display_name: z.string(),
  account_handle: z.string().nullable(),
  status: platformStatusSchema,
  last_checked_at: z.string().nullable(),
  message: z.string().nullable(),
});

const platformsResponseSchema = z.object({
  items: z.array(platformConnectionSchema),
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
});

export type PlatformStatus = z.infer<typeof platformStatusSchema>;
export type PlatformConnection = z.infer<typeof platformConnectionSchema>;
export type PlatformsResponse = z.infer<typeof platformsResponseSchema>;

export type ListPlatformsParams = {
  limit?: number;
  offset?: number;
  /** Pass from React Query `queryFn` context to cancel superseded requests. */
  signal?: AbortSignal;
};

export async function listPlatforms(
  params: ListPlatformsParams = {}
): Promise<PlatformsResponse> {
  const limit = params.limit ?? PLATFORMS_PAGE_SIZE;
  const offset = params.offset ?? 0;
  const search = new URLSearchParams();
  search.set("limit", String(limit));
  search.set("offset", String(offset));

  const data = await fetchJson<unknown>(`${API_PREFIX}?${search.toString()}`, {
    signal: params.signal,
  });
  return platformsResponseSchema.parse(data);
}
