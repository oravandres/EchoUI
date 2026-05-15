import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createPlatform,
  deletePlatform,
  listPlatforms,
  updatePlatform,
} from "@/api/platforms";

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

describe("admin platform API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a platform with cookie credentials and the CSRF header", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse(201, {
          id: "platform-1",
          platform: "x",
          displayName: "Main X",
          externalAccountId: "account-1",
          externalAccountHandle: "@echo.test",
          enabled: true,
          lastCheckedAt: "2026-05-12T17:00:00Z",
          lastHealthStatus: "healthy",
          lastHealthError: "",
          createdAt: "2026-05-12T17:00:00Z",
          updatedAt: "2026-05-12T17:00:00Z",
        })
      );

    const data = await createPlatform(
      {
        platform: "x",
        displayName: "Main X",
        credentials: { accessToken: "x-token" },
        enabled: true,
      },
      { csrfToken: "csrf-1" }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8001/api/v1/platforms",
      expect.objectContaining({
        body: JSON.stringify({
          platform: "x",
          displayName: "Main X",
          credentials: { accessToken: "x-token" },
          enabled: true,
        }),
        credentials: "include",
        method: "POST",
      })
    );
    const init = fetchMock.mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("X-Echo-CSRF-Token")).toBe("csrf-1");
    expect(headers.has("Authorization")).toBe(false);
    expect(data.accountHandle).toBe("@echo.test");
  });

  it("updates a platform with cookie credentials and the CSRF header", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse(200, {
          id: "platform/1",
          platform: "x",
          displayName: "Renamed X",
          externalAccountId: "account-1",
          externalAccountHandle: "@echo.test",
          enabled: false,
          lastCheckedAt: "2026-05-12T17:00:00Z",
          lastHealthStatus: "unknown",
          lastHealthError: "",
          createdAt: "2026-05-12T17:00:00Z",
          updatedAt: "2026-05-12T18:00:00Z",
        })
      );

    const data = await updatePlatform(
      "platform/1",
      {
        displayName: "Renamed X",
        enabled: false,
        credentials: { accessToken: "new-token" },
      },
      { csrfToken: "csrf-1" }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8001/api/v1/platforms/platform%2F1",
      expect.objectContaining({
        body: JSON.stringify({
          displayName: "Renamed X",
          enabled: false,
          credentials: { accessToken: "new-token" },
        }),
        credentials: "include",
        method: "PATCH",
      })
    );
    const init = fetchMock.mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("X-Echo-CSRF-Token")).toBe("csrf-1");
    expect(headers.has("Authorization")).toBe(false);
    expect(data.displayName).toBe("Renamed X");
    expect(data.enabled).toBe(false);
    expect(data.accountHandle).toBe("@echo.test");
  });

  it("deletes a platform with cookie credentials and the CSRF header", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));

    await deletePlatform("platform/1", { csrfToken: "csrf-1" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8001/api/v1/platforms/platform%2F1",
      expect.objectContaining({
        credentials: "include",
        method: "DELETE",
      })
    );
    const init = fetchMock.mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect(headers.get("X-Echo-CSRF-Token")).toBe("csrf-1");
    expect(headers.has("Authorization")).toBe(false);
  });
});
