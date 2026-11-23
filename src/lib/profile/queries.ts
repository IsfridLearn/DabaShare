import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Enums, Tables } from "@/lib/supabase/database.types";

export type SkillKind = Enums<"skill_kind">;
export type SkillRef = { id: number; name: string };
export type ProfileDetails = Tables<"profiles"> & {
  university: { name: string; short_name: string } | null;
  teaches: SkillRef[];
  learns: SkillRef[];
  interestIds: number[];
};

const DETAILS_SELECT =
  "*, university:universities(name, short_name), student_skills(kind, skill:skills(id, name)), profile_interests(category_id)";

type RawDetails = Tables<"profiles"> & {
  university: { name: string; short_name: string } | null;
  student_skills: { kind: SkillKind; skill: SkillRef | null }[];
  profile_interests: { category_id: number }[];
};

function shape(raw: RawDetails): ProfileDetails {
  const { student_skills, profile_interests, ...profile } = raw;
  const byKind = (kind: SkillKind) =>
    student_skills
      .filter((s) => s.kind === kind && s.skill)
      .map((s) => s.skill as SkillRef)
      .sort((a, b) => a.name.localeCompare(b.name));
  return {
    ...profile,
    teaches: byKind("teach"),
    learns: byKind("learn"),
    interestIds: profile_interests.map((i) => i.category_id),
  };
}

// RLS decides visibility: blocked users and unfinished profiles return null.
export async function getProfileDetailsById(id: string): Promise<ProfileDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(DETAILS_SELECT)
    .eq("id", id)
    .maybeSingle<RawDetails>();
  if (error) throw new Error(`Could not load profile: ${error.message}`);
  return data ? shape(data) : null;
}

export async function getProfileDetailsByUsername(username: string): Promise<ProfileDetails | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(DETAILS_SELECT)
    .eq("username", username.toLowerCase())
    .maybeSingle<RawDetails>();
  if (error) throw new Error(`Could not load profile: ${error.message}`);
  return data ? shape(data) : null;
}

// Canonical skill names for autocomplete (members only, so session-based).
export async function getSkillNames(): Promise<string[]> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("skills").select("name").order("name").limit(1000);
  if (error) throw new Error(`Could not load skills: ${error.message}`);
  return data.map((s) => s.name);
}
