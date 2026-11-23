import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type NotificationItem = Database["public"]["Functions"]["my_notifications"]["Returns"][number];
export const NOTIFICATIONS_PAGE = 30;

export async function getNotifications(page: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_notifications", {
    page_size: NOTIFICATIONS_PAGE,
    page_offset: (page - 1) * NOTIFICATIONS_PAGE,
  });
  if (error) throw new Error(`Could not load notifications: ${error.message}`);
  return { items: data, total: Number(data[0]?.total_count ?? 0) };
}

export const getUnreadNotificationCount = cache(async (): Promise<number> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("unread_notification_count");
  return data ?? 0;
});
