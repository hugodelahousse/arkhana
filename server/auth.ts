import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { anonymous, username } from "better-auth/plugins";
import { db } from "../db/index.js";
import * as schema from "../db/schema/index.js";
import { config } from "../config/index.js";
import { migrateAnonymousPulls } from "./anonymous-migration.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  secret: config.betterAuthSecret,
  baseURL: config.betterAuthUrl,
  emailAndPassword: {
    enabled: true,
  },
  plugins: [
    anonymous({
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        await migrateAnonymousPulls(anonymousUser.user.id, newUser.user.id);
      },
    }),
    username({
      minUsernameLength: 3,
      maxUsernameLength: 30,
    }),
  ],
  session: {
    expiresIn: 30 * 24 * 60 * 60,
  },
});
