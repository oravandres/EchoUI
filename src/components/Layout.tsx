import { Outlet, NavLink } from "react-router";

export function Layout() {
  return (
    <div className="app-layout">
      <aside className="sidebar" id="sidebar-nav">
        <div className="sidebar-brand">
          <div className="brand-icon">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="14" cy="14" r="12" stroke="url(#brand-gradient)" strokeWidth="2.5" fill="none" />
              <path d="M9 14C9 11 11 8 14 8C17 8 19 10 19 12C19 14 17 15 15 15C13 15 12 16 12 18" stroke="url(#brand-gradient)" strokeWidth="2" strokeLinecap="round" fill="none" />
              <circle cx="12" cy="21" r="1.5" fill="url(#brand-gradient)" />
              <defs>
                <linearGradient id="brand-gradient" x1="0" y1="0" x2="28" y2="28">
                  <stop offset="0%" stopColor="var(--accent-primary)" />
                  <stop offset="100%" stopColor="var(--accent-secondary)" />
                </linearGradient>
              </defs>
            </svg>
          </div>
          <span className="brand-name">Echo</span>
        </div>

        <nav className="sidebar-nav" aria-label="Main">
          <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} id="nav-dashboard">
            <span className="nav-icon">◉</span>
            <span>Dashboard</span>
          </NavLink>
          <NavLink to="/platforms" className={({ isActive }) => `nav-link ${isActive ? "active" : ""}`} id="nav-platforms">
            <span className="nav-icon">🌐</span>
            <span>Platforms</span>
          </NavLink>
        </nav>

        <div className="sidebar-footer">
          <div className="status-indicator" id="api-status">
            <span className="status-dot" />
            <span className="status-text">Echo API</span>
          </div>
        </div>
      </aside>

      <main className="main-content" id="main-content">
        <Outlet />
      </main>
    </div>
  );
}
