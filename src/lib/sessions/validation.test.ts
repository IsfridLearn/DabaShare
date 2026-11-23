import { describe, expect, it } from "vitest";
import { notificationTarget, notificationText, type NotificationRow } from "@/lib/notifications/format";
import { durationLabel, isoToManila, manilaToIso, parseTab, sessionPhase, sessionSchema } from "./validation";

describe("Manila time conversion", () => {
  it("treats form input as Philippine time", () => {
    expect(manilaToIso("2026-12-01", "18:30")).toBe("2026-12-01T10:30:00.000Z");
  });
  it("round-trips for the edit form", () => {
    expect(isoToManila("2026-12-01T10:30:00.000Z")).toEqual({ date: "2026-12-01", time: "18:30" });
    expect(isoToManila("2026-12-01T17:00:00.000Z")).toEqual({ date: "2026-12-02", time: "01:00" });
  });
  it("rejects malformed input", () => {
    expect(manilaToIso("2026-13-45", "18:30")).toBeNull();
    expect(manilaToIso("tomorrow", "6pm")).toBeNull();
    expect(manilaToIso("2026-02-31", "10:00")).toBeNull();
    expect(manilaToIso("2026-12-01", "25:00")).toBeNull();
  });
});

describe("sessionPhase", () => {
  const s = { status: "scheduled" as const, starts_at: "2026-12-01T10:00:00Z", ends_at: "2026-12-01T11:00:00Z" };
  it("derives the phase from the clock", () => {
    expect(sessionPhase(s, new Date("2026-12-01T09:59:00Z"))).toBe("upcoming");
    expect(sessionPhase(s, new Date("2026-12-01T10:30:00Z"))).toBe("live");
    expect(sessionPhase(s, new Date("2026-12-01T11:00:00Z"))).toBe("ended");
    expect(sessionPhase({ ...s, status: "cancelled" }, new Date("2026-12-01T10:30:00Z"))).toBe("cancelled");
  });
});

describe("helpers", () => {
  it("parses tabs and durations", () => {
    expect(parseTab("live")).toBe("live");
    expect(parseTab("nope")).toBe("upcoming");
    expect(durationLabel(45)).toBe("45 min");
    expect(durationLabel(90)).toBe("1 h 30 min");
    expect(durationLabel(120)).toBe("2 h");
  });
});

const form = {
  title: "Calculus finals prep",
  description: "Derivatives and integrals.",
  type: "study_group",
  categoryId: "2",
  date: "2026-12-01",
  time: "18:00",
  duration: "90",
  capacity: "20",
  requiresApproval: "on",
  meetingUrl: "https://meet.google.com/abc-defg-hij",
};

describe("sessionSchema", () => {
  it("maps the form to database columns", () => {
    const { session, meetingUrl } = sessionSchema.parse(form);
    expect(session).toEqual({
      title: "Calculus finals prep",
      description: "Derivatives and integrals.",
      type: "study_group",
      category_id: 2,
      starts_at: "2026-12-01T10:00:00.000Z",
      ends_at: "2026-12-01T11:30:00.000Z",
      capacity: 20,
      requires_approval: true,
    });
    expect(meetingUrl).toBe("https://meet.google.com/abc-defg-hij");
  });

  it("allows no category, no link and open joining", () => {
    const { session, meetingUrl } = sessionSchema.parse({ ...form, categoryId: "", meetingUrl: "", requiresApproval: undefined });
    expect(session.category_id).toBeNull();
    expect(session.requires_approval).toBe(false);
    expect(meetingUrl).toBe("");
  });

  it.each(["http://meet.example.com", "javascript:alert(1)", "meet.google.com/x"])("rejects link %s", (meetingUrl) => {
    expect(sessionSchema.safeParse({ ...form, meetingUrl }).success).toBe(false);
  });

  it.each([
    ["capacity", "0"],
    ["capacity", "501"],
    ["duration", "37"],
    ["type", "party"],
    ["date", "2026-02-31x"],
  ])("rejects %s=%s", (key, value) => {
    expect(sessionSchema.safeParse({ ...form, [key]: value }).success).toBe(false);
  });
});

const n = (over: Partial<NotificationRow>): NotificationRow => ({
  id: "1",
  type: "new_message",
  data: {},
  actor_name: "Maria",
  course_title: "Accounting 101",
  i_own_course: false,
  session_title: "Calculus prep",
  i_host_session: false,
  ...over,
});

describe("notificationText", () => {
  it("reads naturally for each side", () => {
    expect(notificationText(n({ type: "new_message" }))).toBe("Maria sent you a message");
    expect(notificationText(n({ type: "enrollment_created", data: { status: "requested" } }))).toBe("Maria asked to join Accounting 101");
    expect(notificationText(n({ type: "enrollment_updated", data: { status: "accepted" } }))).toBe("Maria accepted your request for Accounting 101");
    expect(notificationText(n({ type: "enrollment_updated", i_own_course: true, data: { status: "cancelled" } }))).toBe("Maria left Accounting 101");
    expect(notificationText(n({ type: "session_invitation" }))).toBe("Maria invited you to Calculus prep");
    expect(notificationText(n({ type: "participation_updated", i_host_session: true, data: { status: "declined" } }))).toBe("Maria declined your invitation to Calculus prep");
    expect(notificationText(n({ type: "participation_updated", data: { status: "accepted" } }))).toBe("You're in! Maria accepted you into Calculus prep");
    expect(notificationText(n({ type: "session_cancelled" }))).toBe("Calculus prep was cancelled");
    expect(notificationText(n({ type: "course_removed", course_title: "Old course" }))).toBe("Old course was removed by its tutor");
  });
  it("copes with deleted actors and items", () => {
    expect(notificationText(n({ type: "session_joined", actor_name: null, session_title: null }))).toBe("A student joined a session");
  });
});

describe("notificationTarget", () => {
  it("links to the related page", () => {
    expect(notificationTarget({ type: "new_message", data: { conversation_id: "c1" } })).toBe("/messages/c1");
    expect(notificationTarget({ type: "enrollment_created", data: { course_id: "k1" } })).toBe("/courses/k1");
    expect(notificationTarget({ type: "session_request", data: { session_id: "s1" } })).toBe("/sessions/s1");
    expect(notificationTarget({ type: "course_removed", data: { course_title: "x" } })).toBe("/courses/mine");
    expect(notificationTarget({ type: "session_updated", data: null })).toBe("/notifications");
  });
});
