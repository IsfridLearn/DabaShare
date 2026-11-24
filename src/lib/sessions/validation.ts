import { z } from "zod";
import type { Enums } from "@/lib/supabase/database.types";

export type SessionType = Enums<"session_type">;
export type ParticipantStatus = Enums<"participant_status">;
export type SessionTab = "upcoming" | "live" | "mine";

export const SESSION_TYPES: { value: SessionType; label: string }[] = [
  { value: "study_group", label: "Study group" },
  { value: "webinar", label: "Webinar" },
  { value: "qa", label: "Q&A session" },
];

export const DURATIONS = [30, 45, 60, 90, 120, 180, 240, 360, 480, 720];

export const typeLabel = (t: SessionType) => SESSION_TYPES.find((x) => x.value === t)?.label ?? t;

export function parseTab(value: unknown): SessionTab {
  return value === "live" || value === "mine" ? value : "upcoming";
}

// ── Philippine time ─────────────────────────────────────────────────────────
// The Philippines has no daylight saving, so a fixed +08:00 offset is exact.
const MANILA_OFFSET = "+08:00";

export function manilaToIso(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const parsed = new Date(`${date}T${time}:00${MANILA_OFFSET}`);
  if (Number.isNaN(parsed.getTime())) return null;
  // Reject dates JavaScript silently rolls over (e.g. Feb 31 -> Mar 3).
  const back = isoToManila(parsed.toISOString());
  return back.date === date && back.time === time ? parsed.toISOString() : null;
}

export function isoToManila(iso: string): { date: string; time: string } {
  const shifted = new Date(new Date(iso).getTime() + 8 * 60 * 60 * 1000);
  const [date, rest] = shifted.toISOString().split("T");
  return { date, time: rest.slice(0, 5) };
}

const when = new Intl.DateTimeFormat("en-PH", {
  timeZone: "Asia/Manila",
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
});
const clock = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });

export function formatSessionTime(startsAt: string, endsAt: string): string {
  return `${when.format(new Date(startsAt))} – ${clock.format(new Date(endsAt))}`;
}

const dayLabel = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", weekday: "long", month: "long", day: "numeric" });
const tile = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", weekday: "short", day: "numeric", month: "short" });

// The calendar day a session starts on, in Philippine time.
export function sessionDay(startsAt: string): { key: string; label: string; weekday: string; day: string; month: string } {
  const d = new Date(startsAt);
  const parts = Object.fromEntries(tile.formatToParts(d).map((p) => [p.type, p.value]));
  return { key: isoToManila(startsAt).date, label: dayLabel.format(d), weekday: parts.weekday, day: parts.day, month: parts.month };
}

export function clockRange(startsAt: string, endsAt: string): string {
  return `${clock.format(new Date(startsAt))} – ${clock.format(new Date(endsAt))}`;
}

// Consecutive sessions on the same PH day, in list order.
export function groupByDay<T extends { starts_at: string }>(items: T[]): { key: string; label: string; items: T[] }[] {
  const groups: { key: string; label: string; items: T[] }[] = [];
  for (const item of items) {
    const day = sessionDay(item.starts_at);
    const last = groups.at(-1);
    if (last?.key === day.key) last.items.push(item);
    else groups.push({ key: day.key, label: day.label, items: [item] });
  }
  return groups;
}

export function durationLabel(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h} h ${m} min` : `${h} h`;
}

export type SessionPhase = "upcoming" | "live" | "ended" | "cancelled";

export function sessionPhase(
  s: { status: Enums<"session_status">; starts_at: string; ends_at: string },
  now: Date = new Date(),
): SessionPhase {
  if (s.status === "cancelled") return "cancelled";
  const t = now.getTime();
  if (t >= new Date(s.ends_at).getTime()) return "ended";
  if (t >= new Date(s.starts_at).getTime()) return "live";
  return "upcoming";
}

// ── Form ────────────────────────────────────────────────────────────────────
export const sessionSchema = z
  .object({
    title: z.string().trim().min(3, { error: "Use at least 3 characters." }).max(120, { error: "Use at most 120 characters." }),
    description: z.string().trim().max(2000, { error: "Use at most 2,000 characters." }).default(""),
    type: z.enum(["study_group", "webinar", "qa"], { error: "Choose a session type." }),
    categoryId: z.string().default(""),
    date: z.string().min(1, { error: "Choose a date." }),
    time: z.string().min(1, { error: "Choose a start time." }),
    duration: z.coerce.number().refine((d) => DURATIONS.includes(d), { error: "Choose a duration." }),
    capacity: z.coerce
      .number({ error: "Enter how many people can join." })
      .int({ error: "Use a whole number." })
      .min(1, { error: "At least 1 participant." })
      .max(500, { error: "At most 500 participants." }),
    requiresApproval: z.string().optional(),
    meetingUrl: z
      .string()
      .trim()
      .max(500, { error: "That link is too long." })
      .refine((v) => v === "" || /^https:\/\/[^\s]+$/.test(v), { error: "Use a full https:// link (Google Meet, Zoom, Jitsi…)." })
      .default(""),
  })
  .transform((v, ctx) => {
    const startsAt = manilaToIso(v.date, v.time);
    if (!startsAt) {
      ctx.addIssue({ code: "custom", path: ["date"], message: "Choose a valid date and time." });
      return z.NEVER;
    }
    const category = Number(v.categoryId);
    return {
      session: {
        title: v.title,
        description: v.description,
        type: v.type,
        category_id: Number.isInteger(category) && category > 0 ? category : null,
        starts_at: startsAt,
        ends_at: new Date(new Date(startsAt).getTime() + v.duration * 60_000).toISOString(),
        capacity: v.capacity,
        requires_approval: v.requiresApproval === "on",
      },
      meetingUrl: v.meetingUrl,
    };
  });
