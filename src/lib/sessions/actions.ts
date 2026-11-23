"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { usernameSchema } from "@/lib/auth/validation";
import { isUuid } from "@/lib/courses/queries";
import { friendlyDbError, formValues, validationError, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { sessionSchema } from "./validation";

const uuid = z.string().refine(isUuid);
type Supabase = Awaited<ReturnType<typeof createClient>>;

async function userOrRedirect() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

// study_session_links has no column grant on session_id for updates, so
// upsert is done as update-then-insert (and delete when the link is cleared).
async function saveMeetingUrl(supabase: Supabase, sessionId: string, url: string) {
  if (!url) {
    return supabase.from("study_session_links").delete().eq("session_id", sessionId);
  }
  const updated = await supabase.from("study_session_links").update({ meeting_url: url }).eq("session_id", sessionId).select("session_id");
  if (updated.error || updated.data.length) return updated;
  return supabase.from("study_session_links").insert({ session_id: sessionId, meeting_url: url });
}

export async function createSession(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await userOrRedirect();
  const parsed = sessionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_sessions")
    .insert({ ...parsed.data.session, host_id: user.id })
    .select("id")
    .single();
  if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };

  const link = await saveMeetingUrl(supabase, data.id, parsed.data.meetingUrl);
  redirect(`/sessions/${data.id}?notice=${link.error ? "link-failed" : "created"}`);
}

export async function updateSession(sessionId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await userOrRedirect();
  if (!uuid.safeParse(sessionId).success) return { status: "error", message: "That session doesn't exist." };
  const parsed = sessionSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_sessions")
    .update(parsed.data.session)
    .eq("id", sessionId)
    .eq("host_id", user.id)
    .select("id");
  if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  if (!data.length) return { status: "error", message: "You can only edit sessions you host." };

  const link = await saveMeetingUrl(supabase, sessionId, parsed.data.meetingUrl);
  if (link.error) return { status: "error", message: "Session saved, but the meeting link wasn't.", values: formValues(formData) };
  redirect(`/sessions/${sessionId}?notice=updated`);
}

export async function cancelSession(sessionId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await userOrRedirect();
  if (!uuid.safeParse(sessionId).success) return { status: "error", message: "That session doesn't exist." };
  if (formData.get("confirm") !== "on") {
    return { status: "error", message: "Tick the box to confirm. Everyone who joined will be notified." };
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_sessions")
    .update({ status: "cancelled" })
    .eq("id", sessionId)
    .eq("host_id", user.id)
    .select("id");
  if (error) return { status: "error", message: friendlyDbError(error) };
  if (!data.length) return { status: "error", message: "You can only cancel sessions you host." };
  redirect(`/sessions/${sessionId}?notice=cancelled`);
}

// Join (or request) a place; rejoin after leaving. The database decides
// between "accepted" and "requested" and enforces capacity.
export async function joinSession(sessionId: string): Promise<FormState> {
  const user = await userOrRedirect();
  if (!uuid.safeParse(sessionId).success) return { status: "error", message: "That session doesn't exist." };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("session_participants")
    .select("status")
    .eq("session_id", sessionId)
    .eq("profile_id", user.id)
    .maybeSingle();
  const { error } = existing
    ? await supabase.from("session_participants").update({ status: "accepted" }).match({ session_id: sessionId, profile_id: user.id })
    : await supabase.from("session_participants").insert({ session_id: sessionId, profile_id: user.id });
  if (error) return { status: "error", message: error.code === "23514" ? "This session is full." : friendlyDbError(error) };
  refresh();
  return { status: "success" };
}

const myResponse = z.enum(["accepted", "declined", "cancelled"]);

// Participant side: accept/decline an invitation, or leave/cancel a request.
export async function respondToSession(sessionId: string, response: "accepted" | "declined" | "cancelled"): Promise<void> {
  const user = await userOrRedirect();
  if (!uuid.safeParse(sessionId).success || !myResponse.safeParse(response).success) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("session_participants")
    .update({ status: response })
    .match({ session_id: sessionId, profile_id: user.id });
  if (error) throw new Error(error.code === "23514" ? "This session is full." : friendlyDbError(error));
  refresh();
}

const hostDecision = z.enum(["accepted", "declined"]);

// Host side: accept/decline a request, or remove an accepted participant.
export async function decideParticipant(sessionId: string, profileId: string, decision: "accepted" | "declined"): Promise<void> {
  await userOrRedirect();
  if (!uuid.safeParse(sessionId).success || !uuid.safeParse(profileId).success || !hostDecision.safeParse(decision).success) return;
  const supabase = await createClient();
  // RLS + trigger: only the host may make these changes.
  const { error } = await supabase
    .from("session_participants")
    .update({ status: decision })
    .match({ session_id: sessionId, profile_id: profileId });
  if (error) throw new Error(error.code === "23514" ? "This session is full." : friendlyDbError(error));
  refresh();
}

export async function inviteToSession(sessionId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await userOrRedirect();
  if (!uuid.safeParse(sessionId).success) return { status: "error", message: "That session doesn't exist." };
  const parsed = z.object({ username: usernameSchema }).safeParse({
    username: String(formData.get("username") ?? "").replace(/^@/, ""),
  });
  if (!parsed.success) return validationError(parsed.error, formData);

  const supabase = await createClient();
  const { data: profile } = await supabase.from("profiles").select("id").eq("username", parsed.data.username).maybeSingle();
  if (!profile) {
    return { status: "error", fieldErrors: { username: ["No student with that username."] }, values: formValues(formData) };
  }
  const { error } = await supabase.from("session_participants").insert({ session_id: sessionId, profile_id: profile.id });
  if (error) {
    const message = error.code === "23505" ? "That student is already on the list." : friendlyDbError(error);
    return { status: "error", message, values: formValues(formData) };
  }
  refresh();
  return { status: "success", message: `Invitation sent to @${parsed.data.username}.` };
}
