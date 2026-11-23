import { describe, expect, it } from "vitest";
import { isThemePreference, resolveDark, THEME_INIT_SCRIPT } from "./theme";

describe("theme", () => {
  it("resolves the preference against the device setting", () => {
    expect(resolveDark("dark", false)).toBe(true);
    expect(resolveDark("light", true)).toBe(false);
    expect(resolveDark("system", true)).toBe(true);
    expect(resolveDark("system", false)).toBe(false);
  });

  it("accepts only known preferences", () => {
    expect(isThemePreference("dark")).toBe(true);
    expect(isThemePreference("blue")).toBe(false);
    expect(isThemePreference(null)).toBe(false);
  });

  it("init script is a self-contained statement guarded by try/catch", () => {
    expect(THEME_INIT_SCRIPT).toMatch(/^\(function\(\)\{try\{/);
    expect(THEME_INIT_SCRIPT).not.toMatch(/<\/script/i);
  });
});
