import { z } from "zod";
import { DURATIONS, manilaToIso } from "@/lib/sessions/validation";

// ── Course page tabs ────────────────────────────────────────────────────────
export const COURSE_TABS = ["overview", "schedule", "updates", "reviews", "students"] as const;
export type CourseTab = (typeof COURSE_TABS)[number];

/** Members-only tabs fall back to the overview for everyone else. */
export function parseCourseTab(value: unknown, access: { member: boolean; owner: boolean }): CourseTab {
  const tab = COURSE_TABS.find((t) => t === value) ?? "overview";
  if ((tab === "schedule" || tab === "updates") && !access.member) return "overview";
  if (tab === "students" && !access.owner) return "overview";
  return tab;
}

// A place ("Room 204, UM library", "Zoom: 123") or a web link. Any clean text
// is allowed; only strict http(s) URLs are ever rendered as links, so a value
// like "javascript:..." just shows as text. Control characters are rejected,
// like the database check.
const WEB = /^https?:\/\/\S+$/i;
const CONTROL = /[\u0000-\u001f\u007f]/;

const optionalText = (max: number, message: string) =>
  z
    .string()
    .trim()
    .max(max, { error: message })
    .transform((v) => v || null)
    .optional()
    .transform((v) => v ?? null);

// ── Lessons ─────────────────────────────────────────────────────────────────
export const lessonSchema = z
  .object({
    title: z.string().trim().min(1, { error: "Give the lesson a title." }).max(120, { error: "Keep the title under 120 characters." }),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, { error: "Choose a date." }),
    time: z.string().regex(/^\d{2}:\d{2}$/, { error: "Choose a start time." }),
    duration: z.coerce.number().refine((d) => DURATIONS.includes(d), { error: "Choose a duration." }),
    location: optionalText(300, "Keep the place or link under 300 characters.").refine((v) => v === null || !CONTROL.test(v), {
      error: "Remove line breaks or special characters.",
    }),
    notes: optionalText(1000, "Keep notes under 1,000 characters."),
  })
  .transform((v, ctx) => {
    const starts = manilaToIso(v.date, v.time);
    if (!starts) {
      ctx.addIssue({ code: "custom", path: ["time"], message: "Choose a valid date and time." });
      return z.NEVER;
    }
    if (new Date(starts).getTime() <= Date.now()) {
      ctx.addIssue({ code: "custom", path: ["time"], message: "Choose a start time in the future." });
      return z.NEVER;
    }
    const ends = new Date(new Date(starts).getTime() + v.duration * 60_000).toISOString();
    return { title: v.title, starts_at: starts, ends_at: ends, location: v.location, notes: v.notes };
  });

/** True when a lesson's location is a link (rendered as one); otherwise a place. */
export function isWebLink(location: string | null): boolean {
  if (location === null || !WEB.test(location)) return false;
  try {
    const { protocol } = new URL(location);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}

// ── Updates ─────────────────────────────────────────────────────────────────
export const UPDATE_MAX = 2000;
export const updateSchema = z.object({
  body: z
    .string()
    .trim()
    .min(1, { error: "Write something first." })
    .max(UPDATE_MAX, { error: `Updates can be up to ${UPDATE_MAX.toLocaleString("en-US")} characters.` }),
  link: optionalText(500, "Keep the link under 500 characters.").refine((v) => v === null || WEB.test(v), {
    error: "Links must start with https://",
  }),
});

// ── Reviews ─────────────────────────────────────────────────────────────────
export const REVIEW_MAX = 1000;
export const reviewSchema = z.object({
  rating: z.coerce
    .number({ error: "Choose a rating from 1 to 5." })
    .int({ error: "Choose a rating from 1 to 5." })
    .min(1, { error: "Choose a rating from 1 to 5." })
    .max(5, { error: "Choose a rating from 1 to 5." }),
  body: optionalText(REVIEW_MAX, `Reviews can be up to ${REVIEW_MAX.toLocaleString("en-US")} characters.`),
});

/** "4.8" with one decimal, or null when there are no reviews. */
export function formatRating(avg: number | null | undefined, count: number | null | undefined): string | null {
  if (!count || avg === null || avg === undefined) return null;
  return Number(avg).toFixed(1);
}

/** Upcoming lessons (soonest first) and past ones (most recent first). */
export function splitLessons<T extends { ends_at: string }>(lessons: T[], now: Date = new Date()): { upcoming: T[]; past: T[] } {
  const t = now.getTime();
  return {
    upcoming: lessons.filter((l) => new Date(l.ends_at).getTime() > t),
    past: lessons.filter((l) => new Date(l.ends_at).getTime() <= t).reverse(),
  };
}
