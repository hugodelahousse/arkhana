import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const hasDb = !!env.DATABASE_URL || !!process.env.DATABASE_URL;

  return {
    test: {
      environment: "node",
      passWithNoTests: true,
      env,
      exclude: [
        "node_modules/**",
        ".claude/worktrees/**",
        ...(hasDb ? [] : ["server/**/*.test.ts"]),
      ],
    },
  };
});
