import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      "/admin": { target: "http://127.0.0.1:8080", changeOrigin: true },
    },
  },
  // 前台站点 origin，供复制 /vehicles/{id}。部署时用环境变量 VITE_PUBLIC_WEB_ORIGIN 覆盖。
});
