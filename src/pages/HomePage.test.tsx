import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHealth } from "@/api/health";
import { fetchStats } from "@/api/stats";
import { HomePage } from "@/pages/HomePage";

vi.mock("@/api/health", () => ({
  fetchHealth: vi.fn(),
}));

vi.mock("@/api/stats", () => ({
  fetchStats: vi.fn(),
}));

const fetchHealthMock = vi.mocked(fetchHealth);
const fetchStatsMock = vi.mocked(fetchStats);

describe("HomePage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows dashboard counts when the stats endpoint responds", async () => {
    fetchHealthMock.mockResolvedValue({ status: "healthy" });
    fetchStatsMock.mockResolvedValue(statsResponse(2, 1));

    renderWithQueryClient(<HomePage />);

    expect(await screen.findByText("2 connected")).toBeInTheDocument();
    expect(fetchHealthMock).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(fetchStatsMock).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(await screen.findByText("1 tracked")).toBeInTheDocument();
  });

  it("shows a stable unavailable state when the stats endpoint fails", async () => {
    fetchHealthMock.mockResolvedValue({ status: "healthy" });
    fetchStatsMock.mockRejectedValue(new Error("database password leaked"));

    renderWithQueryClient(<HomePage />);

    expect(await screen.findAllByText("Unavailable")).toHaveLength(2);
    expect(screen.queryByText(/database password/i)).not.toBeInTheDocument();
  });
});

function statsResponse(platforms: number, posts: number) {
  return {
    data: {
      posts: {
        total: posts,
        pending: 0,
        published: posts,
        failed: 0,
        deleted: 0,
      },
      platforms: {
        total: platforms,
        enabled: platforms,
        disabled: 0,
        healthy: platforms,
        unhealthy: 0,
        unknown: 0,
      },
      byPlatform: [],
      generatedAt: "2026-05-15T09:00:00Z",
    },
  };
}

function renderWithQueryClient(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}
