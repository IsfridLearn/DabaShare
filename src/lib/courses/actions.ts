"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { formValues, friendlyDbError, validationError, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { isUuid } from "./queries";
import { courseSchema, enrollmentNoteSchema } from "./validation";

async function userOrRedirect() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

const uuid = z.string().refine(isUuid);

export async function createCourse(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await userOrRedirect();
  const parsed = courseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);
  const { skills, ...course } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .insert({ ...course, owner_id: user.id })
    .select("id")
    .single();
  if (error) {
    console.error("Create course failed", error.code, error.message);
    return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  }

  const { error: skillError } = await supabase.rpc("set_course_skills", {
    target_course: data.id,
    skill_names: skills,
  });
  // The course exists either way; skills can be fixed from the edit page.
  redirect(`/courses/${data.id}${skillError ? "?notice=skills-failed" : "?notice=created"}`);
}

export async function updateCourse(courseId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await userOrRedirect();
  if (!uuid.safeParse(courseId).success) return { status: "error", message: "That course doesn't exist." };
  const parsed = courseSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);
  const { skills, ...course } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .update(course)
    .eq("id", courseId)
    .eq("owner_id", user.id)
    .select("id");
  if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
  if (!data.length) return { status: "error", message: "You can only edit your own courses." };

  const { error: skillError } = await supabase.rpc("set_course_skills", {
    target_course: courseId,
    skill_names: skills,
  });
  if (skillError) {
    return { status: "error", message: `Course saved, but skills weren't: ${friendlyDbError(skillError)}`, values: formValues(formData) };
  }
  redirect(`/courses/${courseId}?notice=updated`);
}

export async function deleteCourse(courseId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await userOrRedirect();
  if (!uuid.safeParse(courseId).success) return { status: "error", message: "That course doesn't exist." };
  if (formData.get("confirm") !== "on") {
    return { status: "error", message: "Tick the box to confirm you want to delete this course." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .delete()
    .eq("id", courseId)
    .eq("owner_id", user.id)
    .select("id");
  if (error) return { status: "error", message: friendlyDbError(error) };
  if (!data.length) return { status: "error", message: "You can only delete your own courses." };
  redirect("/courses/mine?notice=deleted");
}

// Enroll, or re-request after cancelling. Free courses are accepted at once,
// paid ones wait for the tutor; the database decides (see DATABASE.md).
export async function enroll(courseId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const user = await userOrRedirect();
  if (!uuid.safeParse(courseId).success) return { status: "error", message: "That course doesn't exist." };
  const parsed = enrollmentNoteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("course_enrollments")
    .select("id, status")
    .eq("course_id", courseId)
    .eq("student_id", user.id)
    .maybeSingle();

  const { error } = existing
    ? await supabase.from("course_enrollments").update({ status: "requested" }).eq("id", existing.id)
    : await supabase
        .from("course_enrollments")
        .insert({ course_id: courseId, student_id: user.id, note: parsed.data.note || null });
  if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };

  refresh();
  return { status: "success" };
}

export async function cancelEnrollment(enrollmentId: string): Promise<void> {
  const user = await userOrRedirect();
  if (!uuid.safeParse(enrollmentId).success) return;
  const supabase = await createClient();
  const { error } = await supabase
    .from("course_enrollments")
    .update({ status: "cancelled" })
    .eq("id", enrollmentId)
    .eq("student_id", user.id);
  if (error) throw new Error(friendlyDbError(error, "We couldn't cancel that enrollment."));
  refresh();
}

const decisionSchema = z.enum(["accepted", "declined"]);

// Tutor accepts or declines a request (or removes an accepted student).
export async function decideEnrollment(enrollmentId: string, decision: "accepted" | "declined"): Promise<void> {
  await userOrRedirect();
  if (!uuid.safeParse(enrollmentId).success || !decisionSchema.safeParse(decision).success) return;
  const supabase = await createClient();
  // RLS limits updates to the student or the course owner; the trigger only
  // lets the owner accept/decline.
  const { error } = await supabase.from("course_enrollments").update({ status: decision }).eq("id", enrollmentId);
  if (error) throw new Error(friendlyDbError(error, "We couldn't update that request."));
  refresh();
}
