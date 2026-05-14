import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AdminSession,
  getAdminSession,
  loginAdminSession,
  logoutAdminSession,
} from "@/api/adminSession";
import { ApiError } from "@/api/client";
import {
  type CreatePlatformInput,
  type PlatformConnection,
  type PlatformStatus,
  createPlatform,
  listPlatforms,
} from "@/api/platforms";

const statusLabels: Record<PlatformStatus, string> = {
  healthy: "Healthy",
  unhealthy: "Unhealthy",
  unknown: "Unknown",
};

const lockedAdminSession: AdminSession = {
  authenticated: false,
  csrfToken: "",
  expiresAt: "",
};

export function PlatformsPage() {
  const queryClient = useQueryClient();
  const [loginToken, setLoginToken] = useState("");
  const [displayName, setDisplayName] = useState("Main X");
  const [accessToken, setAccessToken] = useState("");
  const [enabled, setEnabled] = useState(true);

  const platformsQuery = useQuery({
    queryKey: ["platforms", "list"],
    queryFn: ({ signal }) => listPlatforms({ signal }),
    refetchInterval: 30_000,
  });
  const adminSessionQuery = useQuery({
    queryKey: ["admin", "session"],
    queryFn: ({ signal }) => getAdminSession({ signal }),
    retry: false,
    staleTime: 30_000,
  });

  const platforms = platformsQuery.data?.data;
  const hasData = platforms !== undefined;
  const refreshError = platformsQuery.isError && hasData;
  const adminSession = adminSessionQuery.data;
  const isAuthenticated = adminSession?.authenticated === true;
  const csrfToken = isAuthenticated ? adminSession.csrfToken : "";

  const loginMutation = useMutation({
    mutationFn: (token: string) => loginAdminSession(token),
    onSuccess: (session) => {
      queryClient.setQueryData(["admin", "session"], session);
      setLoginToken("");
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => logoutAdminSession(),
    onSuccess: () => {
      queryClient.setQueryData<AdminSession>(
        ["admin", "session"],
        lockedAdminSession
      );
      setAccessToken("");
    },
  });

  const createMutation = useMutation({
    mutationFn: (input: CreatePlatformInput) => {
      if (csrfToken === "") {
        throw new Error("admin session is not available");
      }
      return createPlatform(input, { csrfToken });
    },
    onError: (error) => {
      setAccessToken("");
      if (isAdminAuthError(error)) {
        queryClient.setQueryData(["admin", "session"], lockedAdminSession);
      }
    },
    onSuccess: () => {
      setAccessToken("");
      void queryClient.invalidateQueries({ queryKey: ["platforms", "list"] });
    },
  });

  function handleLoginSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const token = loginToken.trim();
    if (token === "") return;
    loginMutation.mutate(token);
  }

  function handleCreateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = displayName.trim();
    const token = accessToken.trim();
    if (name === "" || token === "") return;
    createMutation.mutate({
      platform: "x",
      displayName: name,
      credentials: { accessToken: token },
      enabled,
    });
  }

  return (
    <div className="page-container" id="platforms-page">
      <header className="page-header">
        <h1 className="page-title">Platforms</h1>
        <p className="page-subtitle">Connected account health across Echo</p>
      </header>

      {refreshError ? (
        <p
          className="status-banner status-banner-warning"
          role="status"
          aria-label="Could not refresh platform status. Showing last known data."
        >
          Could not refresh platform status. Showing last known data.
        </p>
      ) : null}

      <PlatformAdminPanel
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
        displayName={displayName}
        onDisplayNameChange={setDisplayName}
        accessToken={accessToken}
        onAccessTokenChange={setAccessToken}
        enabled={enabled}
        onEnabledChange={setEnabled}
        onCreateSubmit={handleCreateSubmit}
        isCreating={createMutation.isPending}
        createError={createMutation.error}
        createSucceeded={createMutation.isSuccess}
      />

      {!hasData && platformsQuery.isPending ? (
        <div
          className="platforms-panel glass"
          role="status"
          aria-live="polite"
          aria-label="Loading platforms"
        >
          <div className="platform-skeleton" aria-hidden="true" />
          <div className="platform-skeleton" aria-hidden="true" />
          <div className="platform-skeleton" aria-hidden="true" />
        </div>
      ) : null}

      {!hasData && platformsQuery.isError ? (
        <section className="platforms-panel glass" aria-labelledby="platforms-error-title">
          <h2 className="section-title" id="platforms-error-title">
            Platform status is unavailable
          </h2>
          <p className="section-copy" role="alert">
            Echo could not load platform status. Try again after the API is
            available.
          </p>
          {platformsQuery.error instanceof ApiError &&
          platformsQuery.error.requestId ? (
            <p className="request-id">
              Request ID: <code>{platformsQuery.error.requestId}</code>
            </p>
          ) : null}
        </section>
      ) : null}

      {hasData && platforms.length === 0 ? (
        <section className="platforms-panel glass" aria-labelledby="platforms-empty-title">
          <h2 className="section-title" id="platforms-empty-title">
            No platforms connected
          </h2>
          <p className="section-copy">
            Echo has no platform connections to report yet.
          </p>
        </section>
      ) : null}

      {hasData && platforms.length > 0 ? (
        <ul className="platform-grid" role="list" aria-label="Connected platforms">
          {platforms.map((platform) => (
            <PlatformCard key={platform.id} platform={platform} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

type PlatformAdminPanelProps = {
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
  displayName: string;
  onDisplayNameChange: (displayName: string) => void;
  accessToken: string;
  onAccessTokenChange: (accessToken: string) => void;
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  onCreateSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isCreating: boolean;
  createError: unknown;
  createSucceeded: boolean;
};

function PlatformAdminPanel({
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
  displayName,
  onDisplayNameChange,
  accessToken,
  onAccessTokenChange,
  enabled,
  onEnabledChange,
  onCreateSubmit,
  isCreating,
  createError,
  createSucceeded,
}: PlatformAdminPanelProps) {
  const isAuthenticated = adminSession?.authenticated === true;
  const canCreate =
    isAuthenticated &&
    displayName.trim() !== "" &&
    accessToken.trim() !== "" &&
    !isCreating;

  return (
    <section className="platform-admin-panel glass" aria-labelledby="platform-admin-title">
      <div className="composer-header">
        <h2 className="section-title" id="platform-admin-title">
          Add platform
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
          <label className="composer-label" htmlFor="platform-admin-token">
            Admin token
          </label>
          <div className="admin-login-row">
            <input
              id="platform-admin-token"
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
        <form className="platform-form" onSubmit={onCreateSubmit}>
          <div className="platform-form-grid">
            <label className="platform-form-field" htmlFor="platform-kind">
              <span className="composer-label">Platform</span>
              <select
                id="platform-kind"
                className="platform-select"
                defaultValue="x"
                disabled
              >
                <option value="x">X</option>
              </select>
            </label>
            <label className="platform-form-field" htmlFor="platform-display-name">
              <span className="composer-label">Display name</span>
              <input
                id="platform-display-name"
                className="admin-token-input"
                type="text"
                value={displayName}
                onChange={(event) => onDisplayNameChange(event.target.value)}
              />
            </label>
            <label className="platform-form-field" htmlFor="platform-access-token">
              <span className="composer-label">X access token</span>
              <input
                id="platform-access-token"
                className="admin-token-input"
                type="password"
                autoComplete="off"
                value={accessToken}
                onChange={(event) => onAccessTokenChange(event.target.value)}
              />
            </label>
          </div>

          <label className="form-checkbox" htmlFor="platform-enabled">
            <input
              id="platform-enabled"
              type="checkbox"
              checked={enabled}
              onChange={(event) => onEnabledChange(event.target.checked)}
            />
            <span>Enable connection after validation</span>
          </label>

          <button className="composer-button" type="submit" disabled={!canCreate}>
            {isCreating ? "Adding" : "Add platform"}
          </button>
          {createError ? (
            <p className="section-copy" role="alert">
              Echo could not add the platform.
              <RequestId error={createError} />
            </p>
          ) : null}
          {createSucceeded ? (
            <p className="section-copy" role="status">
              Platform added. Refreshing status.
            </p>
          ) : null}
        </form>
      )}
    </section>
  );
}

function PlatformCard({ platform }: { platform: PlatformConnection }) {
  const status = getDisplayStatus(platform);
  const checkedAt = platform.lastCheckedAt
    ? formatCheckedAt(platform.lastCheckedAt)
    : null;
  return (
    <li className="platform-card glass">
      <div className="platform-card-header">
        <div>
          <h2 className="platform-name">{platform.displayName}</h2>
          <p className="platform-meta">
            {platform.platform}
            {platform.accountHandle ? ` - ${platform.accountHandle}` : ""}
          </p>
        </div>
        <span className={`status-badge status-badge-${status.className}`}>
          {status.label}
        </span>
      </div>

      <p className="platform-checked">
        Last checked{" "}
        {!platform.lastCheckedAt ? (
          "not yet"
        ) : checkedAt ? (
          <time dateTime={platform.lastCheckedAt}>
            {checkedAt}
          </time>
        ) : (
          "unknown"
        )}
      </p>
    </li>
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

function isAdminAuthError(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  );
}

function getDisplayStatus(platform: PlatformConnection): {
  label: string;
  className: PlatformStatus | "disabled";
} {
  if (!platform.enabled) {
    return { label: "Disabled", className: "disabled" };
  }
  return {
    label: statusLabels[platform.lastHealthStatus],
    className: platform.lastHealthStatus,
  };
}

function formatCheckedAt(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}
