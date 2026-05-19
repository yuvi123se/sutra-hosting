import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/auth": { target: "http://localhost:3001", changeOrigin: true, credentials: true },
      "/bots": { target: "http://localhost:3001", changeOrigin: true, credentials: true },
      "/plans": { target: "http://localhost:3001", changeOrigin: true, credentials: true },
      "/admin": { target: "http://localhost:3001", changeOrigin: true, credentials: true }
    }
  }
});
