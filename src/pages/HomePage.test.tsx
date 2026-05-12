import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { fetchHealth } from "@/api/health";
import { listPlatforms } from "@/api/platforms";
import { HomePage } from "@/pages/HomePage";

vi.mock("@/api/health", () => ({
  fetchHealth: vi.fn(),
}));

vi.mock("@/api/platforms", () => ({
  listPlatforms: vi.fn(),
}));

const fetchHealthMock = vi.mocked(fetchHealth);
const listPlatformsMock = vi.mocked(listPlatforms);

describe("HomePage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("shows the platform count when the platforms endpoint responds", async () => {
    fetchHealthMock.mockResolvedValue({ status: "healthy" });
    listPlatformsMock.mockResolvedValue({
      items: [],
      total: 2,
      limit: 1,
      offset: 0,
    });

    renderWithQueryClient(<HomePage />);

    expect(await screen.findByText("2 connected")).toBeInTheDocument();
  });

  it("shows a stable unavailable state when the platforms endpoint fails", async () => {
    fetchHealthMock.mockResolvedValue({ status: "healthy" });
    listPlatformsMock.mockRejectedValue(new Error("database password leaked"));

    renderWithQueryClient(<HomePage />);

    expect(await screen.findByText("Unavailable")).toBeInTheDocument();
    expect(screen.queryByText(/database password/i)).not.toBeInTheDocument();
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
