import type { Enums, Json } from "@/lib/supabase/database.types";

export type NotificationRow = {
  id: string;
  type: Enums<"notification_type">;
  data: Json;
  actor_name: string | null;
  course_title: string | null;
  i_own_course: boolean;
  session_title: string | null;
  i_host_session: boolean;
};

function field(data: Json, key: string): string | undefined {
  if (data && typeof data === "object" && !Array.isArray(data)) {
    const value = (data as Record<string, Json | undefined>)[key];
    return typeof value === "string" ? value : undefined;
  }
  return undefined;
}

// One readable sentence per notification. The same type reads differently
// depending on whether you are the course owner / session host.
export function notificationText(n: NotificationRow): string {
  const who = n.actor_name ?? "A student";
  const course = n.course_title ?? "a course";
  const session = n.session_title ?? "a session";
  const status = field(n.data, "status");

  switch (n.type) {
    case "new_message":
      return `${who} sent you a message`;
    case "enrollment_created":
      return status === "accepted" ? `${who} enrolled in ${course}` : `${who} asked to join ${course}`;
    case "enrollment_updated":
      if (n.i_own_course) {
        if (status === "cancelled") return `${who} left ${course}`;
        if (status === "accepted") return `${who} enrolled in ${course}`;
        return `${who} asked to join ${course}`;
      }
      if (status === "accepted") return `${who} accepted your request for ${course}`;
      if (status === "declined") return `${who} declined your request for ${course}`;
      return `Your enrollment in ${course} was updated`;
    case "course_removed":
      return `${course} was removed by its tutor`;
    case "session_invitation":
      return `${who} invited you to ${session}`;
    case "session_request":
      return `${who} asked to join ${session}`;
    case "session_joined":
      return `${who} joined ${session}`;
    case "participation_updated":
      if (n.i_host_session) {
        if (status === "cancelled") return `${who} left ${session}`;
        if (status === "accepted") return `${who} accepted your invitation to ${session}`;
        if (status === "declined") return `${who} declined your invitation to ${session}`;
        return `${who} asked to join ${session}`;
      }
      if (status === "accepted") return `You're in! ${who} accepted you into ${session}`;
      if (status === "declined") return `${who} declined your place in ${session}`;
      return `Your place in ${session} was updated`;
    case "session_updated":
      return `${session} has a new time`;
    case "session_cancelled":
      return `${session} was cancelled`;
    case "new_follower":
      return `${who} started following you`;
    case "post_liked":
      return `${who} liked your post`;
    default:
      return "You have a new notification";
  }
}

// Where clicking the notification goes.
// new_follower goes to the follower's profile (the notification's actor).
export function notificationTarget(n: Pick<NotificationRow, "type" | "data"> & { actor_username?: string | null }): string {
  const post = field(n.data, "post_id");
  if (n.type === "new_follower") return n.actor_username ? `/u/${n.actor_username}` : "/notifications";
  if (n.type === "post_liked" && post) return `/posts/${post}`;
  const conversation = field(n.data, "conversation_id");
  const course = field(n.data, "course_id");
  const session = field(n.data, "session_id");
  if (n.type === "new_message" && conversation) return `/messages/${conversation}`;
  if (n.type === "course_removed") return "/courses/mine";
  if (course) return `/courses/${course}`;
  if (session) return `/sessions/${session}`;
  return "/notifications";
}
