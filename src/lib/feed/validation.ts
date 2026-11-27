import { z } from "zod";

export const POST_MAX = 3000;
export const FEED_PAGE = 20;

export type FeedScope = "following" | "everyone";

export function parseScope(value: unknown): FeedScope {
  return value === "everyone" ? "everyone" : "following";
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The composer's attachment picker sends "session:<id>", "course:<id>" or "".
export type Attachment = { kind: "session" | "course"; id: string } | null;

export function parseAttachment(value: unknown): Attachment | "invalid" {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") return "invalid";
  const [kind, id, ...rest] = value.split(":");
  if (rest.length || (kind !== "session" && kind !== "course") || !id || !UUID.test(id)) return "invalid";
  return { kind, id };
}

export const postSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, { error: "Write something first." })
    .max(POST_MAX, { error: `Posts can be up to ${POST_MAX.toLocaleString("en-US")} characters.` }),
  attachment: z.string().optional(),
});

// Keyset cursor for "Load more": the last post's timestamp and id.
export type FeedCursor = { ts: string; id: string };

// Only the ISO timestamps Postgres returns (e.g. 2026-11-23T10:00:00.123456+00:00),
// so a hand-made cursor can't reach the database as an unparsable value.
const ISO_TS = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,6})?(Z|[+-]\d{2}:\d{2})$/;

export function parseCursor(ts: unknown, id: unknown): FeedCursor | null {
  if (typeof ts !== "string" || typeof id !== "string" || !UUID.test(id)) return null;
  if (!ISO_TS.test(ts) || Number.isNaN(Date.parse(ts))) return null;
  return { ts, id };
}

// Short, LinkedIn-like relative time: "now", "5m", "3h", "2d", then a date.
const shortDate = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric" });
const longDate = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", month: "short", day: "numeric", year: "numeric" });

export function relativeTime(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  const seconds = Math.max(0, Math.round((now.getTime() - date.getTime()) / 1000));
  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.getFullYear() === now.getFullYear() ? shortDate.format(date) : longDate.format(date);
}

const when = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export const formatWhen = (iso: string) => when.format(new Date(iso));

