import { useQuery } from "@tanstack/react-query";
import { fetchHealth } from "@/api/health";

export function HomePage() {
  const healthQuery = useQuery({
    queryKey: ["health"],
    queryFn: fetchHealth,
    refetchInterval: 30_000,
  });

  return (
    <div className="page-container" id="home-page">
      <header className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Your social media command center</p>
      </header>

      <div className="stats-grid" id="stats-overview">
        <div className="stat-card glass" id="stat-api-status">
          <div className="stat-icon">⚡</div>
          <div className="stat-content">
            <span className="stat-label">API Status</span>
            <span className={`stat-value ${healthQuery.isSuccess ? "text-success" : healthQuery.isError ? "text-error" : "text-muted"}`}>
              {healthQuery.isLoading && "Checking…"}
              {healthQuery.isSuccess && healthQuery.data.status}
              {healthQuery.isError && "Unreachable"}
            </span>
          </div>
        </div>

        <div className="stat-card glass" id="stat-platforms">
          <div className="stat-icon">🌐</div>
          <div className="stat-content">
            <span className="stat-label">Platforms</span>
            <span className="stat-value text-muted">Coming soon</span>
          </div>
        </div>

        <div className="stat-card glass" id="stat-posts">
          <div className="stat-icon">📝</div>
          <div className="stat-content">
            <span className="stat-label">Posts</span>
            <span className="stat-value text-muted">Coming soon</span>
          </div>
        </div>

        <div className="stat-card glass" id="stat-engagement">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <span className="stat-label">Engagement</span>
            <span className="stat-value text-muted">Coming soon</span>
          </div>
        </div>
      </div>

      <section className="welcome-section glass" id="welcome-banner">
        <div className="welcome-content">
          <h2>Welcome to Echo</h2>
          <p>
            Echo is your secure social media proxy. Manage posts, track engagement,
            and monitor statistics across all your platforms from one place.
          </p>
          <div className="welcome-features">
            <div className="feature-item">
              <span className="feature-icon">🔒</span>
              <div>
                <strong>Secure by Default</strong>
                <p>API keys and tokens never leave the server</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📡</span>
              <div>
                <strong>Multi-Platform</strong>
                <p>Connect multiple social media accounts</p>
              </div>
            </div>
            <div className="feature-item">
              <span className="feature-icon">📈</span>
              <div>
                <strong>Analytics</strong>
                <p>Track post performance and engagement</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
