import { useEffect, useState, type FormEvent } from "react";
import {
  type QueryClient,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useSearchParams } from "react-router";
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
  type UpdatePlatformInput,
  createPlatform,
  deletePlatform,
  listPlatforms,
  startXOAuthConnection,
  updatePlatform,
} from "@/api/platforms";
import { useToasts } from "@/components/ToastContext";

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

function invalidatePlatformConsumers(queryClient: QueryClient) {
  void queryClient.invalidateQueries({ queryKey: ["platforms"] });
  void queryClient.invalidateQueries({ queryKey: ["stats"] });
  void queryClient.invalidateQueries({ queryKey: ["posts"] });
}

export function PlatformsPage() {
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const { notify } = useToasts();
  const [loginToken, setLoginToken] = useState("");
  const [displayName, setDisplayName] = useState("Main X");
  const [accessToken, setAccessToken] = useState("");
  const [enabled, setEnabled] = useState(true);
  const [showManualToken, setShowManualToken] = useState(false);

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
  const connectStatus =
    searchParams.get("connect") === "x" ? searchParams.get("status") : null;

  useEffect(() => {
    if (connectStatus === "connected") {
      invalidatePlatformConsumers(queryClient);
    }
  }, [connectStatus, queryClient]);

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
      queryClient.setQueryData<AdminSession>(
        ["admin", "session"],
        lockedAdminSession
      );
      setAccessToken("");
      notify({ tone: "success", title: "Admin session locked." });
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
      notify({
        tone: "warning",
        title: "Platform creation failed.",
        detail: requestIdDetail(error),
      });
    },
    onSuccess: () => {
      setAccessToken("");
      invalidatePlatformConsumers(queryClient);
      notify({
        tone: "success",
        title: "Platform connection added.",
        detail: "Refreshing platform status.",
      });
    },
  });

  const startOAuthMutation = useMutation({
    mutationFn: (input: { displayName: string; enabled: boolean }) => {
      if (csrfToken === "") {
        throw new Error("admin session is not available");
      }
      return startXOAuthConnection(input, { csrfToken });
    },
    onError: (error) => {
      if (isAdminAuthError(error)) {
        queryClient.setQueryData(["admin", "session"], lockedAdminSession);
      }
      notify({
        tone: "warning",
        title: "X connection failed.",
        detail: requestIdDetail(error),
      });
    },
    onSuccess: (response) => {
      window.location.assign(response.authorizationUrl);
    },
  });

  function lockAdminSession() {
    queryClient.setQueryData(["admin", "session"], lockedAdminSession);
  }

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

  function handleOAuthStartSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const name = displayName.trim();
    if (name === "") return;
    startOAuthMutation.mutate({ displayName: name, enabled });
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

      {connectStatus === "connected" ? (
        <p className="status-banner status-banner-success" role="status">
          X connection added. Refreshing platform status.
        </p>
      ) : null}
      {connectStatus === "denied" ? (
        <p className="status-banner status-banner-warning" role="status">
          X connection was cancelled.
        </p>
      ) : null}
      {connectStatus === "failed" ? (
        <p className="status-banner status-banner-warning" role="alert">
          Echo could not connect X.
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
        onOAuthStartSubmit={handleOAuthStartSubmit}
        isStartingOAuth={startOAuthMutation.isPending}
        oauthStartError={startOAuthMutation.error}
        showManualToken={showManualToken}
        onShowManualTokenChange={setShowManualToken}
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
            <PlatformCard
              key={platform.id}
              platform={platform}
              canManage={isAuthenticated}
              csrfToken={csrfToken}
              onAuthLocked={lockAdminSession}
            />
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
  onOAuthStartSubmit: (event: FormEvent<HTMLFormElement>) => void;
  isStartingOAuth: boolean;
  oauthStartError: unknown;
  showManualToken: boolean;
  onShowManualTokenChange: (showManualToken: boolean) => void;
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
  onOAuthStartSubmit,
  isStartingOAuth,
  oauthStartError,
  showManualToken,
  onShowManualTokenChange,
  onCreateSubmit,
  isCreating,
  createError,
  createSucceeded,
}: PlatformAdminPanelProps) {
  const isAuthenticated = adminSession?.authenticated === true;
  const canStartOAuth =
    isAuthenticated &&
    displayName.trim() !== "" &&
    !isStartingOAuth &&
    !isCreating;
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
        <div className="platform-form-stack">
          <form className="platform-form" onSubmit={onOAuthStartSubmit}>
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
              <label
                className="platform-form-field"
                htmlFor="platform-display-name"
              >
                <span className="composer-label">Display name</span>
                <input
                  id="platform-display-name"
                  className="admin-token-input"
                  type="text"
                  value={displayName}
                  onChange={(event) => onDisplayNameChange(event.target.value)}
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

            <button className="composer-button" type="submit" disabled={!canStartOAuth}>
              {isStartingOAuth ? "Connecting" : "Connect X"}
            </button>
            {oauthStartError ? (
              <p className="section-copy" role="alert">
                {isOAuthUnavailable(oauthStartError)
                  ? "X connection is not configured in Echo."
                  : "Echo could not start X connection."}
                <RequestId error={oauthStartError} />
              </p>
            ) : null}
          </form>

          <button
            className="secondary-button"
            type="button"
            aria-expanded={showManualToken}
            onClick={() => onShowManualTokenChange(!showManualToken)}
          >
            Advanced manual token
          </button>

          {showManualToken ? (
            <form className="platform-form" onSubmit={onCreateSubmit}>
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
          ) : null}
        </div>
      )}
    </section>
  );
}

function PlatformCard({
  platform,
  canManage,
  csrfToken,
  onAuthLocked,
}: {
  platform: PlatformConnection;
  canManage: boolean;
  csrfToken: string;
  onAuthLocked: () => void;
}) {
  const queryClient = useQueryClient();
  const { notify } = useToasts();
  const [displayName, setDisplayName] = useState(platform.displayName);
  const [enabled, setEnabled] = useState(platform.enabled);
  const [credentialToken, setCredentialToken] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const status = getDisplayStatus(platform);
  const checkedAt = platform.lastCheckedAt
    ? formatCheckedAt(platform.lastCheckedAt)
    : null;

  useEffect(() => {
    setDisplayName(platform.displayName);
    setEnabled(platform.enabled);
    setConfirmDelete(false);
  }, [platform.displayName, platform.enabled, platform.id]);

  const updateMutation = useMutation({
    mutationFn: (input: UpdatePlatformInput) => {
      if (csrfToken === "") {
        throw new Error("admin session is not available");
      }
      return updatePlatform(platform.id, input, { csrfToken });
    },
    onError: (error) => {
      setCredentialToken("");
      if (isAdminAuthError(error)) {
        onAuthLocked();
      }
      notify({
        tone: "warning",
        title: "Platform update failed.",
        detail: requestIdDetail(error),
      });
    },
    onSuccess: () => {
      setCredentialToken("");
      invalidatePlatformConsumers(queryClient);
      notify({
        tone: "success",
        title: "Platform updated.",
        detail: "Refreshing platform status.",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => {
      if (csrfToken === "") {
        throw new Error("admin session is not available");
      }
      return deletePlatform(platform.id, { csrfToken });
    },
    onError: (error) => {
      setCredentialToken("");
      if (isAdminAuthError(error)) {
        onAuthLocked();
      }
      notify({
        tone: "warning",
        title: "Platform deletion failed.",
        detail: requestIdDetail(error),
      });
    },
    onSuccess: () => {
      setCredentialToken("");
      setConfirmDelete(false);
      invalidatePlatformConsumers(queryClient);
      notify({
        tone: "success",
        title: "Platform deleted.",
        detail: "Refreshing platform status.",
      });
    },
  });

  const updateInput = buildUpdateInput(platform, {
    displayName,
    enabled,
    credentialToken,
  });
  const isBusy = updateMutation.isPending || deleteMutation.isPending;
  const canSave =
    canManage &&
    updateInput !== null &&
    displayName.trim() !== "" &&
    !isBusy;

  function handleManageSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (updateInput === null || displayName.trim() === "") return;
    updateMutation.mutate(updateInput);
  }

  function handleDeleteClick() {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteMutation.mutate();
  }

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

      {canManage ? (
        <form
          className="platform-management-form"
          onSubmit={handleManageSubmit}
          aria-label={`Manage ${platform.displayName}`}
        >
          <div className="platform-form-grid">
            <label
              className="platform-form-field"
              htmlFor={`platform-display-name-${platform.id}`}
            >
              <span className="composer-label">Display name</span>
              <input
                id={`platform-display-name-${platform.id}`}
                className="admin-token-input"
                type="text"
                value={displayName}
                disabled={isBusy}
                onChange={(event) => setDisplayName(event.target.value)}
              />
            </label>
            <label
              className="platform-form-field"
              htmlFor={`platform-credential-${platform.id}`}
            >
              <span className="composer-label">New X access token</span>
              <input
                id={`platform-credential-${platform.id}`}
                className="admin-token-input"
                type="password"
                autoComplete="off"
                value={credentialToken}
                disabled={isBusy}
                onChange={(event) => setCredentialToken(event.target.value)}
              />
            </label>
          </div>

          <label
            className="form-checkbox"
            htmlFor={`platform-enabled-${platform.id}`}
          >
            <input
              id={`platform-enabled-${platform.id}`}
              type="checkbox"
              checked={enabled}
              disabled={isBusy}
              onChange={(event) => setEnabled(event.target.checked)}
            />
            <span>Enabled</span>
          </label>

          <div className="platform-management-actions">
            <button className="composer-button" type="submit" disabled={!canSave}>
              {updateMutation.isPending ? "Saving" : "Save changes"}
            </button>
            <button
              className="danger-button"
              type="button"
              disabled={isBusy}
              aria-label={
                confirmDelete
                  ? `Confirm delete platform ${platform.displayName}`
                  : `Delete platform ${platform.displayName}`
              }
              onClick={handleDeleteClick}
            >
              {confirmDelete ? "Confirm delete" : "Delete"}
            </button>
            {confirmDelete ? (
              <button
                className="secondary-button"
                type="button"
                disabled={isBusy}
                onClick={() => setConfirmDelete(false)}
              >
                Cancel
              </button>
            ) : null}
          </div>

          {updateMutation.isSuccess ? (
            <p className="section-copy" role="status">
              Platform updated. Refreshing status.
            </p>
          ) : null}
        </form>
      ) : null}

      {updateMutation.isError ? (
        <p className="section-copy platform-management-message" role="alert">
          Echo could not update the platform.
          <RequestId error={updateMutation.error} />
        </p>
      ) : null}
      {deleteMutation.isError ? (
        <p className="section-copy platform-management-message" role="alert">
          Echo could not delete the platform.
          <RequestId error={deleteMutation.error} />
        </p>
      ) : null}
    </li>
  );
}

function buildUpdateInput(
  platform: PlatformConnection,
  form: {
    displayName: string;
    enabled: boolean;
    credentialToken: string;
  }
): UpdatePlatformInput | null {
  const input: UpdatePlatformInput = {};
  const displayName = form.displayName.trim();
  const credentialToken = form.credentialToken.trim();

  if (displayName !== platform.displayName) {
    input.displayName = displayName;
  }
  if (form.enabled !== platform.enabled) {
    input.enabled = form.enabled;
  }
  if (credentialToken !== "") {
    input.credentials = { accessToken: credentialToken };
  }

  return Object.keys(input).length > 0 ? input : null;
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

function isOAuthUnavailable(error: unknown): boolean {
  return error instanceof ApiError && error.status === 503;
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
