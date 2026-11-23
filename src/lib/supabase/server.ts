import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

// Supabase client for Server Components, Server Actions and Route Handlers.
// Create one per request; never share it between users.
export async function createClient() {
  // Session data must be read at request time, never during a (runtime)
  // prerender: supabase-js checks token expiry with Date.now(), which Cache
  // Components forbids before a request-time signal.
  await connection();
  const env = publicEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Server Components cannot set cookies. The proxy refreshes the
            // session on every request, so this write is safe to skip there.
          }
        },
      },
    },
  );
}
