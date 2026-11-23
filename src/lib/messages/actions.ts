"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { isUuid } from "@/lib/courses/queries";
import { friendlyDbError, formValues, validationError, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { messageSchema } from "./format";
import { getMessages, type ChatMessage } from "./queries";

const uuid = z.string().refine(isUuid);

async function userOrRedirect() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

// "Message" buttons: opens the existing conversation or creates one.
export async function startConversation(otherId: string): Promise<void> {
  await userOrRedirect();
  if (!uuid.safeParse(otherId).success) redirect("/messages?notice=unavailable");
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("start_direct_conversation", { other_id: otherId });
  if (error || !data) redirect("/messages?notice=unavailable");
  redirect(`/messages/${data}`);
}

export type SendState = FormState & { sent?: ChatMessage };

// A real form action (works without JavaScript); with JavaScript the chat
// window appends `sent` immediately and realtime de-duplicates it.
export async function sendMessage(conversationId: string, _prev: SendState, formData: FormData): Promise<SendState> {
  const user = await userOrRedirect();
  if (!uuid.safeParse(conversationId).success) return { status: "error", message: "That conversation doesn't exist." };
  const parsed = messageSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, body: parsed.data.body })
    .select("id, sender_id, body, created_at")
    .single();
  if (error) {
    // RLS rejection = not a member or a block exists.
    const message =
      error.code === "42501" ? "You can't send messages in this conversation." : friendlyDbError(error);
    return { status: "error", message, values: formValues(formData) };
  }
  return { status: "success", sent: data };
}

export async function markConversationRead(conversationId: string): Promise<void> {
  await userOrRedirect();
  if (!uuid.safeParse(conversationId).success) return;
  const supabase = await createClient();
  await supabase.rpc("mark_conversation_read", { target: conversationId });
}

// Hides the conversation from your inbox until a newer message arrives.
export async function hideConversation(conversationId: string): Promise<void> {
  const user = await userOrRedirect();
  if (!uuid.safeParse(conversationId).success) redirect("/messages");
  const supabase = await createClient();
  await supabase
    .from("conversation_members")
    .update({ hidden_at: new Date().toISOString() })
    .match({ conversation_id: conversationId, profile_id: user.id });
  redirect("/messages?notice=hidden");
}

export async function loadOlderMessages(conversationId: string, before: string) {
  await userOrRedirect();
  if (!uuid.safeParse(conversationId).success || !z.iso.datetime({ offset: true }).safeParse(before).success) {
    return { messages: [] as ChatMessage[], hasMore: false };
  }
  return getMessages(conversationId, before);
}
