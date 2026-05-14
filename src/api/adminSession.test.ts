import { readFile } from "node:fs/promises";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  getAdminSession,
  loginAdminSession,
  logoutAdminSession,
} from "@/api/adminSession";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("admin session API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("reads the browser admin session with cookies included", async () => {
    const signal = new AbortController().signal;
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse(200, {
          authenticated: true,
          expiresAt: "2026-05-15T00:00:00Z",
          csrfToken: "csrf-1",
        })
      );

    const session = await getAdminSession({ signal });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8001/api/v1/admin/session",
      expect.objectContaining({ credentials: "include", signal })
    );
    expect(session.authenticated).toBe(true);
    expect(session.csrfToken).toBe("csrf-1");
  });

  it("logs in without sending an Authorization header", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse(200, {
          authenticated: true,
          expiresAt: "2026-05-15T00:00:00Z",
          csrfToken: "csrf-1",
        })
      );

    await loginAdminSession("operator-token");

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8001/api/v1/admin/session",
      expect.objectContaining({
        body: JSON.stringify({ token: "operator-token" }),
        credentials: "include",
        method: "POST",
      })
    );
    const init = fetchMock.mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.has("Authorization")).toBe(false);
  });

  it("logs out by clearing the cookie-backed session", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));

    await logoutAdminSession();

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8001/api/v1/admin/session",
      expect.objectContaining({
        credentials: "include",
        method: "DELETE",
      })
    );
  });

  it("rejects authenticated responses missing session metadata", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(200, { authenticated: true })
    );

    await expect(getAdminSession()).rejects.toThrow();
  });

  it("does not expose an admin token Vite environment contract", async () => {
    const viteEnvPath = path.join(process.cwd(), "src", "vite-env.d.ts");
    const viteEnvTypes = await readFile(viteEnvPath, "utf8");

    expect(viteEnvTypes).not.toMatch(/ADMIN_API_TOKEN|ADMIN.*TOKEN/);
  });
});
