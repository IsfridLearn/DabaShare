"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export async function markAllNotificationsRead(): Promise<void> {
  if (!(await getSessionUser())) redirect("/login");
  const supabase = await createClient();
  await supabase.rpc("mark_all_notifications_read");
  refresh();
}
