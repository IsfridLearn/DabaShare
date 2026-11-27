"use client";

import { Star } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { errorProps, fieldError, FormMessage } from "@/components/ui/form-message";
import { saveReview } from "@/lib/courses/space-actions";
import { REVIEW_MAX } from "@/lib/courses/space-validation";
import { initialFormState } from "@/lib/forms";

// Five real radio buttons styled as chips: keyboard and screen readers get a
// normal "Rating" group, and it works before JavaScript loads.
export function ReviewForm({ courseId, existing }: { courseId: string; existing: { rating: number; body: string | null } | null }) {
  const [state, action, pending] = useActionState(saveReview.bind(null, courseId), initialFormState);
  const rating = state.status === "error" ? state.values?.rating : existing ? String(existing.rating) : undefined;
  const body = state.status === "error" ? state.values?.body : (existing?.body ?? "");
  const ratingError = fieldError(state, "rating");

  return (
    <form action={action} className="flex flex-col gap-4 rounded-card border border-line bg-surface p-4 sm:p-5" noValidate>
      <FormMessage state={state} successAs="toast" />
      <fieldset aria-describedby={ratingError ? "rating-message" : undefined}>
        <legend className="mb-2 text-small font-medium text-fg">{existing ? "Your rating" : "How was this course?"}</legend>
        <div className="flex flex-wrap gap-1.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <label
              key={n}
              className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-control border border-line-strong bg-surface px-3 text-small font-medium text-fg-muted transition-colors duration-150 hover:bg-subtle has-checked:border-fg has-checked:bg-fg has-checked:text-canvas has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand"
            >
              <input type="radio" name="rating" value={n} defaultChecked={rating === String(n)} className="sr-only" />
              <Star className="size-3.5 fill-current" aria-hidden="true" />
              {n}
              <span className="sr-only">{n === 1 ? "star" : "stars"}</span>
            </label>
          ))}
        </div>
        {ratingError && (
          <p id="rating-message" className="mt-1.5 text-small text-danger-ink">
            {ratingError}
          </p>
        )}
      </fieldset>
      <Field label="What should other students know? (optional)" htmlFor="review-body" error={fieldError(state, "body")}>
        <Textarea id="review-body" name="body" rows={3} maxLength={REVIEW_MAX} defaultValue={body} {...errorProps(state, "body")} />
      </Field>
      <div>
        <Button type="submit" loading={pending}>
          {pending ? "Saving…" : existing ? "Update review" : "Post review"}
        </Button>
      </div>
    </form>
  );
}
