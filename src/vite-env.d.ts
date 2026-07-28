/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Django API root, including the /api prefix. Defaults to /api (Vite proxy). */
  readonly VITE_API_BASE_URL?: string;
  /** Read by vite.config.ts only — where the dev server proxies /api. */
  readonly VITE_DEV_PROXY_TARGET?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
