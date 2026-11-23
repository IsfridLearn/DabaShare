import { z } from "zod";

const LOCAL_SITE_URL = "http://localhost:3000";

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url({ message: "must be a URL, e.g. https://abcd.supabase.co" }),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z
    .string()
    .min(20, { message: "must be the project's publishable (anon) key" }),
  NEXT_PUBLIC_SITE_URL: z.url().optional(),
});

export type PublicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: string;
  NEXT_PUBLIC_SITE_URL: string;
};

// In production a missing site URL would silently put localhost links in
// every auth email, so it is required there and defaulted only in development.
export function parsePublicEnv(
  source: Record<string, string | undefined>,
  { production = false }: { production?: boolean } = {},
): PublicEnv {
  const result = publicEnvSchema.safeParse(source);
  const problems = result.success
    ? []
    : result.error.issues.map((issue) => `  ${issue.path.join(".")}: ${issue.message}`);
  if (result.success && !result.data.NEXT_PUBLIC_SITE_URL && production) {
    problems.push("  NEXT_PUBLIC_SITE_URL: required in production (the public https:// address)");
  }
  if (!result.success || problems.length) {
    throw new Error(
      `Invalid environment configuration:\n${problems.join("\n")}\nCopy .env.example to .env.local and fill in the values.`,
    );
  }
  return { ...result.data, NEXT_PUBLIC_SITE_URL: result.data.NEXT_PUBLIC_SITE_URL ?? LOCAL_SITE_URL };
}

let cached: PublicEnv | undefined;

// NEXT_PUBLIC_ values are inlined at build time only when referenced literally,
// so each one is spelled out here instead of passing process.env directly.
export function publicEnv(): PublicEnv {
  cached ??= parsePublicEnv(
    {
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
      NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    },
    { production: process.env.NODE_ENV === "production" },
  );
  return cached;
}

// Server-only: base URL for links in auth emails. Vercel preview deployments
// use their own URL so the PKCE cookie and the link share a host.
export function authLinkBaseUrl(): string {
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return publicEnv().NEXT_PUBLIC_SITE_URL;
}
