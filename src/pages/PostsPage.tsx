import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import { type Post, type PostStatus, listPosts } from "@/api/posts";

const statusLabels: Record<PostStatus, string> = {
  pending: "Pending",
  published: "Published",
  failed: "Failed",
  deleted: "Deleted",
};

export function PostsPage() {
  const postsQuery = useQuery({
    queryKey: ["posts", "list"],
    queryFn: ({ signal }) => listPosts({ signal }),
    refetchInterval: 30_000,
  });

  const posts = postsQuery.data?.data;
  const hasData = posts !== undefined;
  const refreshError = postsQuery.isError && hasData;

  return (
    <div className="page-container" id="posts-page">
      <header className="page-header">
        <h1 className="page-title">Posts</h1>
        <p className="page-subtitle">Read-only publishing history from Echo</p>
      </header>

      {refreshError ? (
        <p
          className="status-banner status-banner-warning"
          role="status"
          aria-label="Could not refresh posts. Showing last known data."
        >
          Could not refresh posts. Showing last known data.
        </p>
      ) : null}

      <DisabledComposer />

      {!hasData && postsQuery.isPending ? (
        <div
          className="posts-panel glass"
          role="status"
          aria-live="polite"
          aria-label="Loading posts"
        >
          <div className="post-skeleton" aria-hidden="true" />
          <div className="post-skeleton" aria-hidden="true" />
          <div className="post-skeleton" aria-hidden="true" />
        </div>
      ) : null}

      {!hasData && postsQuery.isError ? (
        <section className="posts-panel glass" aria-labelledby="posts-error-title">
          <h2 className="section-title" id="posts-error-title">
            Posts are unavailable
          </h2>
          <p className="section-copy" role="alert">
            Echo could not load posts. Try again after the API is available.
          </p>
          {postsQuery.error instanceof ApiError && postsQuery.error.requestId ? (
            <p className="request-id">
              Request ID: <code>{postsQuery.error.requestId}</code>
            </p>
          ) : null}
        </section>
      ) : null}

      {hasData && posts.length === 0 ? (
        <section className="posts-panel glass" aria-labelledby="posts-empty-title">
          <h2 className="section-title" id="posts-empty-title">
            No posts yet
          </h2>
          <p className="section-copy">
            Echo has no persisted posts to show yet.
          </p>
        </section>
      ) : null}

      {hasData && posts.length > 0 ? (
        <ul className="post-list" role="list" aria-label="Published posts">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function DisabledComposer() {
  return (
    <section className="composer-panel glass" aria-labelledby="composer-title">
      <div className="composer-header">
        <h2 className="section-title" id="composer-title">
          Compose
        </h2>
        <span className="status-badge status-badge-disabled">Disabled</span>
      </div>
      <fieldset className="composer-fieldset" disabled>
        <label className="composer-label" htmlFor="post-composer-text">
          Post text
        </label>
        <textarea
          id="post-composer-text"
          className="composer-textarea"
          rows={4}
          placeholder="Publishing requires admin session support."
        />
        <button className="composer-button" type="button">
          Publish
        </button>
      </fieldset>
      <p className="section-copy">Publishing requires admin session support.</p>
    </section>
  );
}

function PostCard({ post }: { post: Post }) {
  const createdAt = formatDate(post.createdAt);
  const publishedAt = post.publishedAt ? formatDate(post.publishedAt) : null;

  return (
    <li className="post-card glass">
      <div className="post-card-header">
        <div>
          <p className="post-platform">{post.platform}</p>
          <h2 className="post-title">
            <span className="sr-only">Post </span>
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

      <dl className="post-meta-list">
        <div>
          <dt>Created</dt>
          <dd>
            {createdAt ? (
              <time dateTime={post.createdAt}>{createdAt}</time>
            ) : (
              "Unknown"
            )}
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
      </dl>
    </li>
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
