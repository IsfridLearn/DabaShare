"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getSessionUser } from "@/lib/auth/session";
import { isUuid } from "@/lib/courses/queries";
import { friendlyDbError, formValues, validationError, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { getFeed, type FeedPost } from "./queries";
import { parseAttachment, parseCursor, parseScope, postSchema } from "./validation";

const uuid = z.string().refine(isUuid);
const SIGNED_OUT = "Your session expired. Please log in again.";

// All feed actions are form actions (useActionState), so they also work
// before JavaScript loads. The database (RLS + triggers) enforces the rules.

export async function createPost(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) return { status: "error", message: SIGNED_OUT };
  const parsed = postSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);
  const attachment = parseAttachment(parsed.data.attachment);
  if (attachment === "invalid") {
    return { status: "error", fieldErrors: { attachment: ["Choose something from the list."] }, values: formValues(formData) };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("posts").insert({
    author_id: user.id,
    body: parsed.data.body,
    session_id: attachment?.kind === "session" ? attachment.id : null,
    course_id: attachment?.kind === "course" ? attachment.id : null,
  });
  if (error) {
    // 42501 = RLS: the profile isn't finished yet.
    const message = error.code === "42501" ? "Finish your profile before posting." : friendlyDbError(error);
    return { status: "error", message, values: formValues(formData) };
  }
  refresh();
  return { status: "success", message: "Posted." };
}

export type DeleteState = { deleted: boolean; error?: string };

export async function deletePost(_prev: DeleteState, formData: FormData): Promise<DeleteState> {
  const user = await getSessionUser();
  if (!user) return { deleted: false, error: SIGNED_OUT };
  const postId = formData.get("postId");
  if (!uuid.safeParse(postId).success) return { deleted: false, error: "That post doesn't exist." };
  const supabase = await createClient();
  // RLS only lets authors delete; the author filter makes the intent explicit.
  const { error, count } = await supabase
    .from("posts")
    .delete({ count: "exact" })
    .eq("id", postId as string)
    .eq("author_id", user.id);
  if (error || !count) return { deleted: false, error: "We couldn't delete that post. Please try again." };
  return { deleted: true };
}

export type LikeState = { liked: boolean; count: number; error?: string };

export async function toggleLike(prev: LikeState, formData: FormData): Promise<LikeState> {
  const user = await getSessionUser();
  if (!user) return { ...prev, error: SIGNED_OUT };
  const postId = formData.get("postId");
  if (!uuid.safeParse(postId).success) return { ...prev, error: "That post doesn't exist." };
  const id = postId as string;
  const like = formData.get("like") === "1";

  const supabase = await createClient();
  const { error } = like
    ? await supabase
        .from("post_likes")
        .upsert({ post_id: id, profile_id: user.id }, { onConflict: "post_id,profile_id", ignoreDuplicates: true })
    : await supabase.from("post_likes").delete().match({ post_id: id, profile_id: user.id });
  if (error) return { ...prev, error: "That post isn't available anymore." };

  const { count } = await supabase.from("post_likes").select("post_id", { count: "exact", head: true }).eq("post_id", id);
  return { liked: like, count: count ?? prev.count };
}

export type FollowState = { following: boolean; error?: string };

export async function toggleFollow(prev: FollowState, formData: FormData): Promise<FollowState> {
  const user = await getSessionUser();
  if (!user) return { ...prev, error: SIGNED_OUT };
  const profileId = formData.get("profileId");
  if (!uuid.safeParse(profileId).success || profileId === user.id) return { ...prev, error: "You can't follow that student." };
  const id = profileId as string;
  const follow = formData.get("follow") === "1";

  const supabase = await createClient();
  const { error } = follow
    ? await supabase
        .from("follows")
        .upsert({ follower_id: user.id, followee_id: id }, { onConflict: "follower_id,followee_id", ignoreDuplicates: true })
    : await supabase.from("follows").delete().match({ follower_id: user.id, followee_id: id });
  if (error) return { ...prev, error: friendlyDbError(error, "You can't follow that student right now.") };
  // Follower counts and suggestions are server-rendered.
  refresh();
  return { following: follow };
}

// "Load more": the next page after the last post the client has.
export async function loadMorePosts(
  scope: string,
  cursorTs: string,
  cursorId: string,
  onlyAuthor?: string,
): Promise<{ posts: FeedPost[]; hasMore: boolean }> {
  const user = await getSessionUser();
  const cursor = parseCursor(cursorTs, cursorId);
  if (!user || !cursor) return { posts: [], hasMore: false };
  const author = onlyAuthor && uuid.safeParse(onlyAuthor).success ? onlyAuthor : undefined;
  return getFeed(parseScope(scope), cursor, author);
}
