import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globalSetup: ["./test/preparer-base.ts"],
    fileParallelism: false,
    testTimeout: 20000,
    hookTimeout: 60000,
  },
});
