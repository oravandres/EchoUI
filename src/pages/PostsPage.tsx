import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import {
  type AdminSession,
  getAdminSession,
  loginAdminSession,
  logoutAdminSession,
} from "@/api/adminSession";
import { ApiError } from "@/api/client";
import { type PlatformConnection, listPlatforms } from "@/api/platforms";
import {
  type CreatePostsInput,
  type Engagement,
  type Post,
  type PostStatus,
  createPosts,
  deletePost,
  listPosts,
} from "@/api/posts";
import { useToasts } from "@/components/ToastContext";

const statusLabels: Record<PostStatus, string> = {
  pending: "Pending",
  published: "Published",
  failed: "Failed",
  deleted: "Deleted",
};

const lockedAdminSession: AdminSession = {
  authenticated: false,
  csrfToken: "",
  expiresAt: "",
};

export function PostsPage() {
  const queryClient = useQueryClient();
  const { notify } = useToasts();
  const [loginToken, setLoginToken] = useState("");
  const [postText, setPostText] = useState("");
  const [selectedPlatformIds, setSelectedPlatformIds] = useState<string[]>([]);
  const [platformSelectionTouched, setPlatformSelectionTouched] =
    useState(false);

  const postsQuery = useQuery({
    queryKey: ["posts", "list"],
    queryFn: ({ signal }) => listPosts({ signal }),
    refetchInterval: 30_000,
  });
  const adminSessionQuery = useQuery({
    queryKey: ["admin", "session"],
    queryFn: ({ signal }) => getAdminSession({ signal }),
    retry: false,
    staleTime: 30_000,
  });
  const platformsQuery = useQuery({
    queryKey: ["platforms", "list"],
    queryFn: ({ signal }) => listPlatforms({ signal }),
    refetchInterval: 30_000,
  });

  const posts = postsQuery.data?.data;
  const hasData = posts !== undefined;
  const refreshError = postsQuery.isError && hasData;
  const adminSession = adminSessionQuery.data;
  const isAuthenticated = adminSession?.authenticated === true;
  const csrfToken = isAuthenticated ? adminSession.csrfToken : "";
  const platforms = platformsQuery.data?.data;
  const enabledPlatforms = useMemo(
    () => platforms?.filter((platform) => platform.enabled) ?? [],
    [platforms]
  );
  const enabledPlatformIds = useMemo(
    () => new Set(enabledPlatforms.map((platform) => platform.id)),
    [enabledPlatforms]
  );
  const selectedEnabledPlatformIds = selectedPlatformIds.filter((id) =>
    enabledPlatformIds.has(id)
  );

  useEffect(() => {
    if (platformSelectionTouched || enabledPlatforms.length === 0) return;
    setSelectedPlatformIds(enabledPlatforms.map((platform) => platform.id));
  }, [enabledPlatforms, platformSelectionTouched]);

  const loginMutation = useMutation({
    mutationFn: (token: string) => loginAdminSession(token),
    onSuccess: (session) => {
      queryClient.setQueryData(["admin", "session"], session);
      setLoginToken("");
      notify({ tone: "success", title: "Admin session unlocked." });
    },
    onError: (error) => {
      notify({
        tone: "warning",
        title: "Admin unlock failed.",
        detail: requestIdDetail(error),
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => logoutAdminSession(),
    onSuccess: () => {
      queryClient.setQueryData<AdminSession>(["admin", "session"], {
        authenticated: false,
        csrfToken: "",
        expiresAt: "",
      });
      setPostText("");
      setSelectedPlatformIds([]);
      setPlatformSelectionTouched(false);
      notify({ tone: "success", title: "Admin session locked." });
    },
  });

  const publishMutation = useMutation({
    mutationFn: (input: CreatePostsInput) => {
      if (csrfToken === "") {
        throw new Error("admin session is not available");
      }
      return createPosts(input, { csrfToken });
    },
    onError: (error) => {
      if (isAdminAuthError(error)) {
        queryClient.setQueryData(["admin", "session"], lockedAdminSession);
      }
      notify({
        tone: "warning",
        title: "Post publish failed.",
        detail: requestIdDetail(error),
      });
    },
    onSuccess: () => {
      setPostText("");
      void queryClient.invalidateQueries({ queryKey: ["posts", "list"] });
      notify({
        tone: "success",
        title: "Post request completed.",
        detail: "Refreshing posts.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (postId: string) => {
      if (csrfToken === "") {
        throw new Error("admin session is not available");
      }
      return deletePost(postId, { csrfToken });
    },
    onError: (error) => {
      if (isAdminAuthError(error)) {
        queryClient.setQueryData(["admin", "session"], lockedAdminSession);
      }
      notify({
        tone: "warning",
        title: "Post deletion failed.",
        detail: requestIdDetail(error),
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["posts", "list"] });
      notify({ tone: "success", title: "Post deleted." });
    },
  });

  function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = loginToken.trim();
    if (token === "") return;
    loginMutation.mutate(token);
  }

  function handlePublishSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = postText.trim();
    if (text === "" || selectedEnabledPlatformIds.length === 0) return;
    publishMutation.mutate({
      platformConnectionIds: selectedEnabledPlatformIds,
      text,
    });
  }

  function handlePlatformToggle(id: string, checked: boolean) {
    setPlatformSelectionTouched(true);
    setSelectedPlatformIds((current) => {
      if (checked) {
        return current.includes(id) ? current : [...current, id];
      }
      return current.filter((platformId) => platformId !== id);
    });
  }

  return (
    <div className="page-container" id="posts-page">
      <header className="page-header">
        <h1 className="page-title">Posts</h1>
        <p className="page-subtitle">Publishing history from Echo</p>
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

      {deleteMutation.isError ? (
        <p className="status-banner status-banner-warning" role="alert">
          Echo could not delete the post.
          <RequestId error={deleteMutation.error} />
        </p>
      ) : null}

      <Composer
        adminSession={adminSession}
        isSessionLoading={adminSessionQuery.isPending}
        isSessionUnavailable={adminSessionQuery.isError}
        loginToken={loginToken}
        onLoginTokenChange={setLoginToken}
        onLoginSubmit={handleLoginSubmit}
        isLoggingIn={loginMutation.isPending}
        loginError={loginMutation.error}
        onLogout={() => logoutMutation.mutate()}
        isLoggingOut={logoutMutation.isPending}
        platforms={platforms}
        isPlatformsLoading={platformsQuery.isPending && platforms === undefined}
        isPlatformsUnavailable={platformsQuery.isError && platforms === undefined}
        hasPlatformRefreshError={platformsQuery.isError && platforms !== undefined}
        selectedPlatformIds={selectedPlatformIds}
        onPlatformToggle={handlePlatformToggle}
        postText={postText}
        onPostTextChange={setPostText}
        onPublishSubmit={handlePublishSubmit}
        isPublishing={publishMutation.isPending}
        publishError={publishMutation.error}
        publishSucceeded={publishMutation.isSuccess}
      />

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
            <PostCard
              key={post.id}
              post={post}
              canDelete={isAuthenticated && post.status !== "deleted"}
              isDeleting={
                deleteMutation.isPending && deleteMutation.variables === post.id
              }
              onDelete={(postId) => deleteMutation.mutate(postId)}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

type ComposerProps = {
  adminSession?: AdminSession;
  isSessionLoading: boolean;
  isSessionUnavailable: boolean;
  loginToken: string;
  onLoginTokenChange: (token: string) => void;
  onLoginSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isLoggingIn: boolean;
  loginError: unknown;
  onLogout: () => void;
  isLoggingOut: boolean;
  platforms?: PlatformConnection[];
  isPlatformsLoading: boolean;
  isPlatformsUnavailable: boolean;
  hasPlatformRefreshError: boolean;
  selectedPlatformIds: string[];
  onPlatformToggle: (id: string, checked: boolean) => void;
  postText: string;
  onPostTextChange: (text: string) => void;
  onPublishSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isPublishing: boolean;
  publishError: unknown;
  publishSucceeded: boolean;
};

function Composer({
  adminSession,
  isSessionLoading,
  isSessionUnavailable,
  loginToken,
  onLoginTokenChange,
  onLoginSubmit,
  isLoggingIn,
  loginError,
  onLogout,
  isLoggingOut,
  platforms,
  isPlatformsLoading,
  isPlatformsUnavailable,
  hasPlatformRefreshError,
  selectedPlatformIds,
  onPlatformToggle,
  postText,
  onPostTextChange,
  onPublishSubmit,
  isPublishing,
  publishError,
  publishSucceeded,
}: ComposerProps) {
  const isAuthenticated = adminSession?.authenticated === true;
  const enabledPlatforms =
    platforms?.filter((platform) => platform.enabled) ?? [];
  const enabledPlatformIds = new Set(
    enabledPlatforms.map((platform) => platform.id)
  );
  const selectedEnabledPlatformIds = selectedPlatformIds.filter((id) =>
    enabledPlatformIds.has(id)
  );
  const textLength = Array.from(postText).length;
  const trimmedText = postText.trim();
  const canPublish =
    isAuthenticated &&
    enabledPlatforms.length > 0 &&
    selectedEnabledPlatformIds.length > 0 &&
    trimmedText !== "" &&
    textLength <= 280 &&
    !isPublishing;

  return (
    <section className="composer-panel glass" aria-labelledby="composer-title">
      <div className="composer-header">
        <h2 className="section-title" id="composer-title">
          Compose
        </h2>
        <div className="composer-actions">
          <span
            className={
              isAuthenticated
                ? "status-badge status-badge-healthy"
                : "status-badge status-badge-disabled"
            }
          >
            {isAuthenticated ? "Ready" : "Locked"}
          </span>
          {isAuthenticated ? (
            <button
              className="secondary-button"
              type="button"
              disabled={isLoggingOut}
              onClick={onLogout}
            >
              Sign out
            </button>
          ) : null}
        </div>
      </div>

      {!isAuthenticated ? (
        <form className="admin-login-form" onSubmit={onLoginSubmit}>
          <label className="composer-label" htmlFor="admin-session-token">
            Admin token
          </label>
          <div className="admin-login-row">
            <input
              id="admin-session-token"
              className="admin-token-input"
              type="password"
              autoComplete="current-password"
              value={loginToken}
              onChange={(event) => onLoginTokenChange(event.target.value)}
              disabled={isLoggingIn}
            />
            <button
              className="composer-button"
              type="submit"
              disabled={isLoggingIn || loginToken.trim() === ""}
            >
              Unlock
            </button>
          </div>
          {isSessionLoading ? (
            <p className="section-copy" role="status">
              Checking admin session.
            </p>
          ) : null}
          {isSessionUnavailable ? (
            <p className="section-copy" role="alert">
              Admin session is unavailable.
            </p>
          ) : null}
          {loginError ? (
            <p className="section-copy" role="alert">
              Echo did not accept the admin token.
              <RequestId error={loginError} />
            </p>
          ) : null}
        </form>
      ) : (
        <form className="composer-form" onSubmit={onPublishSubmit}>
          <fieldset className="composer-fieldset">
            <legend className="composer-label">Platforms</legend>
            {hasPlatformRefreshError ? (
              <p className="section-copy" role="status">
                Could not refresh platforms. Showing last known connections.
              </p>
            ) : null}
            {isPlatformsLoading ? (
              <p className="section-copy" role="status">
                Loading platforms.
              </p>
            ) : null}
            {isPlatformsUnavailable ? (
              <p className="section-copy" role="alert">
                Platforms are unavailable.
              </p>
            ) : null}
            {platforms !== undefined && enabledPlatforms.length === 0 ? (
              <p className="section-copy">No enabled platforms available.</p>
            ) : null}
            {platforms !== undefined && platforms.length > 0 ? (
              <div className="platform-choice-list">
                {platforms.map((platform) => (
                  <label
                    key={platform.id}
                    className={`platform-choice ${platform.enabled ? "" : "platform-choice-disabled"}`}
                  >
                    <input
                      type="checkbox"
                      checked={
                        platform.enabled &&
                        selectedPlatformIds.includes(platform.id)
                      }
                      disabled={!platform.enabled}
                      onChange={(event) =>
                        onPlatformToggle(platform.id, event.target.checked)
                      }
                    />
                    <span>
                      <span className="platform-choice-name">
                        {platform.displayName}
                      </span>
                      <span className="platform-choice-meta">
                        {platform.accountHandle || platform.platform}
                      </span>
                    </span>
                    <span
                      className={
                        platform.enabled
                          ? "status-badge status-badge-healthy"
                          : "status-badge status-badge-disabled"
                      }
                    >
                      {platform.enabled ? "Enabled" : "Disabled"}
                    </span>
                  </label>
                ))}
              </div>
            ) : null}
          </fieldset>

          <fieldset className="composer-fieldset">
            <label className="composer-label" htmlFor="post-composer-text">
              Post text
            </label>
            <textarea
              id="post-composer-text"
              className="composer-textarea"
              rows={4}
              value={postText}
              aria-describedby="post-composer-count"
              onChange={(event) => onPostTextChange(event.target.value)}
            />
            <p
              className={`character-count ${textLength > 280 ? "text-error" : ""}`}
              id="post-composer-count"
            >
              {textLength}/280
            </p>
          </fieldset>

          <PostPreview
            platforms={enabledPlatforms}
            selectedPlatformIds={selectedEnabledPlatformIds}
            text={postText}
            textLength={textLength}
          />

          <button className="composer-button" type="submit" disabled={!canPublish}>
            {isPublishing ? "Publishing" : "Publish"}
          </button>
          {publishError ? (
            <p className="section-copy" role="alert">
              Echo could not publish the post.
              <RequestId error={publishError} />
            </p>
          ) : null}
          {publishSucceeded ? (
            <p className="section-copy" role="status">
              Post request completed. Refreshing posts.
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}

function PostPreview({
  platforms,
  selectedPlatformIds,
  text,
  textLength,
}: {
  platforms: PlatformConnection[];
  selectedPlatformIds: string[];
  text: string;
  textLength: number;
}) {
  const selectedPlatforms = platforms.filter((platform) =>
    selectedPlatformIds.includes(platform.id)
  );
  const trimmedText = text.trim();
  const overLimit = textLength > 280;

  return (
    <section className="post-preview" aria-labelledby="post-preview-title">
      <div className="post-preview-header">
        <h3 className="composer-label" id="post-preview-title">
          Preview
        </h3>
        <span className={overLimit ? "text-error" : "post-preview-count"}>
          {textLength}/280
        </span>
      </div>

      {selectedPlatforms.length === 0 ? (
        <p className="post-preview-empty">No target platforms selected.</p>
      ) : (
        <ul className="post-preview-list" role="list">
          {selectedPlatforms.map((platform) => (
            <li className="post-preview-card" key={platform.id}>
              <div className="post-preview-card-header">
                <div>
                  <p className="post-preview-platform">{platform.platform}</p>
                  <h4 className="post-preview-name">{platform.displayName}</h4>
                  {platform.accountHandle ? (
                    <p className="post-preview-handle">{platform.accountHandle}</p>
                  ) : null}
                </div>
                <span className="status-badge status-badge-healthy">Selected</span>
              </div>
              <p
                className={
                  trimmedText === ""
                    ? "post-preview-body post-preview-body-empty"
                    : "post-preview-body"
                }
              >
                {trimmedText || "Post text is empty."}
              </p>
              {overLimit ? (
                <p className="post-preview-warning" role="alert">
                  Over X's 280-character limit.
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function PostCard({
  post,
  canDelete,
  isDeleting,
  onDelete,
}: {
  post: Post;
  canDelete: boolean;
  isDeleting: boolean;
  onDelete: (postId: string) => void;
}) {
  const createdAt = formatDate(post.createdAt);
  const publishedAt = post.publishedAt ? formatDate(post.publishedAt) : null;

  return (
    <li className="post-card glass">
      <div className="post-card-header">
        <div>
          <p className="post-platform">{post.platform}</p>
          <h2 className="post-title">
            <span className="sr-only">Post </span>
            <Link
              className="post-title-link"
              to={`/posts/${encodeURIComponent(post.id)}`}
            >
              {post.id}
            </Link>
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

      {post.engagement ? (
        <EngagementInline engagement={post.engagement} />
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

      {canDelete ? (
        <button
          className="danger-button post-delete-button"
          type="button"
          disabled={isDeleting}
          aria-label={`Delete post ${post.id}`}
          onClick={() => onDelete(post.id)}
        >
          {isDeleting ? "Deleting" : "Delete"}
        </button>
      ) : null}
    </li>
  );
}

function EngagementInline({ engagement }: { engagement: Engagement }) {
  return (
    <dl className="post-engagement-inline" aria-label="Public engagement">
      <div>
        <dt>Likes</dt>
        <dd>{engagement.likeCount.toLocaleString()}</dd>
      </div>
      <div>
        <dt>Replies</dt>
        <dd>{engagement.replyCount.toLocaleString()}</dd>
      </div>
      <div>
        <dt>Reposts</dt>
        <dd>{engagement.repostCount.toLocaleString()}</dd>
      </div>
      <div>
        <dt>Impressions</dt>
        <dd>{engagement.impressionCount.toLocaleString()}</dd>
      </div>
    </dl>
  );
}

function RequestId({ error }: { error: unknown }) {
  if (!(error instanceof ApiError) || !error.requestId) return null;
  return (
    <>
      {" "}
      Request ID: <code>{error.requestId}</code>
    </>
  );
}

function requestIdDetail(error: unknown): string | undefined {
  if (!(error instanceof ApiError) || !error.requestId) return undefined;
  return `Request ID: ${error.requestId}`;
}

function isAdminAuthError(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
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
