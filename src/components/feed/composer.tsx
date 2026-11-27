"use client";

import { Paperclip } from "lucide-react";
import { useActionState, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { fieldError } from "@/components/ui/form-message";
import { createPost } from "@/lib/feed/actions";
import type { AttachOption } from "@/lib/feed/queries";
import { POST_MAX } from "@/lib/feed/validation";
import { initialFormState } from "@/lib/forms";
import { cn } from "@/lib/cn";

// Post box at the top of Home. Text plus, optionally, one of your own
// upcoming sessions or published courses.
export function Composer({
  name,
  avatarPath,
  sessions,
  courses,
  autoFocus = false,
}: {
  name: string;
  avatarPath: string | null;
  sessions: AttachOption[];
  courses: AttachOption[];
  /** Set by the sidebar's "New post" link (/home?compose=1). */
  autoFocus?: boolean;
}) {
  const [state, action, pending] = useActionState(createPost, initialFormState);
  // Typed length, tied to the action result it was typed after. React resets
  // the form after each action, so a new result means the box was re-filled.
  const [typed, setTyped] = useState<{ state: typeof state; length: number } | null>(null);
  const length = typed && typed.state === state ? typed.length : (state.values?.body?.length ?? 0);
  const canAttach = sessions.length > 0 || courses.length > 0;


  const bodyError = fieldError(state, "body");
  const attachError = fieldError(state, "attachment");
  const error = bodyError ?? attachError ?? (state.status === "error" ? state.message : undefined);
  const near = length > POST_MAX - 200;
  // The tools stay open while there's something to act on.
  const open = autoFocus || length > 0 || Boolean(error);

  // One quiet line until you start writing; the tools open on focus (pure
  // CSS, so it also works before JavaScript loads).
  return (
    <form
      action={action}
      className="group/composer rounded-card border border-line bg-surface px-3 py-2.5 transition-colors duration-150 focus-within:border-line-strong sm:px-4"
    >
      <div className="flex items-start gap-3">
        <Avatar name={name} path={avatarPath} size={32} />
        <div className="min-w-0 flex-1">
          <label htmlFor="post-body" className="sr-only">
            Write a post
          </label>
          <textarea
            id="post-body"
            name="body"
            rows={1}
            maxLength={POST_MAX}
            required
            autoFocus={autoFocus}
            defaultValue={state.values?.body ?? ""}
            onInput={(e) => setTyped({ state, length: e.currentTarget.value.length })}
            placeholder="Share a study tip, an event, or what you're learning…"
            aria-invalid={Boolean(bodyError) || undefined}
            aria-describedby={error ? "post-message" : undefined}
            className="field-sizing-content block max-h-80 min-h-8 w-full resize-none bg-transparent py-1 text-fg placeholder:text-fg-subtle focus:outline-none"
          />
        </div>
      </div>
      <div
        className={cn(
          "mt-2.5 hidden flex-wrap items-center gap-2 border-t border-line pt-2.5 sm:pl-11",
          "group-focus-within/composer:flex",
          open && "flex",
        )}
      >
        {canAttach && (
          <label className="flex min-w-0 flex-1 items-center gap-2 text-small text-fg-muted">
            <Paperclip className="size-4 shrink-0" aria-hidden="true" />
            <span className="sr-only">Attach</span>
            <select
              name="attachment"
              defaultValue={state.values?.attachment ?? ""}
              aria-invalid={Boolean(attachError) || undefined}
              className="h-8 min-w-0 max-w-full flex-1 truncate rounded-control border border-line-strong bg-surface px-2 text-small text-fg sm:flex-none"
            >
              <option value="">No attachment</option>
              {sessions.length > 0 && (
                <optgroup label="Your upcoming sessions">
                  {sessions.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              )}
              {courses.length > 0 && (
                <optgroup label="Your published courses">
                  {courses.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </label>
        )}
        <div className="ml-auto flex items-center gap-3">
          {near && (
            <span className={length >= POST_MAX ? "text-caption text-danger-ink" : "text-caption text-fg-subtle"}>
              {(POST_MAX - length).toLocaleString("en-US")} left
            </span>
          )}
          <Button type="submit" size="sm" loading={pending}>
            Post
          </Button>
        </div>
      </div>
      <p id="post-message" role={error ? "alert" : "status"} className={error ? "mt-2 text-small text-danger-ink sm:pl-11" : "sr-only"}>
        {error ?? (state.status === "success" ? state.message : "")}
      </p>
    </form>
  );
}
