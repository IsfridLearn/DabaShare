import { describe, expect, it } from "vitest";
import { parseAttachment, parseCursor, parseScope, postSchema, relativeTime } from "./validation";

const ID = "8f14e45f-ceea-467f-a8f4-5b0b3a7f4c11";

describe("parseScope", () => {
  it("defaults to following", () => {
    expect(parseScope(undefined)).toBe("following");
    expect(parseScope("everyone")).toBe("everyone");
    expect(parseScope(["everyone"])).toBe("following");
  });
});

describe("parseAttachment", () => {
  it("accepts nothing, a session or a course", () => {
    expect(parseAttachment("")).toBeNull();
    expect(parseAttachment(undefined)).toBeNull();
    expect(parseAttachment(`session:${ID}`)).toEqual({ kind: "session", id: ID });
    expect(parseAttachment(`course:${ID}`)).toEqual({ kind: "course", id: ID });
  });
  it("rejects anything else", () => {
    expect(parseAttachment(`profile:${ID}`)).toBe("invalid");
    expect(parseAttachment("session:not-a-uuid")).toBe("invalid");
    expect(parseAttachment(`session:${ID}:extra`)).toBe("invalid");
  });
});

describe("postSchema", () => {
  it("trims and requires text", () => {
    expect(postSchema.safeParse({ body: "   " }).success).toBe(false);
    expect(postSchema.parse({ body: "  hi  " }).body).toBe("hi");
    expect(postSchema.safeParse({ body: "x".repeat(3001) }).success).toBe(false);
  });
});

describe("parseCursor", () => {
  it("needs a valid timestamp and id", () => {
    expect(parseCursor("2026-11-23T10:00:00Z", ID)).toEqual({ ts: "2026-11-23T10:00:00Z", id: ID });
    expect(parseCursor("2026-11-23T10:00:00.123456+00:00", ID)).not.toBeNull();
    expect(parseCursor("yesterday", ID)).toBeNull();
    expect(parseCursor("Nov 5 2026", ID)).toBeNull();
    expect(parseCursor("2026-11-23 10:00", ID)).toBeNull();
    expect(parseCursor("2026-11-23T10:00:00Z", "1")).toBeNull();
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-11-23T12:00:00Z");
  it("uses short units", () => {
    expect(relativeTime("2026-11-23T11:59:30Z", now)).toBe("now");
    expect(relativeTime("2026-11-23T11:55:00Z", now)).toBe("5m");
    expect(relativeTime("2026-11-23T09:00:00Z", now)).toBe("3h");
    expect(relativeTime("2026-11-21T12:00:00Z", now)).toBe("2d");
    expect(relativeTime("2026-11-01T12:00:00Z", now)).toBe("Nov 1");
  });
  it("never shows negative time for clock skew", () => {
    expect(relativeTime("2026-11-23T12:00:10Z", now)).toBe("now");
  });
});

