import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    passWithNoTests: true,
    // Integration tests that require a live DATABASE_URL are excluded from the
    // default CI run. Run them manually with DATABASE_URL set.
    exclude: [
      "**/node_modules/**",
      "**/*.integration.test.*",
      "server/anonymous-migration.test.ts",
    ],
  },
});
