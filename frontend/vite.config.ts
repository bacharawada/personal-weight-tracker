import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";
import path from "path";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: "auto",
      manifest: {
        name: "Weight Tracker",
        short_name: "Weight Tracker",
        description: "Track and analyze your weight over time.",
        theme_color: "#2563eb",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/",
        scope: "/",
        icons: [
          { src: "pwa-192x192.png", sizes: "192x192", type: "image/png", purpose: "any" },
          { src: "pwa-512x512.png", sizes: "512x512", type: "image/png", purpose: "any" },
          {
            src: "pwa-maskable-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "maskable",
          },
          {
            src: "pwa-maskable-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
      includeAssets: ["favicon.svg", "apple-touch-icon.png"],
      workbox: {
        // SPA fallback for client-side routing, but never for API calls —
        // an unmatched /api/* request must surface as a real network
        // error, not silently resolve to index.html.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Read-only, non-sensitive GETs only: never auth, /api/me, or
            // any mutating request. NetworkFirst keeps data fresh online
            // and falls back to the last-cached response when offline.
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              (url.pathname === "/api/measurements" ||
                url.pathname === "/api/stats" ||
                url.pathname.startsWith("/api/charts/") ||
                url.pathname === "/api/goal"),
            handler: "NetworkFirst",
            options: {
              cacheName: "api-read-cache",
              networkTimeoutSeconds: 10,
              cacheableResponse: { statuses: [0, 200] },
              expiration: { maxEntries: 50, maxAgeSeconds: 60 * 60 * 24 },
            },
          },
        ],
      },
      // Keep the SW out of `npm run dev` entirely — it must never
      // interfere with Vite's own HMR/dev workflow.
      devOptions: {
        enabled: false,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
    // Force polling because inotify file watching does not work on
    // Windows NTFS mounts in WSL2. Polling interval of 300ms is a
    // reasonable balance between responsiveness and CPU usage.
    watch: {
      usePolling: true,
      interval: 300,
    },
  },
});
