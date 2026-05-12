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
    listPlatformsMock.mockResolvedValue(platformsResponse([blueskyPlatform]));

    renderWithQueryClient(<PlatformsPage />);

    expect(
      await screen.findByRole("heading", { name: "Bluesky" })
    ).toBeInTheDocument();
    expect(screen.getByText("Healthy")).toBeInTheDocument();
    expect(screen.getByText("API reachable")).toBeInTheDocument();
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
      platformsResponse([blueskyPlatform])
    );
    listPlatformsMock.mockRejectedValue(new Error("temporary outage"));

    renderWithQueryClient(<PlatformsPage />, client);

    expect(screen.getByRole("heading", { name: "Bluesky" })).toBeInTheDocument();
    expect(
      await screen.findByRole("status", {
        name: "Could not refresh platform status. Showing last known data.",
      })
    ).toBeInTheDocument();
  });
});

const blueskyPlatform: PlatformConnection = {
  id: "platform-1",
  platform: "bluesky",
  display_name: "Bluesky",
  account_handle: "@echo.test",
  status: "healthy",
  last_checked_at: "2026-05-12T17:00:00Z",
  message: "API reachable",
};

function platformsResponse(items: PlatformConnection[]) {
  return {
    items,
    total: items.length,
    limit: 20,
    offset: 0,
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
