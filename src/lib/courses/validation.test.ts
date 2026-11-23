import { describe, expect, it } from "vitest";
import { courseSchema, coursesHref, formatPrice, parseCourseFilters, parseSkillList } from "./validation";

describe("formatPrice", () => {
  it("shows Free and pesos with separators", () => {
    expect(formatPrice(0)).toBe("Free");
    expect(formatPrice(257)).toBe("₱257");
    expect(formatPrice(12500)).toBe("₱12,500");
  });
});

describe("parseCourseFilters", () => {
  it("keeps valid values", () => {
    expect(
      parseCourseFilters({ q: "  python ", uni: "3", price: "paid", cat: "1", level: "expert", page: "2" }),
    ).toEqual({ q: "python", uni: 3, price: "paid", cat: 1, level: "expert", page: 2 });
  });

  it("drops invalid values instead of failing", () => {
    expect(
      parseCourseFilters({ q: "", uni: "abc", price: "cheap", cat: "-1", level: "god", page: "0" }),
    ).toEqual({ page: 1 });
  });

  it("drops ids too large for the database", () => {
    expect(parseCourseFilters({ uni: "70000", cat: "32768" })).toEqual({ page: 1 });
  });

  it("ignores repeated params and caps the page", () => {
    expect(parseCourseFilters({ q: ["a", "b"], page: "999999" })).toEqual({ page: 1000 });
  });
});

describe("coursesHref", () => {
  it("round-trips filters and omits defaults", () => {
    expect(coursesHref({})).toBe("/courses");
    expect(coursesHref({ q: "web dev", price: "free", page: 1 })).toBe("/courses?q=web+dev&price=free");
    expect(coursesHref({ uni: 2, page: 3 })).toBe("/courses?uni=2&page=3");
  });
});

describe("parseSkillList", () => {
  it("trims, collapses spaces and dedupes case-insensitively", () => {
    expect(parseSkillList(" Python, react ,python,, Web   Dev ")).toEqual(["Python", "react", "Web Dev"]);
  });
});

const base = {
  title: "Intro to Python",
  description: "Learn Python step by step.",
  categoryId: "1",
  level: "beginner",
  priceType: "free",
  pricePhp: "",
  status: "published",
  skills: "Python, Programming",
};

describe("courseSchema", () => {
  it("maps a free course to database columns", () => {
    expect(courseSchema.parse(base)).toEqual({
      title: "Intro to Python",
      description: "Learn Python step by step.",
      category_id: 1,
      level: "beginner",
      price_php: 0,
      status: "published",
      skills: ["Python", "Programming"],
    });
  });

  it("ignores a stray amount on free courses", () => {
    expect(courseSchema.parse({ ...base, pricePhp: "500" }).price_php).toBe(0);
  });

  it.each(["", "0", "12.5", "-5", "100001", "abc"])("rejects paid amount %s", (pricePhp) => {
    const result = courseSchema.safeParse({ ...base, priceType: "paid", pricePhp });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["pricePhp"]);
  });

  it("accepts a valid paid amount", () => {
    expect(courseSchema.parse({ ...base, priceType: "paid", pricePhp: "250" }).price_php).toBe(250);
  });

  it("caps skills at 10", () => {
    const skills = Array.from({ length: 11 }, (_, i) => `Skill ${i}`).join(",");
    expect(courseSchema.safeParse({ ...base, skills }).success).toBe(false);
  });

  it("requires a valid level and category", () => {
    expect(courseSchema.safeParse({ ...base, level: "god" }).success).toBe(false);
    expect(courseSchema.safeParse({ ...base, categoryId: "" }).success).toBe(false);
  });
});
