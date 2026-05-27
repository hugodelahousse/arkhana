import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { anonymous, username } from "better-auth/plugins";
import { passkey } from "@better-auth/passkey";
import { db } from "../db/index.js";
import * as schema from "../db/schema/index.js";
import { config } from "../config/index.js";
import { migrateAnonymousPulls } from "./anonymous-migration.js";
import { sendEmail } from "./email.js";

const BRAND = {
  bgOuter: "#0a0a0f",
  bgCard: "#13131a",
  bgButton: "#a855f7",
  text: "#e8e4de",
  textMuted: "#b0aca6",
  accent: "#a855f7",
  border: "#303038",
  fontSerif: "Georgia, 'Times New Roman', serif",
  fontSans: "'Helvetica Neue', Helvetica, Arial, sans-serif",
} as const;

function resetPasswordHtml(url: string) {
  const b = BRAND;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="dark">
<meta name="supported-color-schemes" content="dark">
<title>Reset your Arkhana password</title>
</head>
<body style="margin:0;padding:0;background-color:${b.bgOuter};color:${b.text};font-family:${b.fontSans};-webkit-font-smoothing:antialiased">
<!--[if mso]><table width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td align="center"><![endif]-->
<div style="max-width:480px;margin:0 auto;padding:40px 16px">

  <!-- Preheader (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;mso-hide:all">
    Choose a new password and return to your arkhive.&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;&#847;
  </div>

  <!-- Card -->
  <div style="background-color:${b.bgCard};border:1px solid ${b.border};border-radius:8px;padding:48px 32px;text-align:center">

    <!-- Logo -->
    <h1 style="margin:0 0 8px;font-family:${b.fontSerif};font-size:28px;font-weight:400;letter-spacing:0.25em;color:${b.text}">ARKHANA</h1>
    <p style="margin:0 0 32px;font-size:11px;letter-spacing:0.2em;text-transform:uppercase;color:${b.textMuted}">Recover your account</p>

    <!-- Divider -->
    <div style="margin:0 auto 32px;width:120px;border-top:1px solid ${b.border};position:relative;height:1px">
      <span style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);background:${b.bgCard};padding:0 12px;color:${b.accent};font-size:14px">&#10022;</span>
    </div>

    <!-- Body -->
    <p style="margin:0 0 8px;font-size:15px;line-height:1.6;color:${b.text}">A password reset was requested for your account.</p>
    <p style="margin:0 0 32px;font-size:15px;line-height:1.6;color:${b.textMuted}">Click below to choose a new password and return to your arkhive.</p>

    <!-- CTA Button -->
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 16px">
      <tr>
        <td style="border-radius:4px;background-color:${b.bgButton}">
          <a href="${url}" target="_blank" style="display:inline-block;padding:14px 40px;font-family:${b.fontSans};font-size:13px;font-weight:600;letter-spacing:0.15em;text-transform:uppercase;color:#ffffff;text-decoration:none;border-radius:4px">Reset Password</a>
        </td>
      </tr>
    </table>

    <p style="margin:0 0 32px;font-size:12px;color:${b.textMuted}">This link expires in 1 hour.</p>

    <!-- Divider -->
    <div style="margin:0 auto 24px;width:120px;border-top:1px solid ${b.border};position:relative;height:1px">
      <span style="position:absolute;top:-8px;left:50%;transform:translateX(-50%);background:${b.bgCard};padding:0 12px;color:${b.accent};font-size:14px">&#10022;</span>
    </div>

    <!-- Footer -->
    <p style="margin:0;font-size:12px;line-height:1.5;color:${b.textMuted}">If you didn't request this, you can safely ignore this email. Your password will remain unchanged.</p>
  </div>

  <!-- Outer footer -->
  <p style="margin:24px 0 0;text-align:center;font-size:11px;color:${b.textMuted};opacity:0.5">Arkhana</p>

</div>
<!--[if mso]></td></tr></table><![endif]-->
</body>
</html>`;
}

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
      sendEmail({
        to: user.email,
        subject: "Reset your Arkhana password",
        text: `Reset your Arkhana password\n\nA password reset was requested for your account. Visit this link to choose a new password:\n\n${url}\n\nThis link will expire in 1 hour. If you didn't request this, you can safely ignore this email.\n\n— Arkhana`,
        html: resetPasswordHtml(url),
      }).catch((err) => console.error("[email] Failed to send:", err));
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
