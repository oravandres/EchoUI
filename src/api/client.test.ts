import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchJson } from "@/api/client";

function jsonResponse(
  status: number,
  body: unknown,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

describe("fetchJson", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests the Echo dev API base by default", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(200, { status: "healthy" })
    );

    await expect(fetchJson<{ status: string }>("/api/v1/health")).resolves.toEqual({
      status: "healthy",
    });

    expect(globalThis.fetch).toHaveBeenCalledWith(
      "http://localhost:8001/api/v1/health",
      expect.objectContaining({ headers: expect.any(Headers) })
    );
  });

  it("surfaces HTTP errors with status, body, path, method, and request id", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(
        503,
        { error: "service unavailable" },
        { "X-Request-Id": "req-1" }
      )
    );

    await expect(
      fetchJson("/api/v1/health", { method: "GET" })
    ).rejects.toMatchObject({
      name: "ApiError",
      message: "service unavailable",
      status: 503,
      body: { error: "service unavailable" },
      path: "/api/v1/health",
      method: "GET",
      requestId: "req-1",
    });
  });

  it("wraps transport failures without leaking them as HTTP responses", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new TypeError("offline"));

    await expect(fetchJson("/api/v1/health")).rejects.toMatchObject({
      name: "NetworkError",
      message: "offline",
      path: "/api/v1/health",
      method: "GET",
    });
  });
});
