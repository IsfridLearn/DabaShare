"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { isUuid } from "@/lib/courses/queries";
import { friendlyDbError, formValues, validationError, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { REPORT_REASONS, REPORT_TARGETS } from "./options";

const uuid = z.string().refine(isUuid);

async function userOrRedirect() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

// Blocking hides both profiles from each other, stops messages, and cancels
// shared enrollments and session places (database trigger).
export async function blockStudent(otherId: string): Promise<void> {
  const user = await userOrRedirect();
  if (!uuid.safeParse(otherId).success || otherId === user.id) redirect("/messages?notice=unavailable");
  const supabase = await createClient();
  const { error } = await supabase.from("blocks").upsert(
    { blocker_id: user.id, blocked_id: otherId },
    { onConflict: "blocker_id,blocked_id", ignoreDuplicates: true },
  );
  if (error) {
    console.error("Block failed", error.code, error.message);
    redirect("/messages?notice=unavailable");
  }
  redirect("/messages?notice=blocked");
}

export async function unblockStudent(otherId: string): Promise<void> {
  const user = await userOrRedirect();
  if (!uuid.safeParse(otherId).success) return;
  const supabase = await createClient();
  const { error } = await supabase.from("blocks").delete().match({ blocker_id: user.id, blocked_id: otherId });
  if (error) throw new Error("We couldn't unblock that student. Please try again.");
  refresh();
}

const reportSchema = z.object({
  targetType: z.enum(REPORT_TARGETS),
  targetId: uuid,
  reason: z.enum(REPORT_REASONS.map((r) => r.value) as [string, ...string[]], { error: "Choose a reason." }),
  details: z.string().trim().max(1000, { error: "Use at most 1,000 characters." }).default(""),
});

export async function fileReport(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await userOrRedirect();
  const parsed = reportSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);

  const supabase = await createClient();
  const { error } = await supabase.from("reports").insert({
    reporter_id: user.id,
    target_type: parsed.data.targetType,
    target_id: parsed.data.targetId,
    reason: parsed.data.reason as (typeof REPORT_REASONS)[number]["value"],
    details: parsed.data.details || null,
  });
  if (error) {
    if (error.code === "23505") return { status: "success", message: "You've already reported this. Thank you." };
    return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  }
  return {
    status: "success",
    message: "Thanks for letting us know. Our team will review it. You can also block this student.",
  };
}
