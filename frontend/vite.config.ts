import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
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
