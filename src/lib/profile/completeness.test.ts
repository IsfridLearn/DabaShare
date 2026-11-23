import { describe, expect, it } from "vitest";
import { profileCompleteness } from "./completeness";
import { skillOverlap } from "./overlap";

describe("skillOverlap", () => {
  it("finds what each student can teach the other", () => {
    const me = { teaches: [{ id: 1, name: "Python" }], learns: [{ id: 2, name: "Accounting" }] };
    const them = {
      teaches: [{ id: 2, name: "Accounting" }, { id: 3, name: "Excel" }],
      learns: [{ id: 1, name: "Python" }, { id: 4, name: "Guitar" }],
    };
    expect(skillOverlap(me, them)).toEqual({ theyTeachYou: ["Accounting"], youTeachThem: ["Python"] });
    expect(skillOverlap({ teaches: [], learns: [] }, them)).toEqual({ theyTeachYou: [], youTeachThem: [] });
  });
});

const empty = { avatar_path: null, program: null, bio: "  ", teaches: [], learns: [], interestIds: [] };

describe("profileCompleteness", () => {
  it("starts at zero and lists matching-critical steps first", () => {
    const c = profileCompleteness(empty);
    expect(c.done).toBe(0);
    expect(c.percent).toBe(0);
    expect(c.items.slice(0, 2).map((i) => i.key)).toEqual(["teach", "learn"]);
  });

  it("counts finished items", () => {
    const c = profileCompleteness({ ...empty, teaches: [1], learns: [1], program: "BSCS" });
    expect(c.done).toBe(3);
    expect(c.percent).toBe(50);
    expect(c.items.find((i) => i.key === "bio")?.done).toBe(false);
  });

  it("is complete when everything is filled", () => {
    const c = profileCompleteness({ avatar_path: "x/1.webp", program: "BSA", bio: "Hi", teaches: [1], learns: [1], interestIds: [1] });
    expect(c.percent).toBe(100);
  });
});
