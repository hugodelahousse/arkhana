import type { Config } from "drizzle-kit";

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
