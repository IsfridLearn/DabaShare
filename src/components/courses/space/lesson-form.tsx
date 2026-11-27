"use client";

import { Plus } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { errorProps, fieldError, FormMessage } from "@/components/ui/form-message";
import { addLesson } from "@/lib/courses/space-actions";
import { initialFormState } from "@/lib/forms";
import { DURATIONS, durationLabel } from "@/lib/sessions/validation";

// Tutor only. Folded away so the schedule stays the focus; opens again on an
// error so nothing typed is lost.
export function LessonForm({ courseId, minDate, free }: { courseId: string; minDate: string; free: boolean }) {
  const [state, action, pending] = useActionState(addLesson.bind(null, courseId), initialFormState);
  const val = (k: string) => (state.status === "error" ? state.values?.[k] : undefined);

  return (
    <details className="group rounded-card border border-line bg-surface" open={state.status === "error" || undefined}>
      <summary className="flex cursor-pointer list-none items-center gap-2 px-4 py-3 text-small font-medium text-fg [&::-webkit-details-marker]:hidden">
        <Plus className="size-4 text-brand-ink transition-transform duration-150 group-open:rotate-45" aria-hidden="true" />
        Add a lesson
      </summary>
      <form action={action} className="flex flex-col gap-4 border-t border-line p-4" noValidate>
        <FormMessage state={state} successAs="toast" />
        <Field label="Title" htmlFor="lesson-title" error={fieldError(state, "title")}>
          <Input id="lesson-title" name="title" maxLength={120} placeholder="e.g. Week 1: Variables and loops" defaultValue={val("title")} required {...errorProps(state, "title")} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Date" htmlFor="lesson-date" error={fieldError(state, "date")}>
            <Input id="lesson-date" name="date" type="date" min={minDate} defaultValue={val("date")} required {...errorProps(state, "date")} />
          </Field>
          <Field label="Start time (PH)" htmlFor="lesson-time" error={fieldError(state, "time")}>
            <Input id="lesson-time" name="time" type="time" defaultValue={val("time")} required {...errorProps(state, "time")} />
          </Field>
          <Field label="Duration" htmlFor="lesson-duration" error={fieldError(state, "duration")}>
            <Select id="lesson-duration" name="duration" defaultValue={val("duration") ?? "60"} {...errorProps(state, "duration")}>
              {DURATIONS.map((d) => (
                <option key={d} value={d}>
                  {durationLabel(d)}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field
          label="Place or meeting link (optional)"
          htmlFor="lesson-location"
          error={fieldError(state, "location")}
          hint={
            free
              ? "A room, or a link such as https://meet.google.com/… Only enrolled students see it, and anyone can join a free course."
              : "A room, or a link such as https://meet.google.com/… Only enrolled students see it."
          }
        >
          <Input id="lesson-location" name="location" maxLength={300} defaultValue={val("location")} {...errorProps(state, "location")} />
        </Field>
        <Field label="Notes (optional)" htmlFor="lesson-notes" error={fieldError(state, "notes")}>
          <Textarea id="lesson-notes" name="notes" rows={2} maxLength={1000} placeholder="What to prepare or bring" defaultValue={val("notes")} {...errorProps(state, "notes")} />
        </Field>
        <div>
          <Button type="submit" loading={pending}>
            {pending ? "Adding…" : "Add lesson"}
          </Button>
        </div>
      </form>
    </details>
  );
}
