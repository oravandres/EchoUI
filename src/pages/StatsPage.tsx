import { useQuery } from "@tanstack/react-query";
import { ApiError } from "@/api/client";
import {
  type PlatformStats,
  type StatsSummary,
  fetchStats,
} from "@/api/stats";

export function StatsPage() {
  const statsQuery = useQuery({
    queryKey: ["stats", "summary"],
    queryFn: ({ signal }) => fetchStats({ signal }),
    refetchInterval: 30_000,
  });

  const summary = statsQuery.data?.data;
  const hasData = summary !== undefined;
  const refreshError = statsQuery.isError && hasData;

  return (
    <div className="page-container" id="stats-page">
      <header className="page-header">
        <h1 className="page-title">Statistics</h1>
        <p className="page-subtitle">Aggregate post and platform status</p>
      </header>

      {refreshError ? (
        <p
          className="status-banner status-banner-warning"
          role="status"
          aria-label="Could not refresh statistics. Showing last known data."
        >
          Could not refresh statistics. Showing last known data.
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
    </div>
  );
}

function StatsSummaryView({ summary }: { summary: StatsSummary }) {
  const generatedAt = formatDate(summary.generatedAt);

  return (
    <>
      <div className="stats-grid" id="statistics-overview">
        <StatCard label="Posts" value={`${summary.posts.total.toLocaleString()} total`} tone="success" />
        <StatCard label="Published" value={summary.posts.published.toLocaleString()} tone="success" />
        <StatCard label="Failed" value={summary.posts.failed.toLocaleString()} tone={summary.posts.failed > 0 ? "warning" : "muted"} />
        <StatCard label="Platforms" value={`${summary.platforms.enabled.toLocaleString()} enabled`} tone={summary.platforms.enabled > 0 ? "success" : "muted"} />
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
                    {item.connections.total.toLocaleString()} connections
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
