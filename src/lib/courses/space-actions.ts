"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { formValues, friendlyDbError, validationError, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "./queries";
import { lessonSchema, reviewSchema, updateSchema } from "./space-validation";

// Course space actions. zod gives friendly messages; RLS, grants and the
// triggers in 20261202090000_course_space.sql are the security boundary.

async function userOrRedirect() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

const uuid = z.string().refine(isUuid);
const bad = (message = "Something went wrong. Please try again."): FormState => ({ status: "error", message });

// ── Lessons ─────────────────────────────────────────────────────────────────
export async function addLesson(courseId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await userOrRedirect();
  if (!uuid.safeParse(courseId).success) return bad();
  const parsed = lessonSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);

  const supabase = await createClient();
  const { error } = await supabase.from("course_lessons").insert({ course_id: courseId, ...parsed.data });
  if (error) {
    console.error("Add lesson failed", error.code, error.message);
    return { status: "error", message: friendlyDbError(error, "We couldn't add that lesson."), values: formValues(formData) };
  }
  refresh();
  return { status: "success", message: "Lesson added. Your students were notified." };
}

export async function deleteLesson(lessonId: string): Promise<void> {
  await userOrRedirect();
  if (!uuid.safeParse(lessonId).success) return;
  const supabase = await createClient();
  const { error } = await supabase.from("course_lessons").delete().eq("id", lessonId);
  if (error) throw new Error(friendlyDbError(error, "We couldn't remove that lesson."));
  refresh();
}

// ── Updates ─────────────────────────────────────────────────────────────────
export async function postUpdate(courseId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await userOrRedirect();
  if (!uuid.safeParse(courseId).success) return bad();
  const parsed = updateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);

  const supabase = await createClient();
  const { error } = await supabase
    .from("course_updates")
    .insert({ course_id: courseId, author_id: user.id, body: parsed.data.body, link_url: parsed.data.link });
  if (error) {
    console.error("Post update failed", error.code, error.message);
    return { status: "error", message: friendlyDbError(error, "We couldn't post that update."), values: formValues(formData) };
  }
  refresh();
  return { status: "success", message: "Update posted." };
}

export async function deleteUpdate(updateId: string): Promise<void> {
  await userOrRedirect();
  if (!uuid.safeParse(updateId).success) return;
  const supabase = await createClient();
  const { error } = await supabase.from("course_updates").delete().eq("id", updateId);
  if (error) throw new Error(friendlyDbError(error, "We couldn't delete that update."));
  refresh();
}

// ── Completion ──────────────────────────────────────────────────────────────
// Returns the reason inline (e.g. "after a lesson has taken place") instead of
// throwing, so the tutor sees it next to the button.
export type CompletionState = { error?: string };

export async function setCompleted(_prev: CompletionState, formData: FormData): Promise<CompletionState> {
  await userOrRedirect();
  const enrollmentId = formData.get("enrollmentId");
  const done = formData.get("done") === "1";
  if (typeof enrollmentId !== "string" || !uuid.safeParse(enrollmentId).success) return { error: "Something went wrong." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("set_enrollment_completed", { target: enrollmentId, done });
  if (error) return { error: friendlyDbError(error, "We couldn't update that student.") };
  refresh();
  return {};
}

// ── Reviews ─────────────────────────────────────────────────────────────────
// One review per student per course: writes the first time, edits after.
export async function saveReview(courseId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await userOrRedirect();
  if (!uuid.safeParse(courseId).success) return bad();
  const parsed = reviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("course_reviews")
    .select("id")
    .eq("course_id", courseId)
    .eq("author_id", user.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("course_reviews").update(parsed.data).eq("id", existing.id)
    : await supabase.from("course_reviews").insert({ course_id: courseId, author_id: user.id, ...parsed.data });
  if (error) {
    console.error("Save review failed", error.code, error.message);
    const message = error.code === "42501" ? "Only students who finished this course can review it." : friendlyDbError(error);
    return { status: "error", message, values: formValues(formData) };
  }
  refresh();
  return { status: "success", message: existing ? "Review updated." : "Thanks! Your review is posted." };
}

export async function deleteReview(reviewId: string): Promise<void> {
  await userOrRedirect();
  if (!uuid.safeParse(reviewId).success) return;
  const supabase = await createClient();
  const { error } = await supabase.from("course_reviews").delete().eq("id", reviewId);
  if (error) throw new Error(friendlyDbError(error, "We couldn't delete your review."));
  refresh();
}
