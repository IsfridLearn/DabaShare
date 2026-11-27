import { z } from "zod";

// Philippine time everywhere, so server-rendered and browser-rendered
// timestamps match (no hydration mismatch) whatever the device timezone is.
const TZ = "Asia/Manila";
const clock = new Intl.DateTimeFormat("en-PH", { timeZone: TZ, hour: "numeric", minute: "2-digit" });
const shortDate = new Intl.DateTimeFormat("en-PH", { timeZone: TZ, month: "short", day: "numeric" });
const longDate = new Intl.DateTimeFormat("en-PH", { timeZone: TZ, weekday: "long", month: "long", day: "numeric" });
const dayKeyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });

export const dayKey = (date: Date) => dayKeyFormat.format(date);

export function formatClock(iso: string): string {
  return clock.format(new Date(iso));
}

// Inbox: time for today, "Yesterday", otherwise a short date.
export function formatInboxTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (dayKey(date) === dayKey(now)) return clock.format(date);
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (dayKey(date) === dayKey(yesterday)) return "Yesterday";
  return shortDate.format(date);
}

// Separator shown between messages from different days.
export function formatDayLabel(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (dayKey(date) === dayKey(now)) return "Today";
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  if (dayKey(date) === dayKey(yesterday)) return "Yesterday";
  return longDate.format(date);
}

export const MESSAGE_MAX = 2000;

export const messageSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, { error: "Write a message first." })
    .max(MESSAGE_MAX, { error: `Messages can be up to ${MESSAGE_MAX} characters.` }),
});

export function previewText(body: string | null, max = 60): string {
  if (!body) return "No messages yet";
  const flat = body.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

// Consecutive messages from the same person within 5 minutes (and on the same
// day) form one group: they sit close together and show the time once.
const GROUP_GAP_MS = 5 * 60 * 1000;
type Groupable = { sender_id: string; created_at: string };

function sameGroup(a: Groupable, b: Groupable): boolean {
  const gap = new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  return (
    a.sender_id === b.sender_id &&
    gap >= 0 &&
    gap < GROUP_GAP_MS &&
    dayKey(new Date(a.created_at)) === dayKey(new Date(b.created_at))
  );
}

export function groupPosition(messages: Groupable[], i: number): { start: boolean; end: boolean } {
  const prev = messages[i - 1];
  const next = messages[i + 1];
  return {
    start: !prev || !sameGroup(prev, messages[i]),
    end: !next || !sameGroup(messages[i], next),
  };
}
