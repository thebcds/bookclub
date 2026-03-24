/**
 * Notification helpers for email (Resend) and Google Chat webhook integrations.
 * These complement the in-app notification system and the owner notifyOwner helper.
 */
import { notifyOwner } from "./_core/notification";
import * as db from "./db";
import { sendBulkEmails, buildNotificationEmail } from "./emailService";

// ─── Email Notifications ────────────────────────────────────────────

/**
 * Send email notifications to group members who have email notifications enabled.
 * Uses Resend to send individual personalized emails to each eligible member.
 * Falls back to owner notification if Resend is not configured.
 */
export async function notifyGroupByEmail(opts: {
  groupId: number;
  title: string;
  content: string;
  ctaText?: string;
  ctaUrl?: string;
  excludeUserId?: number;
}) {
  try {
    // Always notify the owner via the built-in channel
    await notifyOwner({ title: opts.title, content: opts.content });
  } catch {
    // Owner notification is best-effort
  }

  // Send individual emails to members via Resend
  try {
    if (!process.env.RESEND_API_KEY) {
      console.warn("[Email] RESEND_API_KEY not configured, skipping member emails");
      return false;
    }
    const members = await db.getGroupMembers(opts.groupId);
    const eligible = members.filter(m => m.id !== opts.excludeUserId);
    
    const result = await sendBulkEmails({
      members: eligible,
      subject: opts.title,
      htmlBuilder: (member) => buildNotificationEmail({
        title: opts.title,
        message: opts.content,
        memberName: member.name,
        ctaText: opts.ctaText,
        ctaUrl: opts.ctaUrl,
      }),
      textBuilder: (member) => {
        const greeting = member.name ? `Hi ${member.name},` : "Hi there,";
        return `${greeting}\n\n${opts.content}\n\n---\nSent from your Book Club. Update notification preferences in your profile to stop receiving these emails.`;
      },
    });
    
    console.log(`[Email] Sent ${result.sent} emails, skipped ${result.skipped}`);
    return result.sent > 0;
  } catch (err) {
    console.warn("[Email] Failed to send member emails:", err);
    return false;
  }
}

// ─── Google Chat Webhook ────────────────────────────────────────────

/**
 * Post a message to a Google Chat space via webhook URL.
 * Google Chat webhooks accept a simple JSON payload with a "text" field.
 * @see https://developers.google.com/workspace/chat/quickstart/webhooks
 */
export async function postToGoogleChat(opts: {
  webhookUrl: string;
  text: string;
}) {
  try {
    const response = await fetch(opts.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=UTF-8" },
      body: JSON.stringify({ text: opts.text }),
    });
    if (!response.ok) {
      console.warn(`[GChat] Webhook failed (${response.status}): ${await response.text().catch(() => "")}`);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("[GChat] Error posting to webhook:", error);
    return false;
  }
}

/**
 * Send a notification to a group's Google Chat webhook if configured.
 */
export async function notifyGroupGChat(opts: {
  groupId: number;
  title: string;
  body: string;
  link?: string;
}) {
  try {
    const group = await db.getGroupById(opts.groupId);
    if (!group?.gchatWebhookUrl) return false;
    
    let text = `*${opts.title}*\n${opts.body}`;
    if (opts.link) {
      text += `\n\n<${opts.link}|View in Book Club>`;
    }
    
    return postToGoogleChat({ webhookUrl: group.gchatWebhookUrl, text });
  } catch {
    return false;
  }
}

// ─── Unified Notification Dispatcher ────────────────────────────────

/**
 * Send notifications across all channels: in-app, email (Resend), and Google Chat.
 * This is the main entry point for triggering notifications on key events.
 */
export async function dispatchNotification(opts: {
  groupId: number;
  eventId?: number;
  type: string;
  title: string;
  message: string;
  excludeUserId?: number;
  link?: string;
  ctaText?: string;
  ctaUrl?: string;
}) {
  const { groupId, eventId, type, title, message, excludeUserId, link, ctaText, ctaUrl } = opts;
  
  // 1. In-app notifications for all group members
  try {
    const members = await db.getGroupMembers(groupId);
    const notifs = members
      .filter(m => m.id !== excludeUserId)
      .map(m => ({
        userId: m.id,
        groupId,
        eventId,
        type,
        title,
        message,
      }));
    if (notifs.length > 0) {
      await db.createBulkNotifications(notifs);
    }
  } catch (err) {
    console.warn("[Dispatch] In-app notification failed:", err);
  }

  // 2. Email notification via Resend (individual emails to members)
  try {
    await notifyGroupByEmail({
      groupId,
      title,
      content: message,
      ctaText,
      ctaUrl,
      excludeUserId,
    });
  } catch (err) {
    console.warn("[Dispatch] Email notification failed:", err);
  }

  // 3. Google Chat webhook
  try {
    await notifyGroupGChat({ groupId, title, body: message, link });
  } catch (err) {
    console.warn("[Dispatch] GChat notification failed:", err);
  }
}
