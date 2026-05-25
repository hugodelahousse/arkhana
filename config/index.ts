import { z } from "zod";

const schema = z.object({
  DATABASE_URL: z.string().url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  BETTER_AUTH_URL: z.string().url(),
  PORT: z.coerce.number().default(3000),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().default("mailto:admin@arkhana.app"),
});

const parsed = schema.parse(process.env);

export const config = {
  databaseUrl: parsed.DATABASE_URL,
  betterAuthSecret: parsed.BETTER_AUTH_SECRET,
  betterAuthUrl: parsed.BETTER_AUTH_URL,
  port: parsed.PORT,
  nodeEnv: parsed.NODE_ENV,
  vapidPublicKey: parsed.VAPID_PUBLIC_KEY,
  vapidPrivateKey: parsed.VAPID_PRIVATE_KEY,
  vapidSubject: parsed.VAPID_SUBJECT,
};
