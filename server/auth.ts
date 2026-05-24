import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { anonymous } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { db } from "../db/index.js";
import { userCards } from "../db/schema/user-cards.js";
import * as schema from "../db/schema/index.js";
import { config } from "../config/index.js";

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
        await db
          .update(userCards)
          .set({ userId: newUser.user.id })
          .where(eq(userCards.userId, anonymousUser.user.id));
      },
    }),
  ],
  session: {
    expiresIn: 30 * 24 * 60 * 60,
  },
});
