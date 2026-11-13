import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import type { ClientRequest } from "node:http";
import { defineConfig } from "vite";

const apiOrigin = process.env.APP_ORIGIN ?? "http://localhost:3000";

// The dev server proxies /api to the Express app so session cookies stay
// first-party (SameSite=Lax) during local development. The browser's Origin is
// normalized to APP_ORIGIN because the proxy itself is same-origin with the app
// and the API rejects state-changing requests from foreign origins.
export default defineConfig({
  plugins: [react(), tailwindcss()],
  build: {
    rollupOptions: {
      output: {
        // Long-lived vendor chunks stay cached while page chunks change.
        manualChunks(id: string) {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("react-multi-date-picker") || id.includes("react-date-object")) return "dates";
          if (id.includes("@tanstack")) return "query";
          if (id.includes("react-router") || id.includes("react-dom") || /[\\/]react[\\/]/.test(id)) {
            return "react";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
    strictPort: true,
    proxy: {
      "/api": {
        target: process.env.API_PROXY_TARGET ?? "http://127.0.0.1:4000",
        changeOrigin: false,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq: ClientRequest) => {
            proxyReq.setHeader("origin", apiOrigin);
          });
        },
      },
    },
  },
});
