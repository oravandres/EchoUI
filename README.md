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
- `/posts/:id` — post detail with persisted status and engagement placeholder
- `/platforms` — connected platform status, connection health, and admin-session platform management
- `/stats` — aggregate post and platform status summary

## Design

- **Dark theme** with glassmorphism effects
- **Teal-to-indigo** gradient accent palette
- **Inter** typeface from Google Fonts
- Micro-animations and smooth transitions
- Fully responsive (mobile → desktop)
