import { describe, expect, it } from "vitest";
import { parsePublicEnv } from "./env";

const valid = {
  NEXT_PUBLIC_SUPABASE_URL: "https://abcd.supabase.co",
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_0123456789abcdef",
};

describe("parsePublicEnv", () => {
  it("accepts valid values and defaults the site URL", () => {
    expect(parsePublicEnv(valid)).toEqual({
      ...valid,
      NEXT_PUBLIC_SITE_URL: "http://localhost:3000",
    });
  });

  it("names every missing variable in the error", () => {
    expect(() => parsePublicEnv({})).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL[\s\S]*NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/,
    );
  });

  it("rejects a URL that is not a URL", () => {
    expect(() => parsePublicEnv({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "abcd" })).toThrow(
      /NEXT_PUBLIC_SUPABASE_URL/,
    );
  });
});
