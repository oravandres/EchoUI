import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AdminSession,
  getAdminSession,
  loginAdminSession,
  logoutAdminSession,
} from "@/api/adminSession";
import {
  createPlatform,
  type PlatformConnection,
  listPlatforms,
} from "@/api/platforms";
import { PlatformsPage } from "@/pages/PlatformsPage";

vi.mock("@/api/adminSession", async () => {
  const actual =
    await vi.importActual<typeof import("@/api/adminSession")>(
      "@/api/adminSession"
    );
  return {
    ...actual,
    getAdminSession: vi.fn(),
    loginAdminSession: vi.fn(),
    logoutAdminSession: vi.fn(),
  };
});

vi.mock("@/api/platforms", async () => {
  const actual =
    await vi.importActual<typeof import("@/api/platforms")>(
      "@/api/platforms"
    );
  return {
    ...actual,
    listPlatforms: vi.fn(),
    createPlatform: vi.fn(),
  };
});

const getAdminSessionMock = vi.mocked(getAdminSession);
const loginAdminSessionMock = vi.mocked(loginAdminSession);
const logoutAdminSessionMock = vi.mocked(logoutAdminSession);
const listPlatformsMock = vi.mocked(listPlatforms);
const createPlatformMock = vi.mocked(createPlatform);

describe("PlatformsPage", () => {
  beforeEach(() => {
    getAdminSessionMock.mockResolvedValue(unauthenticatedSession);
    loginAdminSessionMock.mockResolvedValue(authenticatedSession);
    logoutAdminSessionMock.mockResolvedValue(undefined);
    listPlatformsMock.mockResolvedValue(platformsResponse([]));
    createPlatformMock.mockResolvedValue(xPlatform);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders an accessible loading state", () => {
    listPlatformsMock.mockReturnValue(new Promise(() => {}));

    renderWithQueryClient(<PlatformsPage />);

    expect(
      screen.getByRole("status", { name: "Loading platforms" })
    ).toBeInTheDocument();
    expect(screen.getByLabelText("Admin token")).toHaveAttribute(
      "type",
      "password"
    );
  });

  it("renders connected platform health", async () => {
    listPlatformsMock.mockResolvedValue(platformsResponse([xPlatform]));

    renderWithQueryClient(<PlatformsPage />);

    expect(
      await screen.findByRole("heading", { name: "Main X" })
    ).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.getByText("x - @echo.test")).toBeInTheDocument();
  });

  it("maps disabled platform connections to a stable disabled label", async () => {
    listPlatformsMock.mockResolvedValue(
      platformsResponse([{ ...xPlatform, enabled: false }])
    );

    renderWithQueryClient(<PlatformsPage />);

    expect(await screen.findByText("Disabled")).toBeInTheDocument();
  });

  it("renders an empty state when Echo reports no platform connections", async () => {
    listPlatformsMock.mockResolvedValue(platformsResponse([]));

    renderWithQueryClient(<PlatformsPage />);

    expect(
      await screen.findByRole("heading", { name: "No platforms connected" })
    ).toBeInTheDocument();
  });

  it("renders stable unavailable copy for an initial load error", async () => {
    listPlatformsMock.mockRejectedValue(new Error("internal token value"));

    renderWithQueryClient(<PlatformsPage />);

    expect(
      await screen.findByRole("heading", {
        name: "Platform status is unavailable",
      })
    ).toBeInTheDocument();
    expect(screen.queryByText(/internal token/i)).not.toBeInTheDocument();
  });

  it("keeps cached platform data visible when a refresh fails", async () => {
    const client = createTestQueryClient();
    client.setQueryData(
      ["platforms", "list"],
      platformsResponse([xPlatform])
    );
    listPlatformsMock.mockRejectedValue(new Error("temporary outage"));

    renderWithQueryClient(<PlatformsPage />, client);

    expect(screen.getByRole("heading", { name: "Main X" })).toBeInTheDocument();
    expect(
      await screen.findByRole("status", {
        name: "Could not refresh platform status. Showing last known data.",
      })
    ).toBeInTheDocument();
  });

  it("unlocks the add form and creates an X platform connection", async () => {
    const user = userEvent.setup();
    listPlatformsMock.mockResolvedValue(platformsResponse([]));

    renderWithQueryClient(<PlatformsPage />);

    await user.type(screen.getByLabelText("Admin token"), "secret");
    await user.click(screen.getByRole("button", { name: "Unlock" }));

    await waitFor(() => {
      expect(loginAdminSessionMock).toHaveBeenCalledWith("secret");
    });

    await user.clear(await screen.findByLabelText("Display name"));
    await user.type(screen.getByLabelText("Display name"), "Echo X");
    await user.type(screen.getByLabelText("X access token"), "x-token");
    await user.click(screen.getByRole("button", { name: "Add platform" }));

    await waitFor(() => {
      expect(createPlatformMock).toHaveBeenCalledWith(
        {
          platform: "x",
          displayName: "Echo X",
          credentials: { accessToken: "x-token" },
          enabled: true,
        },
        { csrfToken: "csrf-1" }
      );
    });
  });

  it("does not leak platform credential validation errors", async () => {
    getAdminSessionMock.mockResolvedValue(authenticatedSession);
    createPlatformMock.mockRejectedValue(new Error("raw access token invalid"));
    const user = userEvent.setup();

    renderWithQueryClient(<PlatformsPage />);

    await user.type(await screen.findByLabelText("X access token"), "bad-token");
    await user.click(screen.getByRole("button", { name: "Add platform" }));

    expect(
      await screen.findByText("Echo could not add the platform.")
    ).toBeInTheDocument();
    expect(screen.queryByText(/raw access token/i)).not.toBeInTheDocument();
  });
});

const unauthenticatedSession: AdminSession = {
  authenticated: false,
  csrfToken: "",
  expiresAt: "",
};

const authenticatedSession: AdminSession = {
  authenticated: true,
  csrfToken: "csrf-1",
  expiresAt: "2026-05-15T00:00:00Z",
};

const xPlatform: PlatformConnection = {
  id: "platform-1",
  platform: "x",
  displayName: "Main X",
  accountHandle: "@echo.test",
  enabled: true,
  lastCheckedAt: "2026-05-12T17:00:00Z",
  lastHealthStatus: "healthy",
};

function platformsResponse(items: PlatformConnection[]) {
  return {
    data: items,
  };
}

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderWithQueryClient(
  ui: ReactNode,
  client = createTestQueryClient()
) {
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}
