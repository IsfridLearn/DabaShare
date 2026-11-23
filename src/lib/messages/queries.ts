import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";

export type InboxItem = Database["public"]["Functions"]["my_conversations"]["Returns"][number];
export type ChatMessage = { id: string; sender_id: string; body: string; created_at: string };

export const PAGE = 50;

export async function getInbox(): Promise<InboxItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_conversations");
  if (error) throw new Error(`Could not load conversations: ${error.message}`);
  return data;
}

// Memoised per request: the header renders the badge twice (desktop + mobile).
export const getUnreadCount = cache(async (): Promise<number> => {
  const supabase = await createClient();
  const { data } = await supabase.rpc("unread_conversation_count");
  return data ?? 0;
});

// Newest PAGE messages before `before` (or the latest), returned oldest first.
export async function getMessages(conversationId: string, before?: string) {
  const supabase = await createClient();
  let query = supabase
    .from("messages")
    .select("id, sender_id, body, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(PAGE + 1);
  if (before) query = query.lt("created_at", before);
  const { data, error } = await query;
  if (error) throw new Error(`Could not load messages: ${error.message}`);
  const hasMore = data.length > PAGE;
  return { messages: data.slice(0, PAGE).reverse() as ChatMessage[], hasMore };
}
