import { afterEach, describe, expect, it, vi } from "vitest";
import { listPlatforms } from "@/api/platforms";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("listPlatforms", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests the public platform status endpoint and parses the response", async () => {
    const signal = new AbortController().signal;
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse(200, {
          data: [
            {
              id: "platform-1",
              platform: "x",
              displayName: "Main X",
              accountHandle: "@echo.test",
              enabled: true,
              lastCheckedAt: "2026-05-12T17:00:00Z",
              lastHealthStatus: "healthy",
            },
          ],
        })
      );

    const data = await listPlatforms({ signal });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8001/api/v1/platforms/status",
      expect.objectContaining({ signal })
    );
    const init = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
    expect(data.data[0]?.lastHealthStatus).toBe("healthy");
    expect(data.data[0]?.displayName).toBe("Main X");
  });

  it("rejects responses that do not match the public platform status contract", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(200, {
        data: [{ id: "platform-1", lastHealthStatus: "paused" }],
      })
    );

    await expect(listPlatforms()).rejects.toThrow();
  });
});
