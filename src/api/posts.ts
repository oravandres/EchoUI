import { z } from "zod";
import { fetchJson, postJson } from "@/api/client";

const API_PREFIX = "/api/v1/posts";
const ADMIN_CSRF_HEADER = "X-Echo-CSRF-Token";

const postStatusSchema = z.enum(["pending", "published", "failed", "deleted"]);

const postSchema = z.object({
  id: z.string(),
  platformConnectionId: z.string(),
  platform: z.string(),
  externalPostId: z
    .string()
    .optional()
    .transform((value) => value ?? ""),
  text: z.string(),
  status: postStatusSchema,
  errorMessage: z
    .string()
    .optional()
    .transform((value) => value ?? ""),
  publishedAt: z
    .string()
    .nullable()
    .optional()
    .transform((value) => value ?? null),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const postsResponseSchema = z.object({
  data: z.array(postSchema),
});

export type PostStatus = z.infer<typeof postStatusSchema>;
export type Post = z.infer<typeof postSchema>;
export type PostsResponse = z.infer<typeof postsResponseSchema>;

export type ListPostsParams = {
  /** Pass from React Query `queryFn` context to cancel superseded requests. */
  signal?: AbortSignal;
};

export type AdminPostParams = {
  csrfToken: string;
  signal?: AbortSignal;
};

export type CreatePostsInput = {
  platformConnectionIds: string[];
  text: string;
};

export async function listPosts(
  params: ListPostsParams = {}
): Promise<PostsResponse> {
  const data = await fetchJson<unknown>(API_PREFIX, {
    signal: params.signal,
  });
  return postsResponseSchema.parse(data);
}

export async function getPost(
  id: string,
  params: ListPostsParams = {}
): Promise<Post> {
  const data = await fetchJson<unknown>(`${API_PREFIX}/${encodeURIComponent(id)}`, {
    signal: params.signal,
  });
  return postSchema.parse(data);
}

export async function createPosts(
  input: CreatePostsInput,
  params: AdminPostParams
): Promise<PostsResponse> {
  const headers = new Headers();
  headers.set(ADMIN_CSRF_HEADER, params.csrfToken);

  const data = await postJson<unknown>(API_PREFIX, input, {
    credentials: "include",
    headers,
    signal: params.signal,
  });
  return postsResponseSchema.parse(data);
}

export async function deletePost(
  id: string,
  params: AdminPostParams
): Promise<void> {
  const headers = new Headers();
  headers.set(ADMIN_CSRF_HEADER, params.csrfToken);

  await fetchJson<void>(`${API_PREFIX}/${encodeURIComponent(id)}`, {
    credentials: "include",
    headers,
    method: "DELETE",
    signal: params.signal,
  });
}
