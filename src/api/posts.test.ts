import { afterEach, describe, expect, it, vi } from "vitest";
import { createPosts, deletePost, getPost, listPosts } from "@/api/posts";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("listPosts", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests the public posts endpoint and parses the response", async () => {
    const signal = new AbortController().signal;
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse(200, {
          data: [
            {
              id: "post-1",
              platformConnectionId: "conn-1",
              platform: "x",
              externalPostId: "tweet-1",
              text: "hello from Echo",
              status: "published",
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
            },
          ],
        })
      );

    const data = await listPosts({ signal });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8001/api/v1/posts",
      expect.objectContaining({ signal })
    );
    const init = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
    expect(data.data[0]?.status).toBe("published");
    expect(data.data[0]?.text).toBe("hello from Echo");
    expect(data.data[0]?.engagement?.repostCount).toBe(3);
  });

  it("rejects responses that do not match the posts contract", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      jsonResponse(200, {
        data: [{ id: "post-1", status: "queued" }],
      })
    );

    await expect(listPosts()).rejects.toThrow();
  });
});

describe("getPost", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("requests one public post and parses the response", async () => {
    const signal = new AbortController().signal;
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse(200, {
          id: "post/1",
          platformConnectionId: "conn-1",
          platform: "x",
          externalPostId: "tweet-1",
          text: "hello from Echo",
          status: "published",
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
        })
      );

    const data = await getPost("post/1", { signal });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8001/api/v1/posts/post%2F1",
      expect.objectContaining({ signal })
    );
    const init = fetchMock.mock.calls[0]?.[1];
    expect(new Headers(init?.headers).has("Authorization")).toBe(false);
    expect(data.id).toBe("post/1");
    expect(data.externalPostId).toBe("tweet-1");
    expect(data.engagement?.impressionCount).toBe(600);
  });
});

describe("admin post API", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates posts with cookie credentials and the CSRF header", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        jsonResponse(201, {
          data: [
            {
              id: "post-1",
              platformConnectionId: "conn-1",
              platform: "x",
              externalPostId: "tweet-1",
              text: "hello from Echo",
              status: "published",
              publishedAt: "2026-05-14T12:00:00Z",
              createdAt: "2026-05-14T12:00:00Z",
              updatedAt: "2026-05-14T12:00:00Z",
            },
          ],
        })
      );

    await createPosts(
      { platformConnectionIds: ["conn-1"], text: "hello from Echo" },
      { csrfToken: "csrf-1" }
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8001/api/v1/posts",
      expect.objectContaining({
        body: JSON.stringify({
          platformConnectionIds: ["conn-1"],
          text: "hello from Echo",
        }),
        credentials: "include",
        method: "POST",
      })
    );
    const init = fetchMock.mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect(headers.get("Content-Type")).toBe("application/json");
    expect(headers.get("X-Echo-CSRF-Token")).toBe("csrf-1");
    expect(headers.has("Authorization")).toBe(false);
  });

  it("deletes posts with cookie credentials and the CSRF header", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));

    await deletePost("post/1", { csrfToken: "csrf-1" });

    expect(fetchMock).toHaveBeenCalledWith(
      "http://localhost:8001/api/v1/posts/post%2F1",
      expect.objectContaining({
        credentials: "include",
        method: "DELETE",
      })
    );
    const init = fetchMock.mock.calls[0]?.[1];
    const headers = new Headers(init?.headers);
    expect(headers.get("X-Echo-CSRF-Token")).toBe("csrf-1");
    expect(headers.has("Authorization")).toBe(false);
  });
});
