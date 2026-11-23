import "server-only";
import { isUuid } from "@/lib/courses/queries";
import { createClient } from "@/lib/supabase/server";
import type { Database, Enums } from "@/lib/supabase/database.types";
import type { SessionTab } from "./validation";

export type SessionListItem = Database["public"]["Functions"]["list_sessions"]["Returns"][number];
export const SESSIONS_PAGE = 12;

export async function listSessions(tab: SessionTab, page: number) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("list_sessions", {
    tab,
    page_size: SESSIONS_PAGE,
    page_offset: (page - 1) * SESSIONS_PAGE,
  });
  if (error) throw new Error(`Could not load sessions: ${error.message}`);
  return { sessions: data, total: Number(data[0]?.total_count ?? 0) };
}

type Person = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_path: string | null;
  university: { short_name: string } | null;
};

export type SessionDetail = {
  id: string;
  host_id: string;
  title: string;
  description: string;
  type: Enums<"session_type">;
  category_id: number | null;
  starts_at: string;
  ends_at: string;
  capacity: number;
  accepted_count: number;
  requires_approval: boolean;
  status: Enums<"session_status">;
  category: { name: string } | null;
  host: Person | null;
};

export type Participant = {
  profile_id: string;
  status: Enums<"participant_status">;
  invited_by: string | null;
  created_at: string;
  person: Person | null;
};

const PERSON = "id, display_name, username, avatar_path, university:universities(short_name)";

// RLS: hidden if the host blocked you (or you blocked them).
export async function getSession(id: string): Promise<SessionDetail | null> {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("study_sessions")
    .select(
      `id, host_id, title, description, type, category_id, starts_at, ends_at, capacity, accepted_count,
       requires_approval, status, category:categories(name), host:profiles!study_sessions_host_id_fkey(${PERSON})`,
    )
    .eq("id", id)
    .maybeSingle<SessionDetail>();
  if (error) throw new Error(`Could not load session: ${error.message}`);
  return data;
}

export async function getMyParticipation(sessionId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("session_participants")
    .select("status, invited_by")
    .eq("session_id", sessionId)
    .eq("profile_id", userId)
    .maybeSingle();
  return data;
}

// Visible only to the host and accepted participants (RLS); null otherwise.
export async function getMeetingUrl(sessionId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("study_session_links").select("meeting_url").eq("session_id", sessionId).maybeSingle();
  return data?.meeting_url ?? null;
}

// Host only (RLS).
export async function getParticipants(sessionId: string): Promise<Participant[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("session_participants")
    .select(`profile_id, status, invited_by, created_at, person:profiles!session_participants_profile_id_fkey(${PERSON})`)
    .eq("session_id", sessionId)
    .order("created_at")
    .returns<Participant[]>();
  if (error) throw new Error(`Could not load participants: ${error.message}`);
  return data;
}
