import nodemailer from "nodemailer";
import { config } from "../config/index.js";

const hasAuth = config.smtpUser && config.smtpPass;

const transporter = config.smtpHost
  ? nodemailer.createTransport({
      host: config.smtpHost,
      port: config.smtpPort,
      secure: config.smtpPort === 465,
      ...(hasAuth ? { auth: { user: config.smtpUser, pass: config.smtpPass } } : {}),
      tls: { rejectUnauthorized: hasAuth },
      ...(!hasAuth ? { ignoreTLS: true } : {}),
    })
  : null;

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  if (!transporter) {
    console.warn("[email] SMTP not configured — would have sent:", opts.subject, "to", opts.to);
    console.warn("[email] URL/content:", opts.text);
    return;
  }
  await transporter.sendMail({ from: config.emailFrom, ...opts });
}
