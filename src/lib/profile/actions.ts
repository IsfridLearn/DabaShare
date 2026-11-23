"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { profileSchema } from "@/lib/auth/validation";
import { formValues, friendlyDbError, validationError, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { AVATAR_BUCKET, isValidAvatarPath } from "./avatar";
import type { SkillKind } from "./queries";

// Every action re-checks the session: being rendered on a protected page is
// not proof of who is calling. RLS is still the final guard.
async function currentUserOrRedirect() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

function profileUpdate(data: z.infer<typeof profileSchema>) {
  return {
    username: data.username,
    display_name: data.displayName,
    university_id: data.universityId,
    program: data.program || null,
    bio: data.bio || null,
  };
}

function profileDbError(error: { code?: string; message: string }, formData: FormData): FormState {
  if (error.code === "23505") {
    return {
      status: "error",
      message: "Please fix the highlighted fields.",
      fieldErrors: { username: ["That username is taken. Try another one."] },
      values: formValues(formData),
    };
  }
  console.error("Profile update failed", error.code, error.message);
  return { status: "error", message: friendlyDbError(error), values: formValues(formData) };
}

export async function completeOnboarding(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUserOrRedirect();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ ...profileUpdate(parsed.data), onboarded_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("id");
  if (error) return profileDbError(error, formData);
  // No row updated: the account no longer exists (deleted on another device).
  if (!data.length) redirect("/auth/signout");

  redirect("/profile?notice=welcome");
}

export async function updateProfile(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUserOrRedirect();
  const parsed = profileSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(profileUpdate(parsed.data)).eq("id", user.id);
  if (error) return profileDbError(error, formData);

  refresh();
  return { status: "success", message: "Profile saved.", values: formValues(formData) };
}

const skillNameSchema = z.object({
  skill: z.string().trim().min(1, { error: "Type a skill first." }).max(50, { error: "Use at most 50 characters." }),
});

// Bound arguments come from the client too, so they are validated like form fields.
const skillKindSchema = z.enum(["teach", "learn"]);
const skillIdSchema = z.number().int().positive();

export async function addSkill(kind: SkillKind, _prev: FormState, formData: FormData): Promise<FormState> {
  await currentUserOrRedirect();
  const kindParsed = skillKindSchema.safeParse(kind);
  if (!kindParsed.success) return { status: "error", message: "That list doesn't exist." };
  const parsed = skillNameSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);

  const supabase = await createClient();
  const { error } = await supabase.rpc("add_student_skill", {
    skill_name: parsed.data.skill,
    skill_kind: kindParsed.data,
  });
  if (error) return { status: "error", message: friendlyDbError(error), values: formValues(formData) };

  refresh();
  return { status: "success" };
}

export async function removeSkill(kind: SkillKind, skillId: number): Promise<void> {
  const user = await currentUserOrRedirect();
  const kindParsed = skillKindSchema.safeParse(kind);
  const idParsed = skillIdSchema.safeParse(skillId);
  if (!kindParsed.success || !idParsed.success) return;

  const supabase = await createClient();
  const { error } = await supabase
    .from("student_skills")
    .delete()
    .match({ profile_id: user.id, skill_id: idParsed.data, kind: kindParsed.data });
  if (error) {
    console.error("Removing skill failed", error.code, error.message);
    throw new Error("We couldn't remove that skill. Please try again.");
  }
  refresh();
}

export async function saveInterests(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUserOrRedirect();
  const parsed = z
    .array(z.coerce.number().int().positive())
    .max(20)
    .safeParse(formData.getAll("categoryId"));
  if (!parsed.success) return { status: "error", message: "Those interests aren't valid." };
  const chosen = [...new Set(parsed.data)];

  const supabase = await createClient();
  // Add first, then remove the rest: a failed add never loses existing interests.
  if (chosen.length) {
    const { error } = await supabase
      .from("profile_interests")
      .upsert(
        chosen.map((category_id) => ({ profile_id: user.id, category_id })),
        { onConflict: "profile_id,category_id", ignoreDuplicates: true },
      );
    if (error) return { status: "error", message: friendlyDbError(error) };
  }

  let remove = supabase.from("profile_interests").delete().eq("profile_id", user.id);
  if (chosen.length) remove = remove.not("category_id", "in", `(${chosen.join(",")})`);
  const { error: removeError } = await remove;
  if (removeError) return { status: "error", message: friendlyDbError(removeError) };

  refresh();
  return { status: "success", message: "Interests saved." };
}

export async function setDiscoverable(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await currentUserOrRedirect();
  const discoverable = formData.get("discoverable") === "on";
  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update({ discoverable }).eq("id", user.id);
  if (error) return { status: "error", message: friendlyDbError(error) };
  refresh();
  return {
    status: "success",
    message: discoverable
      ? "Other students can now find you in matches and search."
      : "You're hidden from matches and search. People you already talk to can still see your profile.",
  };
}

// Called after the browser uploaded the file to avatars/<user id>/.
export async function setAvatar(path: string): Promise<{ error?: string }> {
  const user = await currentUserOrRedirect();
  if (!isValidAvatarPath(path, user.id)) return { error: "That upload isn't valid. Try again." };

  const supabase = await createClient();
  const fileName = path.slice(user.id.length + 1);
  const { data: found } = await supabase.storage.from(AVATAR_BUCKET).list(user.id, { search: fileName, limit: 1 });
  if (!found?.some((f) => f.name === fileName)) return { error: "That upload didn't finish. Try again." };

  const { data: before } = await supabase.from("profiles").select("avatar_path").eq("id", user.id).single();
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
  if (error) return { error: friendlyDbError(error) };

  if (before?.avatar_path && before.avatar_path !== path) {
    await supabase.storage.from(AVATAR_BUCKET).remove([before.avatar_path]);
  }
  refresh();
  return {};
}

export async function removeAvatar(): Promise<void> {
  const user = await currentUserOrRedirect();
  const supabase = await createClient();
  const { data: before } = await supabase.from("profiles").select("avatar_path").eq("id", user.id).single();
  await supabase.from("profiles").update({ avatar_path: null }).eq("id", user.id);
  if (before?.avatar_path) await supabase.storage.from(AVATAR_BUCKET).remove([before.avatar_path]);
  refresh();
}

// Removes every file in the user's avatar folder. Storage objects can't be
// deleted from SQL, so this must succeed before the account is deleted;
// otherwise public photos would outlive the account.
async function removeAllAvatarFiles(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  for (let round = 0; round < 50; round++) {
    const { data: files, error } = await supabase.storage.from(AVATAR_BUCKET).list(userId, { limit: 100 });
    if (error) return false;
    if (!files.length) return true;
    const { error: removeError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .remove(files.map((f) => `${userId}/${f.name}`));
    if (removeError) return false;
  }
  return false;
}

export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  await currentUserOrRedirect();
  if (formData.get("confirm") !== "DELETE") {
    return { status: "error", fieldErrors: { confirm: ["Type DELETE in capital letters to confirm."] } };
  }

  const supabase = await createClient();
  // Destructive: confirm with the auth server that the account is still live.
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/auth/signout");
  const userId = userData.user.id;

  await supabase.from("profiles").update({ avatar_path: null }).eq("id", userId);
  if (!(await removeAllAvatarFiles(supabase, userId))) {
    return { status: "error", message: "We couldn't remove your photos, so nothing was deleted. Please try again." };
  }

  const { error } = await supabase.rpc("delete_my_account");
  if (error) {
    console.error("Account deletion failed", error.code, error.message);
    return { status: "error", message: "We couldn't delete your account. Please try again." };
  }
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login?notice=account-deleted");
}
