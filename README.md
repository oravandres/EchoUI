# EchoUI

**EchoUI** is the React/TypeScript frontend for the Echo social media proxy service. It provides a modern, responsive dashboard for managing social media posts and tracking engagement statistics.

## Architecture

EchoUI is a single-page application built with React 19, TypeScript, and Vite. It communicates with the Echo backend over HTTP and uses TanStack Query for data fetching and caching.

## Quick Start

```bash
# Install dependencies
npm install

# Start dev server (port 5174)
npm run dev

# Build for production
npm run build

# Run tests
npm test

# Lint
npm run lint
```

## Environment Variables

| Variable | Default (dev) | Description |
|---|---|---|
| `VITE_ECHO_API_BASE_URL` | `http://localhost:8001` | Echo API base URL (no trailing slash) |

Copy `.env.example` to `.env.development` to customize.

## Project Structure

```
src/
├── api/           API client, error types, React Query setup
├── components/    Reusable UI components
├── pages/         Route-level page components
├── test/          Test setup and utilities
├── index.css      Design system and global styles
├── main.tsx       App entry point
└── router.tsx     React Router configuration
```

## Routes

- `/` — dashboard with API health and platform status summary
- `/posts` — post history with admin-session publishing and deletion controls
- `/posts/:id` — post detail with persisted status and latest public engagement metrics
- `/platforms` — connected platform status, connection health, and admin-session platform management
- `/stats` — aggregate post, platform, latest engagement, and engagement trend summary

The post composer renders a selected-platform preview before publish so admins
can review copy and platform targets without sending a request.

Admin-session actions show dismissible success and failure notifications. Failure
messages use stable UI copy and include an Echo request ID when the API provides
one.

The app shell includes a persisted dark/light theme toggle stored in the
browser, so the selected theme survives reloads.

## Design

- **Dark and light themes** with glassmorphism effects
- **Teal-to-indigo** gradient accent palette
- **Inter** typeface from Google Fonts
- Micro-animations and smooth transitions
- Dismissible operation notifications
- Fully responsive (mobile → desktop)
