/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Django API root, including the /api prefix. Defaults to /api (Vite proxy). */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
