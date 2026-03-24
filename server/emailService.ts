/**
 * Email service using Resend for sending transactional emails to book club members.
 * Respects user emailNotifications preference.
 */
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

// Use onboarding@resend.dev for free tier, or custom domain if configured
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Book Club <onboarding@resend.dev>";

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send a single email via Resend.
 */
export async function sendEmail(opts: EmailOptions): Promise<boolean> {
  try {
    const { error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: Array.isArray(opts.to) ? opts.to : [opts.to],
      subject: opts.subject,
      html: opts.html,
      text: opts.text,
    });
    if (error) {
      console.warn("[Email] Resend error:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Email] Failed to send:", err);
    return false;
  }
}

/**
 * Send email notifications to multiple members.
 * Filters out members without email or with emailNotifications disabled.
 */
export async function sendBulkEmails(opts: {
  members: Array<{ email: string | null; name: string | null; emailNotifications?: boolean }>;
  subject: string;
  htmlBuilder: (member: { email: string; name: string | null }) => string;
  textBuilder?: (member: { email: string; name: string | null }) => string;
}): Promise<{ sent: number; skipped: number }> {
  const eligible = opts.members.filter(
    (m): m is typeof m & { email: string } =>
      !!m.email && m.emailNotifications !== false
  );

  if (eligible.length === 0) {
    return { sent: 0, skipped: opts.members.length };
  }

  let sent = 0;
  let skipped = 0;

  // Send individual emails for personalization
  for (const member of eligible) {
    try {
      const success = await sendEmail({
        to: member.email,
        subject: opts.subject,
        html: opts.htmlBuilder(member),
        text: opts.textBuilder?.(member),
      });
      if (success) sent++;
      else skipped++;
    } catch {
      skipped++;
    }
  }

  return { sent, skipped: opts.members.length - sent };
}

/**
 * Build a simple HTML email template for book club notifications.
 */
export function buildNotificationEmail(opts: {
  title: string;
  message: string;
  memberName?: string | null;
  ctaText?: string;
  ctaUrl?: string;
}): string {
  const greeting = opts.memberName ? `Hi ${opts.memberName},` : "Hi there,";
  const cta = opts.ctaUrl && opts.ctaText
    ? `<p style="margin-top:20px;"><a href="${opts.ctaUrl}" style="background-color:#b45309;color:white;padding:10px 24px;text-decoration:none;border-radius:6px;font-weight:600;">${opts.ctaText}</a></p>`
    : "";

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#1a1a1a;background-color:#faf8f5;">
  <div style="background-color:white;border-radius:12px;padding:32px;border:1px solid #e5e0d8;">
    <h2 style="color:#b45309;margin-top:0;font-size:20px;">${opts.title}</h2>
    <p style="color:#444;line-height:1.6;">${greeting}</p>
    <p style="color:#444;line-height:1.6;">${opts.message.replace(/\n/g, "<br>")}</p>
    ${cta}
  </div>
  <p style="color:#999;font-size:12px;text-align:center;margin-top:20px;">
    Sent from your Book Club. To stop receiving these emails, update your notification preferences in your profile.
  </p>
</body>
</html>`.trim();
}

/**
 * Validate the Resend API key by making a lightweight API call.
 */
export async function validateResendKey(): Promise<boolean> {
  try {
    // List domains is a lightweight call to validate the key
    const { error } = await resend.domains.list();
    if (error) {
      console.warn("[Email] Resend key validation failed:", error);
      return false;
    }
    return true;
  } catch (err) {
    console.warn("[Email] Resend key validation error:", err);
    return false;
  }
}
