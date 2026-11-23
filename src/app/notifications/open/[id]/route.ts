import { NextResponse, type NextRequest } from "next/server";
import { isUuid } from "@/lib/courses/queries";
import { notificationTarget } from "@/lib/notifications/format";
import { createClient } from "@/lib/supabase/server";

// Opening a notification marks it read and goes to what it's about.
// RLS limits both the read and the update to the recipient.
export async function GET(request: NextRequest, { params }: RouteContext<"/notifications/open/[id]">) {
  const { id } = await params;
  const fallback = new URL("/notifications", request.url);
  if (!isUuid(id)) return NextResponse.redirect(fallback);

  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .select("type, data")
    .maybeSingle();
  if (!data) return NextResponse.redirect(fallback);
  return NextResponse.redirect(new URL(notificationTarget(data), request.url));
}
