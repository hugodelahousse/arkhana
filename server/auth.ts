import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { anonymous, username } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { db } from "../db/index.js";
import * as schema from "../db/schema/index.js";
import { config } from "../config/index.js";
import { migrateAnonymousPulls } from "./anonymous-migration.js";
import { sendEmail } from "./email.js";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema,
  }),
  secret: config.betterAuthSecret,
  baseURL: config.betterAuthUrl,
  emailAndPassword: {
    enabled: true,
    sendResetPassword: async ({ user, url }) => {
      void sendEmail({
        to: user.email,
        subject: "Reset your Arkhana password",
        text: `Reset your password: ${url}`,
        html: [
          "<div style=\"font-family:sans-serif;max-width:480px;margin:0 auto;padding:40px 20px;color:#e0d6c8;background:#0d0b0e\">",
          "<h1 style=\"font-size:24px;letter-spacing:0.2em;text-align:center;color:#c4a882\">ARKHANA</h1>",
          "<p style=\"text-align:center;margin:24px 0\">A password reset was requested for your account.</p>",
          `<p style="text-align:center"><a href="${url}" style="display:inline-block;padding:12px 32px;border:1px solid #c4a882;color:#c4a882;text-decoration:none;letter-spacing:0.15em;text-transform:uppercase;font-size:13px">Reset Password</a></p>`,
          "<p style=\"text-align:center;font-size:12px;opacity:0.5;margin-top:32px\">If you didn't request this, ignore this email.</p>",
          "</div>",
        ].join(""),
      });
    },
    revokeSessionsOnPasswordReset: true,
  },
  rateLimit: {
    window: 60,
    max: 10,
  },
  plugins: [
    anonymous({
      onLinkAccount: async ({ anonymousUser, newUser }) => {
        await migrateAnonymousPulls(anonymousUser.user.id, newUser.user.id);
      },
    }),
    username({
      minUsernameLength: 1,
      maxUsernameLength: 30,
    }),
    passkey(),
  ],
  session: {
    expiresIn: 30 * 24 * 60 * 60,
  },
});
