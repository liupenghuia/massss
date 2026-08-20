import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const repoRoot = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "..");

export default defineConfig({
  plugins: [react()],
  server: {
    host: "127.0.0.1",
    port: 5174,
    fs: { allow: [repoRoot] },
    proxy: {
      "/admin": { target: "http://127.0.0.1:8080", changeOrigin: true },
    },
  },
  // 前台站点 origin，供复制 /vehicles/{id}。部署时用环境变量 VITE_PUBLIC_WEB_ORIGIN 覆盖。
});
