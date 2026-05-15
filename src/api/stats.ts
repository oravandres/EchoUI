import { z } from "zod";
import { fetchJson } from "@/api/client";

const API_PREFIX = "/api/v1/stats";

const postStatsSchema = z.object({
  total: z.number(),
  pending: z.number(),
  published: z.number(),
  failed: z.number(),
  deleted: z.number(),
});

const platformStatsSchema = z.object({
  total: z.number(),
  enabled: z.number(),
  disabled: z.number(),
  healthy: z.number(),
  unhealthy: z.number(),
  unknown: z.number(),
});

const platformBreakdownSchema = z.object({
  platform: z.string(),
  posts: postStatsSchema,
  connections: platformStatsSchema,
});

const statsSummarySchema = z.object({
  posts: postStatsSchema,
  platforms: platformStatsSchema,
  byPlatform: z.array(platformBreakdownSchema),
  generatedAt: z.string(),
});

const statsResponseSchema = z.object({
  data: statsSummarySchema,
});

export type PostStats = z.infer<typeof postStatsSchema>;
export type PlatformStats = z.infer<typeof platformStatsSchema>;
export type PlatformStatsBreakdown = z.infer<typeof platformBreakdownSchema>;
export type StatsSummary = z.infer<typeof statsSummarySchema>;
export type StatsResponse = z.infer<typeof statsResponseSchema>;

export type FetchStatsParams = {
  /** Pass from React Query `queryFn` context to cancel superseded requests. */
  signal?: AbortSignal;
};

export async function fetchStats(
  params: FetchStatsParams = {}
): Promise<StatsResponse> {
  const data = await fetchJson<unknown>(API_PREFIX, {
    signal: params.signal,
  });
  return statsResponseSchema.parse(data);
}
