import { describe, it, expect } from "vitest";
import { buildNotificationEmail } from "./emailService";

describe("Email Service", () => {
  it("should build a notification email with member name", () => {
    const html = buildNotificationEmail({
      title: "Voting Reminder: March Madness",
      message: "You haven't voted yet. Cast your vote!",
      memberName: "Alice",
      ctaText: "Vote Now",
      ctaUrl: "https://example.com/vote",
    });
    expect(html).toContain("Hi Alice,");
    expect(html).toContain("Voting Reminder: March Madness");
    expect(html).toContain("You haven't voted yet");
    expect(html).toContain("Vote Now");
    expect(html).toContain("https://example.com/vote");
    expect(html).toContain("<!DOCTYPE html>");
  });

  it("should build a notification email without member name", () => {
    const html = buildNotificationEmail({
      title: "Winner Selected",
      message: "The winner has been chosen!",
    });
    expect(html).toContain("Hi there,");
    expect(html).toContain("Winner Selected");
    expect(html).toContain("The winner has been chosen!");
    // No CTA button
    expect(html).not.toContain("Vote Now");
  });

  it("should build email without CTA when no URL provided", () => {
    const html = buildNotificationEmail({
      title: "Test",
      message: "Test message",
      memberName: "Bob",
    });
    expect(html).toContain("Hi Bob,");
    expect(html).not.toContain("<a href=");
  });

  it("should convert newlines to <br> in message", () => {
    const html = buildNotificationEmail({
      title: "Test",
      message: "Line 1\nLine 2\nLine 3",
    });
    expect(html).toContain("Line 1<br>Line 2<br>Line 3");
  });
});
