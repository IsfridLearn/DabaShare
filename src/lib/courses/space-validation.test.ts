import { describe, expect, it } from "vitest";
import { formatRating, isWebLink, lessonSchema, parseCourseTab, reviewSchema, splitLessons, updateSchema } from "./space-validation";

const tomorrow = () => {
  const d = new Date(Date.now() + 2 * 86_400_000 + 8 * 3_600_000);
  return d.toISOString().slice(0, 10);
};

describe("parseCourseTab", () => {
  it("keeps members-only tabs for members", () => {
    expect(parseCourseTab("schedule", { member: true, owner: false })).toBe("schedule");
    expect(parseCourseTab("reviews", { member: false, owner: false })).toBe("reviews");
  });
  it("falls back to the overview for everyone else", () => {
    expect(parseCourseTab("schedule", { member: false, owner: false })).toBe("overview");
    expect(parseCourseTab("updates", { member: false, owner: false })).toBe("overview");
    expect(parseCourseTab("students", { member: true, owner: false })).toBe("overview");
    expect(parseCourseTab("nope", { member: true, owner: true })).toBe("overview");
  });
});

describe("lessonSchema", () => {
  const base = { title: "Week 1", date: tomorrow(), time: "18:00", duration: "90", location: "", notes: "" };
  it("builds start and end times in PH time", () => {
    const r = lessonSchema.safeParse(base);
    expect(r.success).toBe(true);
    if (r.success) {
      expect(new Date(r.data.ends_at).getTime() - new Date(r.data.starts_at).getTime()).toBe(90 * 60_000);
      expect(r.data.location).toBeNull();
    }
  });
  it("accepts any clean place or link, and rejects hidden characters", () => {
    expect(lessonSchema.safeParse({ ...base, location: "Room 204, UM library" }).success).toBe(true);
    expect(lessonSchema.safeParse({ ...base, location: "Zoom: 123 456" }).success).toBe(true);
    expect(lessonSchema.safeParse({ ...base, location: "https://meet.example.com/x" }).success).toBe(true);
    expect(lessonSchema.safeParse({ ...base, location: "java\tscript:alert(1)" }).success).toBe(false);
  });
  it("only treats strict http(s) URLs as links", () => {
    expect(isWebLink("javascript:alert(1)")).toBe(false);
    expect(isWebLink("//evil.example")).toBe(false);
    expect(isWebLink("https://meet.example.com/x y")).toBe(false);
  });
  it("rejects the past and odd durations", () => {
    expect(lessonSchema.safeParse({ ...base, date: "2020-01-01" }).success).toBe(false);
    expect(lessonSchema.safeParse({ ...base, duration: "7" }).success).toBe(false);
  });
});

describe("updateSchema and reviewSchema", () => {
  it("needs text, and only https links", () => {
    expect(updateSchema.safeParse({ body: "  ", link: "" }).success).toBe(false);
    expect(updateSchema.safeParse({ body: "Slides are up", link: "https://drive.example.com/a" }).success).toBe(true);
    expect(updateSchema.safeParse({ body: "Slides", link: "ftp://x" }).success).toBe(false);
  });
  it("needs a whole rating from 1 to 5", () => {
    expect(reviewSchema.safeParse({ rating: "5", body: "" }).success).toBe(true);
    expect(reviewSchema.safeParse({ rating: "0" }).success).toBe(false);
    expect(reviewSchema.safeParse({ rating: "4.5" }).success).toBe(false);
  });
});

describe("helpers", () => {
  it("detects links and formats ratings", () => {
    expect(isWebLink("https://meet.example.com")).toBe(true);
    expect(isWebLink("Room 204")).toBe(false);
    expect(formatRating(4.75, 4)).toBe("4.8");
    expect(formatRating(null, 0)).toBeNull();
  });
});

describe("splitLessons", () => {
  it("splits on the end time", () => {
    const now = new Date("2026-12-01T10:00:00Z");
    const lessons = [
      { id: "a", ends_at: "2026-11-30T10:00:00Z" },
      { id: "b", ends_at: "2026-11-30T12:00:00Z" },
      { id: "c", ends_at: "2026-12-02T10:00:00Z" },
    ];
    const { upcoming, past } = splitLessons(lessons, now);
    expect(upcoming.map((l) => l.id)).toEqual(["c"]);
    expect(past.map((l) => l.id)).toEqual(["b", "a"]);
  });
});
