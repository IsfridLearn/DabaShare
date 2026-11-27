"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { cn } from "@/lib/cn";
import { setCompleted, type CompletionState } from "@/lib/courses/space-actions";

// "Mark as finished" for one student. Finishing lets them review the course.
export function CompletionToggle({ enrollmentId, completed, name }: { enrollmentId: string; completed: boolean; name: string }) {
  const [state, action] = useActionState<CompletionState, FormData>(setCompleted, {});
  return (
    <form action={action} className="flex flex-col items-end gap-1">
      <input type="hidden" name="enrollmentId" value={enrollmentId} />
      <input type="hidden" name="done" value={completed ? "0" : "1"} />
      <Submit completed={completed} name={name} />
      {state.error && (
        <p role="alert" className="max-w-56 text-right text-caption text-danger-ink">
          {state.error}
        </p>
      )}
    </form>
  );
}

function Submit({ completed, name }: { completed: boolean; name: string }) {
  const { pending } = useFormStatus();
  const shown = pending ? !completed : completed;
  return (
    <button
      type="submit"
      aria-pressed={shown}
      aria-label={shown ? `${name} finished the course. Undo` : `Mark ${name} as finished`}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-control border px-2.5 text-small font-medium transition-colors duration-150",
        shown
          ? "border-success/30 bg-success-soft text-success-ink hover:bg-success-soft/70"
          : "border-line-strong bg-surface text-fg hover:bg-subtle",
      )}
    >
      {shown && <Check className="size-3.5" aria-hidden="true" />}
      {shown ? "Finished" : "Mark as finished"}
    </button>
  );
}
