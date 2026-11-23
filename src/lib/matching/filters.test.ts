import { describe, expect, it } from "vitest";
import { isSkillSwap, matchesHref, matchReasons, parseMatchFilters } from "./filters";

describe("parseMatchFilters", () => {
  it("reads valid values", () => {
    expect(parseMatchFilters({ mode: "teaches_me", uni: "same", page: "2" })).toEqual({
      mode: "teaches_me",
      sameUni: true,
      page: 2,
    });
  });

  it("ignores junk", () => {
    expect(parseMatchFilters({ mode: "everyone", uni: "yes", page: "-1" })).toEqual({ sameUni: false, page: 1 });
  });
});

describe("matchesHref", () => {
  it("builds clean URLs", () => {
    expect(matchesHref({})).toBe("/matches");
    expect(matchesHref({ mode: "learns_from_me", sameUni: true, page: 1 })).toBe("/matches?mode=learns_from_me&uni=same");
  });
});

const base = {
  teaches_you: [] as string[],
  learns_from_you: [] as string[],
  shared_interests: [] as string[],
  course_categories: [] as string[],
  same_university: false,
  university_short: "UM",
};

describe("matchReasons", () => {
  it("explains every overlap in priority order", () => {
    const reasons = matchReasons({
      ...base,
      teaches_you: ["Accounting"],
      learns_from_you: ["Python"],
      shared_interests: ["Mathematics"],
      course_categories: ["Business & Accounting"],
      same_university: true,
    });
    expect(reasons.map((r) => r.label)).toEqual([
      "Can teach you",
      "Wants to learn from you",
      "Shared interests",
      "Offers courses in",
      "Also studies at",
    ]);
    expect(reasons[4].items).toEqual(["UM"]);
  });

  it("omits empty reasons", () => {
    expect(matchReasons({ ...base, shared_interests: ["Music"] })).toHaveLength(1);
  });
});

describe("isSkillSwap", () => {
  it("needs both directions", () => {
    expect(isSkillSwap({ teaches_you: ["A"], learns_from_you: ["B"] })).toBe(true);
    expect(isSkillSwap({ teaches_you: ["A"], learns_from_you: [] })).toBe(false);
  });
});
