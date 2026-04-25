/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Base URL for the Echo API (e.g. http://localhost:8001). No trailing slash. CORS must allow this UI origin. */
  readonly VITE_ECHO_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
