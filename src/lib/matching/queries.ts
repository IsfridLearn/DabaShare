import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { MATCH_PAGE_SIZE, type MatchFilters } from "./filters";

export type Match = Database["public"]["Functions"]["suggest_matches"]["Returns"][number];

export async function getMatches(filters: MatchFilters) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("suggest_matches", {
    filter_mode: filters.mode,
    same_university_only: filters.sameUni,
    page_size: MATCH_PAGE_SIZE,
    page_offset: (filters.page - 1) * MATCH_PAGE_SIZE,
  });
  if (error) throw new Error(`Could not load matches: ${error.message}`);
  return { matches: data, total: Number(data[0]?.total_count ?? 0) };
}

// How complete the caller's matching inputs are (drives the "add skills" prompt).
export async function getMyMatchingInputs(userId: string) {
  const supabase = await createClient();
  const [skills, interests] = await Promise.all([
    supabase.from("student_skills").select("kind").eq("profile_id", userId),
    supabase.from("profile_interests").select("category_id", { count: "exact", head: true }).eq("profile_id", userId),
  ]);
  const kinds = skills.data ?? [];
  return {
    teach: kinds.filter((s) => s.kind === "teach").length,
    learn: kinds.filter((s) => s.kind === "learn").length,
    interests: interests.count ?? 0,
  };
}
