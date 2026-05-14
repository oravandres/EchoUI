import { z } from "zod";
import { fetchJson } from "@/api/client";

const API_PREFIX = "/api/v1/posts";

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

export async function listPosts(
  params: ListPostsParams = {}
): Promise<PostsResponse> {
  const data = await fetchJson<unknown>(API_PREFIX, {
    signal: params.signal,
  });
  return postsResponseSchema.parse(data);
}
