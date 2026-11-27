"use client";

import { UserCheck, UserPlus } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { buttonClasses } from "@/components/ui/button";
import { toggleFollow } from "@/lib/feed/actions";

type Size = "sm" | "md";

// Follow / Following toggle. A real form (works before JS loads); flips while
// the request runs, and the server refreshes the follower counts.
export function FollowButton({
  profileId,
  following,
  name,
  size = "sm",
  fullWidth = false,
  quiet = false,
}: {
  profileId: string;
  following: boolean;
  name: string;
  size?: Size;
  fullWidth?: boolean;
  /** In lists: an outlined "Follow" instead of a filled one. */
  quiet?: boolean;
}) {
  const [state, action] = useActionState(toggleFollow, { following });
  return (
    <form action={action} className={fullWidth ? "w-full" : undefined}>
      <input type="hidden" name="profileId" value={profileId} />
      <input type="hidden" name="follow" value={state.following ? "0" : "1"} />
      <FollowSubmit following={state.following} name={name} size={size} fullWidth={fullWidth} quiet={quiet} />
      {state.error && (
        <p role="alert" className="mt-1 text-caption text-danger-ink">
          {state.error}
        </p>
      )}
    </form>
  );
}

function FollowSubmit({
  following,
  name,
  size,
  fullWidth,
  quiet,
}: {
  following: boolean;
  name: string;
  size: Size;
  fullWidth: boolean;
  quiet: boolean;
}) {
  const { pending } = useFormStatus();
  const shown = pending ? !following : following;
  const Icon = shown ? UserCheck : UserPlus;
  return (
    <button
      type="submit"
      aria-pressed={shown}
      aria-label={shown ? `Following ${name}. Unfollow` : `Follow ${name}`}
      className={buttonClasses({ variant: shown ? (quiet ? "ghost" : "secondary") : quiet ? "secondary" : "primary", size, fullWidth })}
    >
      <Icon className="size-4" aria-hidden="true" />
      {shown ? "Following" : "Follow"}
    </button>
  );
}
