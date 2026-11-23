// Which routes need a session. Used by the proxy for fast redirects; pages
// still verify the user themselves (the proxy is only an optimistic check).
export type RouteAccess = "public" | "guest" | "protected";

// Guest pages (incl. the landing page): signed-in users go to the app instead.
const GUEST_ONLY = ["/", "/login", "/signup", "/forgot-password"];
const PUBLIC = ["/check-email", "/privacy", "/status"];
const PUBLIC_PREFIXES = ["/auth/"];

export function routeAccess(pathname: string): RouteAccess {
  if (GUEST_ONLY.includes(pathname)) return "guest";
  if (PUBLIC.includes(pathname)) return "public";
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return "public";
  return "protected";
}

export const SIGNED_IN_HOME = "/home";
