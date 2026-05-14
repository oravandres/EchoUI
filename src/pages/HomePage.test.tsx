import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHealth } from "@/api/health";
import { listPlatforms } from "@/api/platforms";
import { listPosts } from "@/api/posts";
import { HomePage } from "@/pages/HomePage";

vi.mock("@/api/health", () => ({
  fetchHealth: vi.fn(),
}));

vi.mock("@/api/platforms", () => ({
  listPlatforms: vi.fn(),
}));

vi.mock("@/api/posts", () => ({
  listPosts: vi.fn(),
}));

const fetchHealthMock = vi.mocked(fetchHealth);
const listPlatformsMock = vi.mocked(listPlatforms);
const listPostsMock = vi.mocked(listPosts);

describe("HomePage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the platform count when the platforms endpoint responds", async () => {
    fetchHealthMock.mockResolvedValue({ status: "healthy" });
    listPlatformsMock.mockResolvedValue({
      data: [
        {
          id: "platform-1",
          platform: "x",
          displayName: "Main X",
          accountHandle: "@echo.test",
          enabled: true,
          lastCheckedAt: null,
          lastHealthStatus: "healthy",
        },
        {
          id: "platform-2",
          platform: "x",
          displayName: "Backup X",
          accountHandle: "@echo.backup",
          enabled: true,
          lastCheckedAt: null,
          lastHealthStatus: "unknown",
        },
      ],
    });
    listPostsMock.mockResolvedValue({
      data: [
        {
          id: "post-1",
          platformConnectionId: "conn-1",
          platform: "x",
          externalPostId: "tweet-1",
          text: "hello from Echo",
          status: "published",
          errorMessage: "",
          publishedAt: "2026-05-14T12:00:00Z",
          createdAt: "2026-05-14T12:00:00Z",
          updatedAt: "2026-05-14T12:00:00Z",
        },
      ],
    });

    renderWithQueryClient(<HomePage />);

    expect(await screen.findByText("2 connected")).toBeInTheDocument();
    expect(fetchHealthMock).toHaveBeenCalledWith(expect.any(AbortSignal));
    expect(listPlatformsMock).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
    expect(await screen.findByText("1 tracked")).toBeInTheDocument();
    expect(listPostsMock).toHaveBeenCalledWith(
      expect.objectContaining({ signal: expect.any(AbortSignal) })
    );
  });

  it("shows a stable unavailable state when the platforms endpoint fails", async () => {
    fetchHealthMock.mockResolvedValue({ status: "healthy" });
    listPlatformsMock.mockRejectedValue(new Error("database password leaked"));
    listPostsMock.mockResolvedValue({ data: [] });

    renderWithQueryClient(<HomePage />);

    expect(await screen.findByText("Unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/database password/i)).not.toBeInTheDocument();
  });

  it("shows a stable unavailable state when the posts endpoint fails", async () => {
    fetchHealthMock.mockResolvedValue({ status: "healthy" });
    listPlatformsMock.mockResolvedValue({ data: [] });
    listPostsMock.mockRejectedValue(new Error("admin token leaked"));

    renderWithQueryClient(<HomePage />);

    expect(await screen.findByText("Unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/admin token/i)).not.toBeInTheDocument();
  });
});

function renderWithQueryClient(ui: ReactNode) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}
