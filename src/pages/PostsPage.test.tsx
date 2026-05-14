import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { type Post, listPosts } from "@/api/posts";
import { PostsPage } from "@/pages/PostsPage";

vi.mock("@/api/posts", async () => {
  const actual =
    await vi.importActual<typeof import("@/api/posts")>("@/api/posts");
  return {
    ...actual,
    listPosts: vi.fn(),
  };
});

const listPostsMock = vi.mocked(listPosts);

describe("PostsPage", () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders an accessible loading state and disabled composer", () => {
    listPostsMock.mockReturnValue(new Promise(() => {}));

    renderWithQueryClient(<PostsPage />);

    expect(
      screen.getByRole("status", { name: "Loading posts" })
    ).toBeInTheDocument();
    const composer = screen.getByRole("region", { name: "Compose" });
    expect(
      within(composer).getByRole("textbox", { name: "Post text" })
    ).toBeDisabled();
    expect(
      within(composer).getByText("Publishing requires admin session support.")
    ).toBeInTheDocument();
  });

  it("renders persisted posts", async () => {
    listPostsMock.mockResolvedValue(postsResponse([publishedPost]));

    renderWithQueryClient(<PostsPage />);

    expect(await screen.findByText("hello from Echo")).toBeInTheDocument();
    expect(screen.getAllByText("Published")).toHaveLength(2);
    expect(screen.getByText("x")).toBeInTheDocument();
  });

  it("renders failed post status with stable error text", async () => {
    listPostsMock.mockResolvedValue(
      postsResponse([
        {
          ...publishedPost,
          id: "post-2",
          status: "failed",
          errorMessage: "platform provider unavailable",
          publishedAt: null,
        },
      ])
    );

    renderWithQueryClient(<PostsPage />);

    expect(await screen.findByText("Failed")).toBeInTheDocument();
    expect(screen.getByText("platform provider unavailable")).toBeInTheDocument();
  });

  it("renders an empty state when Echo reports no posts", async () => {
    listPostsMock.mockResolvedValue(postsResponse([]));

    renderWithQueryClient(<PostsPage />);

    expect(
      await screen.findByRole("heading", { name: "No posts yet" })
    ).toBeInTheDocument();
  });

  it("renders stable unavailable copy for an initial load error", async () => {
    listPostsMock.mockRejectedValue(new Error("admin token leaked"));

    renderWithQueryClient(<PostsPage />);

    expect(
      await screen.findByRole("heading", { name: "Posts are unavailable" })
    ).toBeInTheDocument();
    expect(screen.queryByText(/admin token/i)).not.toBeInTheDocument();
  });

  it("keeps cached posts visible when a refresh fails", async () => {
    const client = createTestQueryClient();
    client.setQueryData(["posts", "list"], postsResponse([publishedPost]));
    listPostsMock.mockRejectedValue(new Error("temporary outage"));

    renderWithQueryClient(<PostsPage />, client);

    expect(screen.getByText("hello from Echo")).toBeInTheDocument();
    expect(
      await screen.findByRole("status", {
        name: "Could not refresh posts. Showing last known data.",
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
  publishedAt: "2026-05-14T12:00:00Z",
  createdAt: "2026-05-14T12:00:00Z",
  updatedAt: "2026-05-14T12:00:00Z",
};

function postsResponse(items: Post[]) {
  return {
    data: items,
  };
}

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
