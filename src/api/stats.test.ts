import { afterEach, describe, expect, it, vi } from "vitest";
import {
  fetchEngagementHistory,
  fetchStats,
  refreshStats,
} from "@/api/stats";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("fetchStats", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests the public stats endpoint and parses the response", async () => {
    const signal = new AbortController().signal;
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse(200, {
          data: {
            posts: {
              total: 3,
              pending: 0,
              published: 2,
              failed: 1,
              deleted: 0,
            },
            platforms: {
              total: 2,
              enabled: 1,
              disabled: 1,
              healthy: 1,
              unhealthy: 0,
              unknown: 1,
            },
            engagement: {
              postsMeasured: 1,
              likeCount: 10,
              replyCount: 2,
              repostCount: 3,
              quoteCount: 4,
              bookmarkCount: 5,
              impressionCount: 600,
              lastFetchedAt: "2026-05-15T09:05:00Z",
            },
            byPlatform: [
              {
                platform: "x",
                posts: {
                  total: 3,
                  pending: 0,
                  published: 2,
                  failed: 1,
                  deleted: 0,
                },
                connections: {
                  total: 2,
                  enabled: 1,
                  disabled: 1,
                  healthy: 1,
                  unhealthy: 0,
                  unknown: 1,
                },
                engagement: {
                  postsMeasured: 1,
                  likeCount: 10,
                  replyCount: 2,
                  repostCount: 3,
                  quoteCount: 4,
                  bookmarkCount: 5,
                  impressionCount: 600,
                  lastFetchedAt: "2026-05-15T09:05:00Z",
                },
              },
            ],
            generatedAt: "2026-05-15T09:00:00Z",
          },
        })
      );

    const data = await fetchStats({ signal });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8001/api/v1/stats",
      expect.objectContaining({ signal })
    );
    const init = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
    expect(data.data.posts.total).toBe(3);
    expect(data.data.engagement.likeCount).toBe(10);
    expect(data.data.byPlatform[0]?.platform).toBe("x");
  });

  it("rejects responses that do not match the stats contract", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(200, {
        data: { posts: { total: "3" } },
      })
    );

    await expect(fetchStats()).rejects.toThrow();
  });

  it("defaults missing engagement stats for rolling deploy compatibility", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(200, {
        data: {
          posts: {
            total: 3,
            pending: 0,
            published: 2,
            failed: 1,
            deleted: 0,
          },
          platforms: {
            total: 2,
            enabled: 1,
            disabled: 1,
            healthy: 1,
            unhealthy: 0,
            unknown: 1,
          },
          byPlatform: [
            {
              platform: "x",
              posts: {
                total: 3,
                pending: 0,
                published: 2,
                failed: 1,
                deleted: 0,
              },
              connections: {
                total: 2,
                enabled: 1,
                disabled: 1,
                healthy: 1,
                unhealthy: 0,
                unknown: 1,
              },
            },
          ],
          generatedAt: "2026-05-15T09:00:00Z",
        },
      })
    );

    const data = await fetchStats();

    expect(data.data.engagement.postsMeasured).toBe(0);
    expect(data.data.engagement.impressionCount).toBe(0);
    expect(data.data.byPlatform[0]?.engagement.likeCount).toBe(0);
  });
});

describe("fetchEngagementHistory", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests the public engagement history endpoint and parses the response", async () => {
    const signal = new AbortController().signal;
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse(200, {
          data: {
            items: [
              {
                fetchedAt: "2026-05-15T09:00:00Z",
                postsMeasured: 1,
                likeCount: 10,
                replyCount: 2,
                repostCount: 3,
                quoteCount: 4,
                bookmarkCount: 5,
                impressionCount: 600,
              },
            ],
            limit: 30,
            platform: "x",
            generatedAt: "2026-05-15T09:10:00Z",
          },
        })
      );

    const data = await fetchEngagementHistory({
      limit: 30,
      platform: "x",
      signal,
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8001/api/v1/stats/engagement/history?limit=30&platform=x",
      expect.objectContaining({ signal })
    );
    const init = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
    expect(data.data.items[0]?.impressionCount).toBe(600);
  });

  it("rejects responses that do not match the history contract", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(200, {
        data: { items: [{ fetchedAt: "not enough fields" }] },
      })
    );

    await expect(fetchEngagementHistory()).rejects.toThrow();
  });
});

describe("refreshStats", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refreshes metrics with cookie credentials and the CSRF header", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse(200, {
          data: {
            attempted: 2,
            refreshed: 1,
            failed: 1,
            skipped: 3,
            startedAt: "2026-05-15T09:00:00Z",
            finishedAt: "2026-05-15T09:00:02Z",
          },
        })
      );

    const data = await refreshStats({ csrfToken: "csrf-1" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8001/api/v1/stats/refresh",
      expect.objectContaining({
        credentials: "include",
        method: "POST",
      })
    );
    const init = fetchMock.mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect(headers.get("X-Echo-CSRF-Token")).toBe("csrf-1");
    expect(headers.has("Authorization")).toBe(false);
    expect(data.data.refreshed).toBe(1);
  });
});
