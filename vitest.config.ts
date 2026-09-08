import { defineConfig } from "vitest/config";
import { loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const hasDb = !!env.DATABASE_URL || !!process.env.DATABASE_URL;

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "~/": fileURLToPath(new URL("./app/", import.meta.url)),
      },
    },
    test: {
      passWithNoTests: true,
      env,
      css: false,
      setupFiles: ["./app/test/setup.ts"],
      exclude: [
        "node_modules/**",
        ".claude/worktrees/**",
        ...(hasDb ? [] : ["server/**/*.test.ts"]),
      ],
    },
  };
});
