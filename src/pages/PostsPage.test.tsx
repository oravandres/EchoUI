import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  type AdminSession,
  getAdminSession,
  loginAdminSession,
  logoutAdminSession,
} from "@/api/adminSession";
import { type PlatformConnection, listPlatforms } from "@/api/platforms";
import { type Post, createPosts, deletePost, listPosts } from "@/api/posts";
import { PostsPage } from "@/pages/PostsPage";

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
  };
});

vi.mock("@/api/posts", async () => {
  const actual =
    await vi.importActual<typeof import("@/api/posts")>("@/api/posts");
  return {
    ...actual,
    listPosts: vi.fn(),
    createPosts: vi.fn(),
    deletePost: vi.fn(),
  };
});

const getAdminSessionMock = vi.mocked(getAdminSession);
const loginAdminSessionMock = vi.mocked(loginAdminSession);
const logoutAdminSessionMock = vi.mocked(logoutAdminSession);
const listPlatformsMock = vi.mocked(listPlatforms);
const listPostsMock = vi.mocked(listPosts);
const createPostsMock = vi.mocked(createPosts);
const deletePostMock = vi.mocked(deletePost);

describe("PostsPage", () => {
  beforeEach(() => {
    getAdminSessionMock.mockResolvedValue(unauthenticatedSession);
    loginAdminSessionMock.mockResolvedValue(authenticatedSession);
    logoutAdminSessionMock.mockResolvedValue(undefined);
    listPlatformsMock.mockResolvedValue(platformsResponse([xPlatform]));
    listPostsMock.mockResolvedValue(postsResponse([]));
    createPostsMock.mockResolvedValue(postsResponse([publishedPost]));
    deletePostMock.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders an accessible loading state and locked composer", () => {
    listPostsMock.mockReturnValue(new Promise(() => {}));

    renderWithQueryClient(<PostsPage />);

    expect(
      screen.getByRole("status", { name: "Loading posts" })
    ).toBeInTheDocument();
    const composer = screen.getByRole("region", { name: "Compose" });
    expect(
      within(composer).getByLabelText("Admin token")
    ).toHaveAttribute("type", "password");
    expect(
      within(composer).getByRole("button", { name: "Unlock" })
    ).toBeDisabled();
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
    expect(screen.queryByText("admin token leaked")).not.toBeInTheDocument();
  });

  it("unlocks the composer and publishes through the admin session", async () => {
    const user = userEvent.setup();
    listPostsMock.mockResolvedValue(postsResponse([]));

    renderWithQueryClient(<PostsPage />);

    await user.type(screen.getByLabelText("Admin token"), "secret");
    await user.click(screen.getByRole("button", { name: "Unlock" }));

    await waitFor(() => {
      expect(loginAdminSessionMock).toHaveBeenCalledWith("secret");
    });
    const textarea = await screen.findByRole("textbox", { name: "Post text" });
    await user.type(textarea, "new post");
    await user.click(screen.getByRole("button", { name: "Publish" }));

    await waitFor(() => {
      expect(createPostsMock).toHaveBeenCalledWith(
        { platformConnectionIds: ["conn-1"], text: "new post" },
        { csrfToken: "csrf-1" }
      );
    });
  });

  it("keeps publishing disabled when no enabled platforms are available", async () => {
    getAdminSessionMock.mockResolvedValue(authenticatedSession);
    listPlatformsMock.mockResolvedValue(
      platformsResponse([{ ...xPlatform, enabled: false }])
    );
    const user = userEvent.setup();

    renderWithQueryClient(<PostsPage />);

    const textarea = await screen.findByRole("textbox", { name: "Post text" });
    await user.type(textarea, "new post");

    expect(
      screen.getByText("No enabled platforms available.")
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Publish" })).toBeDisabled();
  });

  it("deletes posts through the admin session", async () => {
    getAdminSessionMock.mockResolvedValue(authenticatedSession);
    listPostsMock.mockResolvedValue(postsResponse([publishedPost]));
    const user = userEvent.setup();

    renderWithQueryClient(<PostsPage />);

    await user.click(
      await screen.findByRole("button", { name: "Delete post post-1" })
    );

    await waitFor(() => {
      expect(deletePostMock).toHaveBeenCalledWith("post-1", {
        csrfToken: "csrf-1",
      });
    });
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
  id: "conn-1",
  platform: "x",
  displayName: "Main X",
  accountHandle: "@echo",
  enabled: true,
  lastCheckedAt: "2026-05-14T12:00:00Z",
  lastHealthStatus: "healthy",
};

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

function renderWithQueryClient(ui: ReactNode, client = createTestQueryClient()) {
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}
