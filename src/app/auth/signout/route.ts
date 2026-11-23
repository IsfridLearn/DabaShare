import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Clears a session whose account no longer exists (e.g. deleted on another
// device while this browser still holds an unexpired token). Pages redirect
// here because Server Components cannot clear cookies themselves.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  return NextResponse.redirect(new URL("/login?notice=session-ended", request.url));
}
