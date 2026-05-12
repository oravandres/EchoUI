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

  it("requests the platforms endpoint with pagination and parses the response", async () => {
    const signal = new AbortController().signal;
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse(200, {
          items: [
            {
              id: "platform-1",
              platform: "bluesky",
              display_name: "Bluesky",
              account_handle: "@echo.test",
              status: "healthy",
              last_checked_at: "2026-05-12T17:00:00Z",
              message: null,
            },
          ],
          total: 1,
          limit: 5,
          offset: 10,
        })
      );

    const data = await listPlatforms({ limit: 5, offset: 10, signal });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8001/api/v1/platforms?limit=5&offset=10",
      expect.objectContaining({ signal })
    );
    expect(data.items[0]?.status).toBe("healthy");
    expect(data.total).toBe(1);
  });

  it("rejects responses that do not match the provisional platform contract", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(200, {
        items: [{ id: "platform-1", status: "paused" }],
        total: 1,
        limit: 20,
        offset: 0,
      })
    );

    await expect(listPlatforms()).rejects.toThrow();
  });
});
