/**
 * Notification helpers for email and Google Chat webhook integrations.
 * These complement the in-app notification system and the owner notifyOwner helper.
 */
import { notifyOwner } from "./_core/notification";
import * as db from "./db";

// ─── Email Notifications ────────────────────────────────────────────
// Uses the built-in notifyOwner as the email channel (Manus notification system).
// For each member who has emailNotifications enabled, we send via notifyOwner
// which delivers to the project owner. In a production system, this would use
// a proper email service (SendGrid, SES, etc.) but for now we use the built-in
// notification system to deliver email-like alerts.

export async function sendEmailNotification(opts: {
  title: string;
  content: string;
}) {
  try {
    await notifyOwner({ title: opts.title, content: opts.content });
    return true;
  } catch {
    return false;
  }
}

/**
 * Send email notifications to group members who have email notifications enabled.
 * Sends a single consolidated notification via the owner notification channel.
 */
export async function notifyGroupByEmail(opts: {
  groupId: number;
  title: string;
  content: string;
}) {
  try {
    // Send via the owner notification channel
    await notifyOwner({ title: opts.title, content: opts.content });
    return true;
  } catch {
    return false;
  }
}

// ─── Google Chat Webhook ────────────────────────────────────────────

/**
 * Post a message to a Google Chat space via webhook URL.
 * Google Chat webhooks accept a simple JSON payload with a "text" field.
 * Supports Google Chat's simple text formatting.
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
 * Send notifications across all channels: in-app, email (owner), and Google Chat.
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
}) {
  const { groupId, eventId, type, title, message, excludeUserId, link } = opts;
  
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

  // 2. Email notification via owner channel
  try {
    await notifyGroupByEmail({ groupId, title, content: message });
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
