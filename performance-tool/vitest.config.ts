import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    // The authz tests hit a real Postgres via DATABASE_URL and share tables;
    // keep them in one worker so fixtures don't race.
    fileParallelism: false,
  },
});
