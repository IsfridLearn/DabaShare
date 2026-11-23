import { describe, expect, it } from "vitest";
import { formatDayLabel, formatInboxTime, messageSchema, previewText } from "./format";

// 2026-11-26 10:00 in Manila (UTC+8) is 02:00 UTC.
const now = new Date("2026-11-26T02:00:00Z");

describe("formatInboxTime (Asia/Manila)", () => {
  it("shows the time for today", () => {
    expect(formatInboxTime("2026-11-26T01:30:00Z", now)).toMatch(/9:30\s?(AM|am)/);
  });
  it("uses Manila's date, not UTC's", () => {
    // 2026-11-25 17:00 UTC is already 01:00 on the 26th in Manila -> today.
    expect(formatInboxTime("2026-11-25T17:00:00Z", now)).toMatch(/1:00/);
  });
  it("says Yesterday and then a short date", () => {
    expect(formatInboxTime("2026-11-25T03:00:00Z", now)).toBe("Yesterday");
    expect(formatInboxTime("2026-11-20T03:00:00Z", now)).toMatch(/Nov\s?20/);
  });
});

describe("formatDayLabel", () => {
  it("labels days", () => {
    expect(formatDayLabel("2026-11-26T00:30:00Z", now)).toBe("Today");
    expect(formatDayLabel("2026-11-25T00:30:00Z", now)).toBe("Yesterday");
    expect(formatDayLabel("2026-11-20T03:00:00Z", now)).toMatch(/Friday/);
  });
});

describe("messageSchema", () => {
  it("trims and rejects empty or oversized messages", () => {
    expect(messageSchema.parse({ body: "  hi  " }).body).toBe("hi");
    expect(messageSchema.safeParse({ body: "   " }).success).toBe(false);
    expect(messageSchema.safeParse({ body: "x".repeat(2001) }).success).toBe(false);
  });
});

describe("previewText", () => {
  it("flattens whitespace and truncates", () => {
    expect(previewText("hello\n\nthere")).toBe("hello there");
    expect(previewText("a".repeat(70), 10)).toBe("aaaaaaaaa…");
    expect(previewText(null)).toBe("No messages yet");
  });
});
