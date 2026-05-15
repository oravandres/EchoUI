import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Post, getPost } from "@/api/posts";
import { PostDetailPage } from "@/pages/PostDetailPage";

vi.mock("@/api/posts", async () => {
  const actual =
    await vi.importActual<typeof import("@/api/posts")>("@/api/posts");
  return {
    ...actual,
    getPost: vi.fn(),
  };
});

const getPostMock = vi.mocked(getPost);

describe("PostDetailPage", () => {
  beforeEach(() => {
    getPostMock.mockResolvedValue(publishedPost);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders an accessible loading state", () => {
    getPostMock.mockReturnValue(new Promise(() => {}));

    renderPostDetail("/posts/post-1");

    expect(
      screen.getByRole("status", { name: "Loading post detail" })
    ).toBeInTheDocument();
  });

  it("renders post detail from the public post endpoint", async () => {
    renderPostDetail("/posts/post-1");

    expect(await screen.findByText("hello from Echo")).toBeInTheDocument();
    expect(screen.getByText("tweet-1")).toBeInTheDocument();
    expect(screen.getByText("600")).toBeInTheDocument();
    expect(getPostMock).toHaveBeenCalledWith("post-1", {
      signal: expect.any(AbortSignal),
    });
  });

  it("renders stable unavailable copy for an initial load error", async () => {
    getPostMock.mockRejectedValue(new Error("admin token leaked"));

    renderPostDetail("/posts/post-1");

    expect(
      await screen.findByRole("heading", { name: "Post is unavailable" })
    ).toBeInTheDocument();
    expect(screen.queryByText("admin token leaked")).not.toBeInTheDocument();
  });

  it("keeps cached post detail visible when a refresh fails", async () => {
    const client = createTestQueryClient();
    client.setQueryData(["posts", "detail", "post-1"], publishedPost);
    getPostMock.mockRejectedValue(new Error("temporary outage"));

    renderPostDetail("/posts/post-1", client);

    expect(screen.getByText("hello from Echo")).toBeInTheDocument();
    expect(
      await screen.findByRole("status", {
        name: "Could not refresh post detail. Showing last known data.",
      })
    ).toBeInTheDocument();
  });
});

const publishedPost: Post = {
  id: "post-1",
  platformConnectionId: "conn-1",
  platform: "x",
  externalPostId: "tweet-1",
  text: "hello from Echo",
  status: "published",
  errorMessage: "",
  engagement: {
    likeCount: 10,
    replyCount: 2,
    repostCount: 3,
    quoteCount: 4,
    bookmarkCount: 5,
    impressionCount: 600,
    fetchedAt: "2026-05-15T09:05:00Z",
  },
  publishedAt: "2026-05-14T12:00:00Z",
  createdAt: "2026-05-14T12:00:00Z",
  updatedAt: "2026-05-14T12:00:00Z",
};

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
}

function renderPostDetail(path: string, client = createTestQueryClient()) {
  return renderWithQueryClient(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/posts/:postId" element={<PostDetailPage />} />
      </Routes>
    </MemoryRouter>,
    client
  );
}

function renderWithQueryClient(
  ui: ReactNode,
  client = createTestQueryClient()
) {
  return render(
    <QueryClientProvider client={client}>{ui}</QueryClientProvider>
  );
}
