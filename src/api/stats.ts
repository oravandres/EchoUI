import { z } from "zod";
import { fetchJson } from "@/api/client";

const API_PREFIX = "/api/v1/stats";
const ADMIN_CSRF_HEADER = "X-Echo-CSRF-Token";

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

const engagementStatsSchema = z.object({
  postsMeasured: z.number(),
  likeCount: z.number(),
  replyCount: z.number(),
  repostCount: z.number(),
  quoteCount: z.number(),
  bookmarkCount: z.number(),
  impressionCount: z.number(),
  lastFetchedAt: z.string().optional(),
});

const platformBreakdownSchema = z.object({
  platform: z.string(),
  posts: postStatsSchema,
  connections: platformStatsSchema,
  engagement: engagementStatsSchema,
});

const statsSummarySchema = z.object({
  posts: postStatsSchema,
  platforms: platformStatsSchema,
  engagement: engagementStatsSchema,
  byPlatform: z.array(platformBreakdownSchema),
  generatedAt: z.string(),
});

const statsResponseSchema = z.object({
  data: statsSummarySchema,
});

const refreshSummarySchema = z.object({
  attempted: z.number(),
  refreshed: z.number(),
  failed: z.number(),
  skipped: z.number(),
  startedAt: z.string(),
  finishedAt: z.string(),
});

const refreshStatsResponseSchema = z.object({
  data: refreshSummarySchema,
});

export type PostStats = z.infer<typeof postStatsSchema>;
export type PlatformStats = z.infer<typeof platformStatsSchema>;
export type EngagementStats = z.infer<typeof engagementStatsSchema>;
export type PlatformStatsBreakdown = z.infer<typeof platformBreakdownSchema>;
export type StatsSummary = z.infer<typeof statsSummarySchema>;
export type StatsResponse = z.infer<typeof statsResponseSchema>;
export type RefreshStatsSummary = z.infer<typeof refreshSummarySchema>;
export type RefreshStatsResponse = z.infer<typeof refreshStatsResponseSchema>;

export type FetchStatsParams = {
  /** Pass from React Query `queryFn` context to cancel superseded requests. */
  signal?: AbortSignal;
};

export type RefreshStatsParams = {
  csrfToken: string;
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

export async function refreshStats(
  params: RefreshStatsParams
): Promise<RefreshStatsResponse> {
  const headers = new Headers();
  headers.set(ADMIN_CSRF_HEADER, params.csrfToken);

  const data = await fetchJson<unknown>(`${API_PREFIX}/refresh`, {
    credentials: "include",
    headers,
    method: "POST",
    signal: params.signal,
  });
  return refreshStatsResponseSchema.parse(data);
}
