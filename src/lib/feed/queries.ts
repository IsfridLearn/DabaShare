import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/database.types";
import { FEED_PAGE, type FeedCursor, type FeedScope } from "./validation";

export type FeedPost = Database["public"]["Functions"]["feed_posts"]["Returns"][number];
export type Social = Database["public"]["Functions"]["profile_social"]["Returns"][number];

// One page of the feed (newest first). RLS hides posts by anyone who is
// unfinished or in a block relationship with the viewer.
export async function getFeed(scope: FeedScope, cursor: FeedCursor | null = null, onlyAuthor?: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("feed_posts", {
    scope,
    before_ts: cursor?.ts,
    before_id: cursor?.id,
    page_size: FEED_PAGE + 1,
    only_author: onlyAuthor,
  });
  if (error) throw new Error(`Could not load posts: ${error.message}`);
  const hasMore = data.length > FEED_PAGE;
  return { posts: hasMore ? data.slice(0, FEED_PAGE) : data, hasMore };
}

// A single post (permalink, notification target), shaped like a feed row.
export async function getPost(id: string, meId: string): Promise<FeedPost | null> {
  const supabase = await createClient();
  const [post, likes, mine] = await Promise.all([
    supabase
      .from("posts")
      .select(
        "id, body, created_at, edited_at, author_id, session_id, course_id, " +
          "author:profiles!posts_author_id_fkey(display_name, username, avatar_path, program, university:universities(short_name)), " +
          "session:study_sessions(title, starts_at, type), course:courses(title, price_php)",
      )
      .eq("id", id)
      .maybeSingle<PostRow>(),
    supabase.from("post_likes").select("post_id", { count: "exact", head: true }).eq("post_id", id),
    supabase.from("post_likes").select("post_id").eq("post_id", id).eq("profile_id", meId).maybeSingle(),
  ]);
  const p = post.data;
  if (!p || !p.author) return null;
  return {
    id: p.id,
    body: p.body,
    created_at: p.created_at,
    edited_at: p.edited_at as string,
    author_id: p.author_id,
    author_name: p.author.display_name,
    author_username: p.author.username as string,
    author_avatar: p.author.avatar_path as string,
    author_program: p.author.program as string,
    author_university: p.author.university?.short_name as string,
    like_count: likes.count ?? 0,
    liked_by_me: Boolean(mine.data),
    session_id: (p.session ? p.session_id : null) as string,
    session_title: p.session?.title as string,
    session_starts_at: p.session?.starts_at as string,
    session_type: p.session?.type as FeedPost["session_type"],
    course_id: (p.course ? p.course_id : null) as string,
    course_title: p.course?.title as string,
    course_price: p.course?.price_php as number,
  };
}

type PostRow = {
  id: string;
  body: string;
  created_at: string;
  edited_at: string | null;
  author_id: string;
  session_id: string | null;
  course_id: string | null;
  author: {
    display_name: string;
    username: string | null;
    avatar_path: string | null;
    program: string | null;
    university: { short_name: string } | null;
  } | null;
  session: { title: string; starts_at: string; type: FeedPost["session_type"] } | null;
  course: { title: string; price_php: number } | null;
};

export async function getSocial(profileId: string): Promise<Social> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("profile_social", { target: profileId });
  return data?.[0] ?? { followers: 0, following: 0, i_follow: false, follows_me: false };
}

export type AttachOption = { value: string; label: string };

// What the composer can attach: your upcoming sessions and published courses.
export async function getAttachOptions(meId: string): Promise<{ sessions: AttachOption[]; courses: AttachOption[] }> {
  const supabase = await createClient();
  const [sessions, courses] = await Promise.all([
    supabase
      .from("study_sessions")
      .select("id, title")
      .eq("host_id", meId)
      .eq("status", "scheduled")
      .gt("ends_at", new Date().toISOString())
      .order("starts_at")
      .limit(20),
    supabase
      .from("courses")
      .select("id, title")
      .eq("owner_id", meId)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);
  return {
    sessions: (sessions.data ?? []).map((s) => ({ value: `session:${s.id}`, label: s.title })),
    courses: (courses.data ?? []).map((c) => ({ value: `course:${c.id}`, label: c.title })),
  };
}

// Ids of everyone the viewer follows (to leave them out of suggestions).
export async function getFollowingIds(meId: string): Promise<Set<string>> {
  const supabase = await createClient();
  const { data } = await supabase.from("follows").select("followee_id").eq("follower_id", meId).limit(1000);
  return new Set((data ?? []).map((f) => f.followee_id));
}
