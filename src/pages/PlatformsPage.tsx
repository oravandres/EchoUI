import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import {
  type PlatformConnection,
  type PlatformStatus,
  listPlatforms,
} from "@/api/platforms";

const statusLabels: Record<PlatformStatus, string> = {
  healthy: "Healthy",
  unhealthy: "Unhealthy",
  unknown: "Unknown",
};

export function PlatformsPage() {
  const platformsQuery = useQuery({
    queryKey: ["platforms", "list"],
    queryFn: ({ signal }) => listPlatforms({ signal }),
    refetchInterval: 30_000,
  });

  const platforms = platformsQuery.data?.data;
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
