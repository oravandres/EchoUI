import { Link, useParams } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { type Post, type PostStatus, getPost } from "@/api/posts";

const statusLabels: Record<PostStatus, string> = {
  pending: "Pending",
  published: "Published",
  failed: "Failed",
  deleted: "Deleted",
};

export function PostDetailPage() {
  const { postId } = useParams<{ postId: string }>();
  const hasPostId = typeof postId === "string" && postId.trim() !== "";

  const postQuery = useQuery({
    queryKey: ["posts", "detail", postId],
    queryFn: ({ signal }) => getPost(postId ?? "", { signal }),
    enabled: hasPostId,
    refetchInterval: 30_000,
  });

  const post = postQuery.data;
  const refreshError = postQuery.isError && post !== undefined;

  return (
    <div className="page-container" id="post-detail-page">
      <header className="page-header">
        <Link className="text-link" to="/posts">
          Back to posts
        </Link>
        <h1 className="page-title">Post detail</h1>
        <p className="page-subtitle">Persisted post status from Echo</p>
      </header>

      {refreshError ? (
        <p
          className="status-banner status-banner-warning"
          role="status"
          aria-label="Could not refresh post detail. Showing last known data."
        >
          Could not refresh post detail. Showing last known data.
        </p>
      ) : null}

      {!hasPostId || (!post && postQuery.isError) ? (
        <section className="posts-panel glass" aria-labelledby="post-detail-error-title">
          <h2 className="section-title" id="post-detail-error-title">
            Post is unavailable
          </h2>
          <p className="section-copy" role="alert">
            Echo could not load this post. Try again after the API is available.
          </p>
          {postQuery.error instanceof ApiError && postQuery.error.requestId ? (
            <p className="request-id">
              Request ID: <code>{postQuery.error.requestId}</code>
            </p>
          ) : null}
        </section>
      ) : null}

      {hasPostId && !post && postQuery.isPending ? (
        <div
          className="posts-panel glass"
          role="status"
          aria-live="polite"
          aria-label="Loading post detail"
        >
          <div className="post-skeleton" aria-hidden="true" />
        </div>
      ) : null}

      {post ? <PostDetail post={post} /> : null}
    </div>
  );
}

function PostDetail({ post }: { post: Post }) {
  const createdAt = formatDate(post.createdAt);
  const updatedAt = formatDate(post.updatedAt);
  const publishedAt = post.publishedAt ? formatDate(post.publishedAt) : null;

  return (
    <article className="post-detail-panel glass" aria-labelledby="post-detail-title">
      <div className="post-card-header">
        <div>
          <p className="post-platform">{post.platform}</p>
          <h2 className="post-title" id="post-detail-title">
            {post.id}
          </h2>
        </div>
        <span className={`status-badge status-badge-post-${post.status}`}>
          {statusLabels[post.status]}
        </span>
      </div>

      <p className="post-text">{post.text}</p>

      {post.status === "failed" && post.errorMessage ? (
        <p className="post-error">{post.errorMessage}</p>
      ) : null}

      <dl className="detail-list">
        <div>
          <dt>Platform connection</dt>
          <dd>{post.platformConnectionId}</dd>
        </div>
        {post.externalPostId ? (
          <div>
            <dt>External post</dt>
            <dd>{post.externalPostId}</dd>
          </div>
        ) : null}
        <div>
          <dt>Created</dt>
          <dd>
            {createdAt ? <time dateTime={post.createdAt}>{createdAt}</time> : "Unknown"}
          </dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>
            {updatedAt ? <time dateTime={post.updatedAt}>{updatedAt}</time> : "Unknown"}
          </dd>
        </div>
        {post.publishedAt ? (
          <div>
            <dt>Published</dt>
            <dd>
              {publishedAt ? (
                <time dateTime={post.publishedAt}>{publishedAt}</time>
              ) : (
                "Unknown"
              )}
            </dd>
          </div>
        ) : null}
        <div>
          <dt>Engagement</dt>
          <dd>Not available yet</dd>
        </div>
      </dl>
    </article>
  );
}

function formatDate(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
