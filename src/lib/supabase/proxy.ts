import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { routeAccess, SIGNED_IN_HOME } from "@/lib/auth/routes";
import { publicEnv } from "@/lib/env";
import type { Database } from "./database.types";

// Refreshes the Supabase auth session on every request and writes the new
// cookies to both the forwarded request and the response, then applies
// optimistic route protection. Pages still verify the user themselves.
export async function updateSession(request: NextRequest) {
  const env = publicEnv();
  let response = NextResponse.next({ request });
  let cacheHeaders: Record<string, string> = {};

  const supabase = createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet, headers) {
          cacheHeaders = headers;
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
          Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
        },
      },
    },
  );

  // Do not put code between createServerClient and getClaims: getClaims is what
  // validates the token and triggers the refresh.
  const { data } = await supabase.auth.getClaims();
  const signedIn = Boolean(data?.claims?.sub);

  // Server Actions check the session themselves and redirect properly;
  // redirecting their POST here would replay it against the login page.
  if (request.headers.has("next-action")) return response;

  const { pathname, search } = request.nextUrl;
  const access = routeAccess(pathname);

  if (access === "protected" && !signedIn) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname + search);
    return redirectKeepingCookies(url, response, cacheHeaders);
  }
  if (access === "guest" && signedIn) {
    return redirectKeepingCookies(new URL(SIGNED_IN_HOME, request.url), response, cacheHeaders);
  }

  return response;
}

// A redirect must carry any refreshed auth cookies (or the session is lost)
// and their no-store headers (so no CDN caches a Set-Cookie response).
function redirectKeepingCookies(url: URL, from: NextResponse, headers: Record<string, string>): NextResponse {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  Object.entries(headers).forEach(([key, value]) => redirect.headers.set(key, value));
  return redirect;
}
