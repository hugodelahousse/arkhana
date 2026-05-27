import { Resend } from "resend";
import { config } from "../config/index.js";

const resend = config.resendApiKey ? new Resend(config.resendApiKey) : null;

export async function sendEmail(opts: {
  to: string;
  subject: string;
  text: string;
  html?: string;
}) {
  if (!resend) {
    console.warn("[email] RESEND_API_KEY not configured — would have sent:", opts.subject, "to", opts.to);
    console.warn("[email] URL/content:", opts.text);
    return;
  }

  const { error } = await resend.emails.send({
    from: config.emailFrom,
    to: opts.to,
    subject: opts.subject,
    text: opts.text,
    html: opts.html,
  });

  if (error) {
    throw new Error(`[email] Resend error: ${error.message}`);
  }
}
