"use client";

import { Heart } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";
import { toggleLike, type LikeState } from "@/lib/feed/actions";

// Like toggle. A real form (works before JS loads); while the request runs
// the button already shows the new state.
export function LikeButton({ postId, liked, count }: { postId: string; liked: boolean; count: number }) {
  const [state, action] = useActionState(toggleLike, { liked, count });
  return (
    <form action={action} className="inline-flex items-center gap-2">
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="like" value={state.liked ? "0" : "1"} />
      <LikeSubmit state={state} />
      {state.error && (
        <span role="alert" className="text-caption text-danger-ink">
          {state.error}
        </span>
      )}
    </form>
  );
}

function LikeSubmit({ state }: { state: LikeState }) {
  const { pending } = useFormStatus();
  const liked = pending ? !state.liked : state.liked;
  const count = pending ? Math.max(0, state.count + (state.liked ? -1 : 1)) : state.count;
  return (
    <button
      type="submit"
      aria-pressed={liked}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-control px-2 text-small font-medium transition-colors duration-150",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand",
        liked ? "text-rose-600 hover:bg-subtle dark:text-rose-400" : "text-fg-muted hover:bg-subtle hover:text-fg",
      )}
    >
      <Heart className={cn("size-4", liked && "fill-current")} aria-hidden="true" />
      <span>{liked ? "Liked" : "Like"}</span>
      {count > 0 && (
        <span aria-hidden="true" className="text-fg-subtle tabular-nums">
          {count.toLocaleString("en-US")}
        </span>
      )}
      <span className="sr-only">
        , {count} {count === 1 ? "like" : "likes"}
      </span>
    </button>
  );
}
