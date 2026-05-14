import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  type PlatformConnection,
  listPlatforms,
} from "@/api/platforms";
import { PlatformsPage } from "@/pages/PlatformsPage";

vi.mock("@/api/platforms", async () => {
  const actual =
    await vi.importActual<typeof import("@/api/platforms")>(
      "@/api/platforms"
    );
  return {
    ...actual,
    listPlatforms: vi.fn(),
  };
});

const listPlatformsMock = vi.mocked(listPlatforms);

describe("PlatformsPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders an accessible loading state", () => {
    listPlatformsMock.mockReturnValue(new Promise(() => {}));

    renderWithQueryClient(<PlatformsPage />);

    expect(
      screen.getByRole("status", { name: "Loading platforms" })
    ).toBeInTheDocument();
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
});

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
