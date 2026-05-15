import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchStats } from "@/api/stats";

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

    const data = await fetchStats({ signal });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8001/api/v1/stats",
      expect.objectContaining({ signal })
    );
    const init = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
    expect(data.data.posts.total).toBe(3);
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
});
