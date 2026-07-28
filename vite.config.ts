import { defineConfig, loadEnv } from 'vite';
import { fileURLToPath, URL } from 'node:url';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  // Local Django by default; set VITE_DEV_PROXY_TARGET to the Railway URL to
  // develop against the deployed backend. `changeOrigin` is what makes the
  // remote case work — Railway's edge routes on the Host header, so forwarding
  // localhost:5173 would land on the 404 fallback.
  const proxyTarget = env.VITE_DEV_PROXY_TARGET || 'http://localhost:8000';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': fileURLToPath(new URL('./src', import.meta.url)),
      },
    },
    server: {
      port: 5173,
      // Proxy /api calls to the backend (Member 2's REST API). Lets the
      // frontend call `/api/...` without CORS headaches in development.
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
        },
      },
    },
  };
});
