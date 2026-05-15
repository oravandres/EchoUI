# EchoUI — Implementation Plan

## Overview

EchoUI is the React/TypeScript frontend for the Echo social media proxy service.
It provides a modern, responsive dashboard for managing social media posts and
tracking engagement statistics across platforms. It talks to the Echo backend
over HTTP, not to databases directly.

EchoUI follows the same architecture and tooling as LogosUI for consistency
across the MiMi ecosystem.

---

## 1. Repository Landscape

| Repo | Role for EchoUI |
|------|-----------------|
| **EchoUI** (this repo) | Frontend source code, Dockerfile, tests |
| **Echo** | Backend API (Go service) |
| **MiMi** | Kubernetes manifests (Deployment, Service, Ingress, Argo CD Application) |

---

## 2. Tech Stack

| Layer | Choice | Rationale |
|-------|--------|-----------|
| Language | TypeScript ~5.7 | Strict mode, type-safe API integration |
| Framework | React 19 | Component model, hooks, concurrent features |
| Bundler | Vite 6 | Fast HMR, optimized builds, ESM-native |
| Routing | react-router 7 | Standard SPA routing with nested layouts |
| Data fetching | TanStack Query 5 | Caching, deduplication, background refetch |
| Validation | Zod 3 | Runtime parsing of API responses |
| Testing | Vitest + React Testing Library | Fast, jsdom-based component tests |
| Linting | ESLint 9 + typescript-eslint | Flat config, React hooks plugin |
| Styling | Vanilla CSS | Full control, no utility framework dependency |
| Typography | Inter (Google Fonts) | Clean, modern sans-serif |
| Runtime | nginx-unprivileged | Static SPA serving, security headers |

---

## 3. Design System

- **Theme**: Dark mode with deep navy/charcoal surfaces
- **Accents**: Teal-to-indigo gradient (`#06b6d4` → `#8b5cf6`)
- **Effects**: Glassmorphism cards with `backdrop-filter: blur(16px)`
- **Animations**: Fade-in-up page transitions, gradient shifts, pulse indicators
- **Typography**: Inter 300–700 weights
- **Responsive**: Mobile-first, sidebar collapses to horizontal nav on small screens
- **Scrollbar**: Custom styled for consistency

---

## 4. Project Structure

```
EchoUI/
├── src/
│   ├── api/
│   │   ├── client.ts           # fetchJson, postJson, ApiError, NetworkError
│   │   ├── logger.ts           # Structured error logging
│   │   ├── queryClient.ts      # TanStack Query factory with global error hooks
│   │   └── health.ts           # Health endpoint
│   ├── components/
│   │   └── Layout.tsx          # App shell: sidebar + main content area
│   ├── pages/
│   │   └── HomePage.tsx        # Dashboard with stats grid and welcome section
│   ├── test/
│   │   └── setup.ts            # Vitest + RTL cleanup
│   ├── index.css               # Design system: tokens, reset, components
│   ├── main.tsx                # App entry: React Query + Router providers
│   ├── router.tsx              # Route definitions
│   └── vite-env.d.ts           # Env type declarations
├── deploy/
│   └── nginx.conf              # SPA server config with security headers
├── .github/workflows/
│   └── ci.yml                  # lint, type-check, test, build
├── .cursor/rules/              # Coding/architecture rules (from LogosUI)
├── .env.example                # Documented env template
├── Dockerfile                  # multi-stage: node builder → nginx-unprivileged
├── eslint.config.js            # Flat ESLint config
├── index.html                  # HTML entry with Inter font + SEO meta
├── package.json
├── tsconfig.json               # Project references
├── tsconfig.app.json           # App compilation (ES2022, strict, path aliases)
├── tsconfig.node.json          # Vite config compilation
├── vite.config.ts              # Vite + Vitest config, path alias, env validation
├── AGENTS.md
├── PLAN.md
└── README.md
```

---

## 5. Configuration

| Variable | Default (dev) | Required (prod) | Description |
|----------|---------------|-----------------|-------------|
| `VITE_ECHO_API_BASE_URL` | `http://localhost:8001` | Yes | Echo API base URL (no trailing slash) |

Production builds fail at `vite build` time if `VITE_ECHO_API_BASE_URL` is
unset, preventing accidental deploys with a dangling API reference.

---

## 6. Kubernetes Deployment (MiMi repo — Future)

### 6.1 EchoUI (Deployment)

- **nginx-unprivileged** serving static bundle on port 8080.
- **No liveness/readiness probes on the API** — static files, nginx health.

### 6.2 Ingress

- Host: `echo.mimi.local`
- Path `/` → `echo-ui:8080` (SPA)
- Path `/api/v1` → `echo-api:8001` (backend proxy)
- TLS via cert-manager

---

## 7. Implementation Order

| Phase | Scope | Status |
|-------|-------|--------|
| ~~Phase 1~~ | Project skeleton: Vite + React + TypeScript, design system, layout, health check | ✅ Done |
| ~~Phase 2~~ | Platform status page: list connected platforms, connection health, create/update/delete platform connections | ✅ Done |
| ~~Phase 3~~ | Post composer: create and publish posts to multiple platforms | ✅ Done — browser admin sessions unlock publishing without bundling admin tokens |
| Phase 4 | Post list: view published posts, detail status, engagement | ✅ Done — list/detail views show latest stored engagement and admin-session delete controls |
| Phase 5 | Statistics dashboard: service summary, engagement metrics, charts, and trends | Partially done — aggregate status and latest engagement metrics are live; historical charts and trends remain future scope |
| Phase 6 | Kubernetes manifests in MiMi repo | ✅ Done — EchoUI is deployed through MiMi with digest-pinned images |

---

## 8. Pages (Planned)

| Route | Page | Description |
|-------|------|-------------|
| `/` | Dashboard | Stats overview, API health, recent activity |
| `/posts` | Posts | Post history, admin-session composer, and delete controls |
| `/posts/{id}` | Post Detail | Post content, platform status, and latest public engagement metrics |
| `/platforms` | Platforms | Connected accounts, health status, and admin-session platform management |
| `/stats` | Statistics | Aggregate post, platform, and latest public engagement summary |

---

## 9. Open Questions / Future Scope

- **Chart library**: Recharts vs. Chart.js vs. custom SVG for historical stats.
- **Real-time updates**: WebSocket or SSE for live engagement metrics.
- **Post preview**: Render post as it would appear on each platform.
- **Dark/light mode toggle**: Currently dark-only; add theme switcher later.
- **Notifications**: Toast system for post publish success/failure.
