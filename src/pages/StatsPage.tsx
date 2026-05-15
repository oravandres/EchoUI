import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  type AdminSession,
  getAdminSession,
} from "@/api/adminSession";
import { ApiError } from "@/api/client";
import {
  type EngagementHistoryResponse,
  type EngagementHistoryPoint,
  type PlatformStats,
  type StatsSummary,
  fetchEngagementHistory,
  fetchStats,
  refreshStats,
} from "@/api/stats";

const lockedAdminSession: AdminSession = {
  authenticated: false,
  csrfToken: "",
  expiresAt: "",
};

export function StatsPage() {
  const queryClient = useQueryClient();
  const statsQuery = useQuery({
    queryKey: ["stats", "summary"],
    queryFn: ({ signal }) => fetchStats({ signal }),
    refetchInterval: 30_000,
  });
  const engagementHistoryQuery = useQuery({
    queryKey: ["stats", "engagement-history", 30],
    queryFn: ({ signal }) => fetchEngagementHistory({ limit: 30, signal }),
    refetchInterval: 30_000,
  });
  const adminSessionQuery = useQuery({
    queryKey: ["admin", "session"],
    queryFn: ({ signal }) => getAdminSession({ signal }),
    retry: false,
    staleTime: 30_000,
  });

  const summary = statsQuery.data?.data;
  const hasData = summary !== undefined;
  const refreshError = statsQuery.isError && hasData;
  const adminSession = adminSessionQuery.data;
  const isAuthenticated = adminSession?.authenticated === true;
  const csrfToken = isAuthenticated ? adminSession.csrfToken : "";

  const metricsRefreshMutation = useMutation({
    mutationFn: () => {
      if (csrfToken === "") {
        throw new Error("admin session is not available");
      }
      return refreshStats({ csrfToken });
    },
    onError: (error) => {
      if (isAdminAuthError(error)) {
        queryClient.setQueryData(["admin", "session"], lockedAdminSession);
      }
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["stats"] });
      void queryClient.invalidateQueries({ queryKey: ["posts"] });
    },
  });

  return (
    <div className="page-container" id="stats-page">
      <header className="page-header">
        <h1 className="page-title">Statistics</h1>
        <p className="page-subtitle">Aggregate post and platform status</p>
      </header>

      {isAuthenticated ? (
        <div className="stats-action-row">
          <button
            className="secondary-button"
            type="button"
            disabled={metricsRefreshMutation.isPending}
            onClick={() => metricsRefreshMutation.mutate()}
          >
            {metricsRefreshMutation.isPending ? "Refreshing metrics" : "Refresh metrics"}
          </button>
        </div>
      ) : null}

      {refreshError ? (
        <p
          className="status-banner status-banner-warning"
          role="status"
          aria-label="Could not refresh statistics. Showing last known data."
        >
          Could not refresh statistics. Showing last known data.
        </p>
      ) : null}

      {metricsRefreshMutation.isSuccess ? (
        <p className="status-banner status-banner-success" role="status">
          Metric refresh completed:{" "}
          {metricsRefreshMutation.data.data.refreshed.toLocaleString()} refreshed,{" "}
          {metricsRefreshMutation.data.data.failed.toLocaleString()} failed.
        </p>
      ) : null}

      {metricsRefreshMutation.isError ? (
        <p className="status-banner status-banner-warning" role="alert">
          Echo could not refresh metrics.
          <RequestId error={metricsRefreshMutation.error} />
        </p>
      ) : null}

      {!hasData && statsQuery.isPending ? (
        <div
          className="stats-panel glass"
          role="status"
          aria-live="polite"
          aria-label="Loading statistics"
        >
          <div className="post-skeleton" aria-hidden="true" />
          <div className="post-skeleton" aria-hidden="true" />
        </div>
      ) : null}

      {!hasData && statsQuery.isError ? (
        <section className="stats-panel glass" aria-labelledby="stats-error-title">
          <h2 className="section-title" id="stats-error-title">
            Statistics are unavailable
          </h2>
          <p className="section-copy" role="alert">
            Echo could not load statistics. Try again after the API is available.
          </p>
          {statsQuery.error instanceof ApiError && statsQuery.error.requestId ? (
            <p className="request-id">
              Request ID: <code>{statsQuery.error.requestId}</code>
            </p>
          ) : null}
        </section>
      ) : null}

      {summary ? <StatsSummaryView summary={summary} /> : null}
      {summary ? (
        <EngagementHistoryPanel
          history={engagementHistoryQuery.data}
          isError={engagementHistoryQuery.isError}
          isPending={engagementHistoryQuery.isPending}
          error={engagementHistoryQuery.error}
        />
      ) : null}
    </div>
  );
}

function StatsSummaryView({ summary }: { summary: StatsSummary }) {
  const generatedAt = formatDate(summary.generatedAt);
  const lastFetchedAt = summary.engagement.lastFetchedAt
    ? formatDate(summary.engagement.lastFetchedAt)
    : null;

  return (
    <>
      <div className="stats-grid" id="statistics-overview">
        <StatCard label="Posts" value={`${summary.posts.total.toLocaleString()} total`} tone="success" />
        <StatCard label="Published" value={summary.posts.published.toLocaleString()} tone="success" />
        <StatCard label="Failed" value={summary.posts.failed.toLocaleString()} tone={summary.posts.failed > 0 ? "warning" : "muted"} />
        <StatCard label="Engagement" value={`${summary.engagement.postsMeasured.toLocaleString()} measured`} tone={summary.engagement.postsMeasured > 0 ? "success" : "muted"} />
      </div>

      <section className="stats-panel glass" aria-labelledby="post-stats-title">
        <div className="section-header-row">
          <h2 className="section-title" id="post-stats-title">
            Post status
          </h2>
          {generatedAt ? (
            <p className="section-copy">
              Updated <time dateTime={summary.generatedAt}>{generatedAt}</time>
            </p>
          ) : null}
        </div>
        <StatsMeterGroup
          total={summary.posts.total}
          items={[
            ["Published", summary.posts.published, "success"],
            ["Pending", summary.posts.pending, "warning"],
            ["Failed", summary.posts.failed, "error"],
            ["Deleted", summary.posts.deleted, "muted"],
          ]}
        />
      </section>

      <section className="stats-panel glass" aria-labelledby="platform-stats-title">
        <h2 className="section-title" id="platform-stats-title">
          Platform health
        </h2>
        <PlatformStatsView stats={summary.platforms} />
      </section>

      <section className="stats-panel glass" aria-labelledby="engagement-stats-title">
        <div className="section-header-row">
          <h2 className="section-title" id="engagement-stats-title">
            Engagement
          </h2>
          {lastFetchedAt ? (
            <p className="section-copy">
              Fetched <time dateTime={summary.engagement.lastFetchedAt}>{lastFetchedAt}</time>
            </p>
          ) : null}
        </div>
        {summary.engagement.postsMeasured === 0 ? (
          <p className="section-copy">No public engagement metrics have been stored yet.</p>
        ) : (
          <EngagementStatsView summary={summary} />
        )}
      </section>

      <section className="stats-panel glass" aria-labelledby="platform-breakdown-title">
        <h2 className="section-title" id="platform-breakdown-title">
          By platform
        </h2>
        {summary.byPlatform.length === 0 ? (
          <p className="section-copy">No platform activity has been recorded yet.</p>
        ) : (
          <ul className="stats-breakdown-list" role="list">
            {summary.byPlatform.map((item) => (
              <li className="stats-breakdown-item" key={item.platform}>
                <div>
                  <h3>{item.platform}</h3>
                  <p>
                    {item.posts.total.toLocaleString()} posts,{" "}
                    {item.connections.total.toLocaleString()} connections,{" "}
                    {formatCompactNumber(item.engagement.impressionCount)} impressions
                  </p>
                </div>
                <span
                  className={`status-badge ${
                    item.connections.enabled > 0
                      ? "status-badge-healthy"
                      : "status-badge-disabled"
                  }`}
                >
                  {item.connections.enabled.toLocaleString()} enabled
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}

function EngagementHistoryPanel({
  history,
  isError,
  isPending,
  error,
}: {
  history: EngagementHistoryResponse | undefined;
  isError: boolean;
  isPending: boolean;
  error: unknown;
}) {
  const items = history?.data.items ?? [];
  const hasHistory = items.length > 0;
  const cachedRefreshError = isError && history !== undefined;

  return (
    <section className="stats-panel glass" aria-labelledby="engagement-history-title">
      <div className="section-header-row">
        <h2 className="section-title" id="engagement-history-title">
          Engagement trend
        </h2>
        {history ? (
          <p className="section-copy">
            Updated <time dateTime={history.data.generatedAt}>{formatDate(history.data.generatedAt)}</time>
          </p>
        ) : null}
      </div>

      {cachedRefreshError ? (
        <p className="status-banner status-banner-warning" role="status">
          Could not refresh engagement history. Showing last known trend.
          <RequestId error={error} />
        </p>
      ) : null}

      {!hasHistory && isPending ? (
        <div
          className="engagement-history-loading"
          role="status"
          aria-label="Loading engagement history"
        >
          <div className="post-skeleton" aria-hidden="true" />
        </div>
      ) : null}

      {!hasHistory && isError ? (
        <p className="section-copy" role="alert">
          Engagement history is unavailable.
          <RequestId error={error} />
        </p>
      ) : null}

      {hasHistory ? <EngagementTrendChart items={items} /> : null}
    </section>
  );
}

function EngagementTrendChart({ items }: { items: EngagementHistoryPoint[] }) {
  if (items.length === 1) {
    const only = items[0];
    return (
      <div className="engagement-trend-single">
        <p className="section-copy">
          One metric snapshot is stored.
        </p>
        <dl className="trend-summary-list">
          <div>
            <dt>Impressions</dt>
            <dd>{only.impressionCount.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Likes</dt>
            <dd>{only.likeCount.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Measured posts</dt>
            <dd>{only.postsMeasured.toLocaleString()}</dd>
          </div>
        </dl>
      </div>
    );
  }

  const first = items[0];
  const last = items[items.length - 1];
  const points = chartPoints(items);
  const path = points.map((point) => `${point.x},${point.y}`).join(" ");
  const delta = last.impressionCount - first.impressionCount;
  const titleId = "engagement-trend-chart-title";
  const descId = "engagement-trend-chart-desc";
  const firstFetchedAt = formatDate(first.fetchedAt) ?? "the first snapshot";
  const lastFetchedAt = formatDate(last.fetchedAt) ?? "the latest snapshot";

  return (
    <div className="engagement-trend">
      <svg
        className="engagement-trend-chart"
        viewBox="0 0 640 220"
        role="img"
        aria-labelledby={`${titleId} ${descId}`}
        preserveAspectRatio="none"
      >
        <title id={titleId}>Impressions trend</title>
        <desc id={descId}>
          Impressions from {firstFetchedAt} to {lastFetchedAt}.
        </desc>
        <line className="engagement-chart-grid" x1="32" x2="608" y1="36" y2="36" />
        <line className="engagement-chart-grid" x1="32" x2="608" y1="110" y2="110" />
        <line className="engagement-chart-grid" x1="32" x2="608" y1="184" y2="184" />
        <polyline className="engagement-chart-line" points={path} />
        {points.map((point, index) => (
          <circle
            className="engagement-chart-point"
            key={`${items[index].fetchedAt}-${index}`}
            cx={point.x}
            cy={point.y}
            r="4"
          >
            <title>
              {formatDate(items[index].fetchedAt)}: {items[index].impressionCount.toLocaleString()} impressions
            </title>
          </circle>
        ))}
      </svg>
      <dl className="trend-summary-list">
        <div>
          <dt>Latest impressions</dt>
          <dd>{last.impressionCount.toLocaleString()}</dd>
        </div>
        <div>
          <dt>Change</dt>
          <dd>{formatSignedNumber(delta)}</dd>
        </div>
        <div>
          <dt>Snapshots</dt>
          <dd>{items.length.toLocaleString()}</dd>
        </div>
      </dl>
    </div>
  );
}

function EngagementStatsView({ summary }: { summary: StatsSummary }) {
  return (
    <dl className="detail-list">
      <div>
        <dt>Measured posts</dt>
        <dd>{summary.engagement.postsMeasured.toLocaleString()}</dd>
      </div>
      <div>
        <dt>Likes</dt>
        <dd>{summary.engagement.likeCount.toLocaleString()}</dd>
      </div>
      <div>
        <dt>Replies</dt>
        <dd>{summary.engagement.replyCount.toLocaleString()}</dd>
      </div>
      <div>
        <dt>Reposts</dt>
        <dd>{summary.engagement.repostCount.toLocaleString()}</dd>
      </div>
      <div>
        <dt>Quotes</dt>
        <dd>{summary.engagement.quoteCount.toLocaleString()}</dd>
      </div>
      <div>
        <dt>Bookmarks</dt>
        <dd>{summary.engagement.bookmarkCount.toLocaleString()}</dd>
      </div>
      <div>
        <dt>Impressions</dt>
        <dd>{summary.engagement.impressionCount.toLocaleString()}</dd>
      </div>
    </dl>
  );
}

function StatCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone: "success" | "warning" | "muted";
}) {
  const toneClass = tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-muted";
  return (
    <div className="stat-card glass">
      <div className="stat-content">
        <span className="stat-label">{label}</span>
        <span className={`stat-value ${toneClass}`}>{value}</span>
      </div>
    </div>
  );
}

function PlatformStatsView({ stats }: { stats: PlatformStats }) {
  return (
    <StatsMeterGroup
      total={stats.total}
      items={[
        ["Healthy", stats.healthy, "success"],
        ["Unhealthy", stats.unhealthy, "error"],
        ["Unknown", stats.unknown, "warning"],
        ["Disabled", stats.disabled, "muted"],
      ]}
    />
  );
}

function StatsMeterGroup({
  total,
  items,
}: {
  total: number;
  items: Array<[string, number, "success" | "warning" | "error" | "muted"]>;
}) {
  return (
    <dl className="stats-meter-list">
      {items.map(([label, value, tone]) => (
        <div className="stats-meter-row" key={label}>
          <dt>{label}</dt>
          <dd>
            <span>{value.toLocaleString()}</span>
            <span className="stats-meter-track" aria-hidden="true">
              <span
                className={`stats-meter-fill stats-meter-${tone}`}
                style={{ width: `${percentage(value, total)}%` }}
              />
            </span>
          </dd>
        </div>
      ))}
    </dl>
  );
}

function percentage(value: number, total: number): number {
  if (total <= 0) return 0;
  return Math.round((value / total) * 100);
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

function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat(undefined, {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatSignedNumber(value: number): string {
  if (value === 0) return "0";
  return `${value > 0 ? "+" : ""}${value.toLocaleString()}`;
}

function chartPoints(items: EngagementHistoryPoint[]): Array<{ x: number; y: number }> {
  const width = 640;
  const height = 220;
  const paddingX = 32;
  const paddingY = 28;
  const max = Math.max(...items.map((item) => item.impressionCount));
  const min = Math.min(...items.map((item) => item.impressionCount));
  const span = Math.max(1, max - min);
  const usableWidth = width - paddingX * 2;
  const usableHeight = height - paddingY * 2;
  const lastIndex = Math.max(1, items.length - 1);

  return items.map((item, index) => ({
    x: paddingX + (index / lastIndex) * usableWidth,
    y: paddingY + (1 - (item.impressionCount - min) / span) * usableHeight,
  }));
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
