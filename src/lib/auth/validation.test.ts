import { describe, expect, it } from "vitest";
import { routeAccess } from "./routes";
import { newPasswordSchema, profileSchema, safeNextPath, signUpSchema } from "./validation";

describe("safeNextPath", () => {
  it.each([
    ["/onboarding", "/onboarding"],
    ["/u/juan?tab=skills", "/u/juan?tab=skills"],
    ["https://evil.example", "/courses"],
    ["//evil.example", "/courses"],
    ["/\\evil.example", "/courses"],
    ["javascript:alert(1)", "/courses"],
    ["/ok\nSet-Cookie:x", "/courses"],
    [undefined, "/courses"],
    [42, "/courses"],
  ])("%s -> %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});

const validSignUp = {
  displayName: "Juan Dela Cruz",
  email: "  Juan@Example.com ",
  universityId: "3",
  password: "secret123",
  confirmAge: "on",
  acceptTerms: "on",
};

describe("signUpSchema", () => {
  it("normalises email and coerces university", () => {
    const result = signUpSchema.parse(validSignUp);
    expect(result.email).toBe("juan@example.com");
    expect(result.universityId).toBe(3);
  });

  it("requires consent and age confirmation", () => {
    const result = signUpSchema.safeParse({ ...validSignUp, confirmAge: undefined, acceptTerms: undefined });
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path[0]);
    expect(paths).toContain("confirmAge");
    expect(paths).toContain("acceptTerms");
  });

  it.each(["short1", "allletters", "12345678"])("rejects weak password %s", (password) => {
    expect(signUpSchema.safeParse({ ...validSignUp, password }).success).toBe(false);
  });

  it("rejects a missing university", () => {
    expect(signUpSchema.safeParse({ ...validSignUp, universityId: "" }).success).toBe(false);
  });
});

describe("newPasswordSchema", () => {
  it("requires matching passwords", () => {
    const result = newPasswordSchema.safeParse({ password: "secret123", confirmPassword: "secret124" });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].path).toEqual(["confirmPassword"]);
  });
});

describe("profileSchema", () => {
  it("lowercases usernames and trims text", () => {
    const result = profileSchema.parse({
      username: " Juan_DC ",
      displayName: " Juan ",
      universityId: "1",
      program: " BS Computer Science ",
      bio: "",
    });
    expect(result.username).toBe("juan_dc");
    expect(result.program).toBe("BS Computer Science");
  });

  it.each(["ab", "has space", "way_too_long_username_here", "dash-name"])("rejects username %s", (username) => {
    expect(
      profileSchema.safeParse({ username, displayName: "J", universityId: "1", program: "", bio: "" }).success,
    ).toBe(false);
  });
});

describe("routeAccess", () => {
  it.each([
    ["/", "public"],
    ["/privacy", "public"],
    ["/auth/confirm", "public"],
    ["/login", "guest"],
    ["/signup", "guest"],
    ["/profile", "protected"],
    ["/onboarding", "protected"],
    ["/reset-password", "protected"],
    ["/u/juan", "protected"],
    ["/loginx", "protected"],
  ])("%s is %s", (path, expected) => {
    expect(routeAccess(path)).toBe(expected);
  });
});
