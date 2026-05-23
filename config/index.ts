import { createConfig } from "@charcoalhq/lockbox";
import { z } from "zod";
import developmentConfig from "./development/generated.js";
import productionConfig from "./production/generated.js";

const schema = z.object({
  databaseUrl: z.string().url(),
  betterAuthSecret: z.string().min(32),
  betterAuthUrl: z.string().url(),
  port: z.coerce.number().default(3000),
  nodeEnv: z
    .enum(["development", "production", "test"])
    .default("development"),
});

const environment = (process.env.NODE_ENV ?? "development") as
  | "development"
  | "production";

export const { config } = await createConfig({
  configs: { development: developmentConfig, production: productionConfig },
  environment,
  privateKey: process.env.LOCKBOX_PRIVATE_KEY,
  schema,
});
