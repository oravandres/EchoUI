import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getAdminSession } from "@/api/adminSession";
import {
  fetchStats,
  refreshStats,
  type StatsResponse,
} from "@/api/stats";
import { StatsPage } from "@/pages/StatsPage";

vi.mock("@/api/stats", () => ({
  fetchStats: vi.fn(),
  refreshStats: vi.fn(),
}));

vi.mock("@/api/adminSession", () => ({
  getAdminSession: vi.fn(),
}));

const fetchStatsMock = vi.mocked(fetchStats);
const refreshStatsMock = vi.mocked(refreshStats);
const getAdminSessionMock = vi.mocked(getAdminSession);

describe("StatsPage", () => {
  beforeEach(() => {
    fetchStatsMock.mockResolvedValue(statsResponse);
    refreshStatsMock.mockResolvedValue({
      data: {
        attempted: 1,
        refreshed: 1,
        failed: 0,
        skipped: 0,
        startedAt: "2026-05-15T09:00:00Z",
        finishedAt: "2026-05-15T09:00:01Z",
      },
    });
    getAdminSessionMock.mockResolvedValue({ authenticated: false, csrfToken: "", expiresAt: "" });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders an accessible loading state", () => {
    fetchStatsMock.mockReturnValue(new Promise(() => {}));

    renderWithQueryClient(<StatsPage />);

    expect(
      screen.getByRole("status", { name: "Loading statistics" })
    ).toBeInTheDocument();
  });

  it("renders aggregate statistics", async () => {
    renderWithQueryClient(<StatsPage />);

    expect(await screen.findByText("3 total")).toBeInTheDocument();
    expect(screen.getByText("1 measured")).toBeInTheDocument();
    expect(screen.getByText("600")).toBeInTheDocument();
    expect(screen.getAllByText("1 enabled").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByRole("heading", { name: "x" })).toBeInTheDocument();
    expect(fetchStatsMock).toHaveBeenCalledWith({
      signal: expect.any(AbortSignal),
    });
  });

  it("refreshes metrics when an admin session is available", async () => {
    const user = userEvent.setup();
    getAdminSessionMock.mockResolvedValue({
      authenticated: true,
      csrfToken: "csrf-1",
      expiresAt: "2026-05-15T21:00:00Z",
    });

    renderWithQueryClient(<StatsPage />);

    await user.click(await screen.findByRole("button", { name: "Refresh metrics" }));

    expect(refreshStatsMock).toHaveBeenCalledWith({ csrfToken: "csrf-1" });
    expect(
      await screen.findByText("Metric refresh completed:", { exact: false })
    ).toBeInTheDocument();
  });

  it("renders stable unavailable copy for an initial load error", async () => {
    fetchStatsMock.mockRejectedValue(new Error("database password leaked"));

    renderWithQueryClient(<StatsPage />);

    expect(
      await screen.findByRole("heading", { name: "Statistics are unavailable" })
    ).toBeInTheDocument();
    expect(screen.queryByText("database password leaked")).not.toBeInTheDocument();
  });

  it("keeps cached statistics visible when a refresh fails", async () => {
    const client = createTestQueryClient();
    client.setQueryData(["stats", "summary"], statsResponse);
    fetchStatsMock.mockRejectedValue(new Error("temporary outage"));

    renderWithQueryClient(<StatsPage />, client);

    expect(screen.getByText("3 total")).toBeInTheDocument();
    expect(
      await screen.findByRole("status", {
        name: "Could not refresh statistics. Showing last known data.",
      })
    ).toBeInTheDocument();
  });
});

const statsResponse: StatsResponse = {
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
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderWithQueryClient(ui: ReactNode, client = createTestQueryClient()) {
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}
