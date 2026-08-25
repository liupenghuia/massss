import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.integration.test.ts"],
    setupFiles: ["./src/test/integrationSetup.ts"],
    // 走真实 DB 连接，串行执行避免共用测试库时的用例互相污染。
    fileParallelism: false,
  },
});
