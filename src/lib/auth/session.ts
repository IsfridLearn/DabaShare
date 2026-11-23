import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/database.types";

export type SessionUser = { id: string; email: string | null };
export type Profile = Tables<"profiles">;

// Verified identity of the current request (getClaims checks the JWT
// signature). Memoised per request so layouts and pages share one lookup.
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  return {
    id: data.claims.sub,
    email: typeof data.claims.email === "string" ? data.claims.email : null,
  };
});

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

export const getMyProfile = cache(async (): Promise<Profile | null> => {
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  return data;
});

// For pages that need a finished profile: sends new users to onboarding.
// A valid token with no profile means the account was deleted elsewhere.
export async function requireOnboardedProfile(): Promise<Profile> {
  await requireUser();
  const profile = await getMyProfile();
  if (!profile) redirect("/auth/signout");
  if (!profile.onboarded_at) redirect("/onboarding");
  return profile;
}
