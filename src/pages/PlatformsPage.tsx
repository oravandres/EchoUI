import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import {
  type PlatformConnection,
  type PlatformStatus,
  listPlatforms,
} from "@/api/platforms";

const statusLabels: Record<PlatformStatus, string> = {
  healthy: "Healthy",
  degraded: "Degraded",
  disconnected: "Disconnected",
  unknown: "Unknown",
};

export function PlatformsPage() {
  const platformsQuery = useQuery({
    queryKey: ["platforms", "list"],
    queryFn: ({ signal }) => listPlatforms({ signal }),
    refetchInterval: 30_000,
  });

  const platforms = platformsQuery.data?.items;
  const hasData = platforms !== undefined;
  const refreshError = platformsQuery.isError && hasData;

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
            Echo could not load platform connections. Try again after the API is
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

function PlatformCard({ platform }: { platform: PlatformConnection }) {
  const statusLabel = statusLabels[platform.status];
  const checkedAt = platform.last_checked_at
    ? formatCheckedAt(platform.last_checked_at)
    : null;
  return (
    <li className="platform-card glass">
      <div className="platform-card-header">
        <div>
          <h2 className="platform-name">{platform.display_name}</h2>
          <p className="platform-meta">
            {platform.platform}
            {platform.account_handle ? ` - ${platform.account_handle}` : ""}
          </p>
        </div>
        <span className={`status-badge status-badge-${platform.status}`}>
          {statusLabel}
        </span>
      </div>

      {platform.message ? (
        <p className="platform-message">{platform.message}</p>
      ) : null}

      <p className="platform-checked">
        Last checked{" "}
        {!platform.last_checked_at ? (
          "not yet"
        ) : checkedAt ? (
          <time dateTime={platform.last_checked_at}>
            {checkedAt}
          </time>
        ) : (
          "unknown"
        )}
      </p>
    </li>
  );
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
