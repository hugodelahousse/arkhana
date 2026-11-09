import { loadEnvFile } from "node:process";

import type { Config } from "drizzle-kit";

try {
  loadEnvFile(".env");
} catch (error) {
  if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
    throw error;
  }
}

export default {
  schema: "./db/schema/index.ts",
  out: "./migrations",
  dialect: "postgresql",
  dbCredentials: {
    url:
      process.env.DATABASE_URL ??
      "postgresql://arkhana:arkhana@localhost:5432/arkhana",
  },
} satisfies Config;
