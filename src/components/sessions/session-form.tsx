"use client";

import { useActionState } from "react";
import { initialFormState, type FormState } from "@/lib/forms";
import { DURATIONS, durationLabel, SESSION_TYPES } from "@/lib/sessions/validation";
import type { Category } from "@/lib/reference";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { errorProps, fieldError, FormMessage } from "@/components/ui/form-message";

export type SessionFormDefaults = {
  title: string;
  description: string;
  type: string;
  categoryId: string;
  date: string;
  time: string;
  duration: string;
  capacity: string;
  requiresApproval: boolean;
  meetingUrl: string;
};

export const emptySession: SessionFormDefaults = {
  title: "",
  description: "",
  type: "study_group",
  categoryId: "",
  date: "",
  time: "",
  duration: "60",
  capacity: "20",
  requiresApproval: false,
  meetingUrl: "",
};

export function SessionForm({
  action: serverAction,
  defaults,
  categories,
  submitLabel,
  minDate,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults: SessionFormDefaults;
  categories: Category[];
  submitLabel: string;
  minDate: string;
}) {
  const [state, action, pending] = useActionState(serverAction, initialFormState);
  const v = state.values;
  const val = (key: keyof SessionFormDefaults) => (v?.[key] ?? String(defaults[key]));

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <Field label="Title" htmlFor="title" error={fieldError(state, "title")}>
        <Input id="title" name="title" maxLength={120} placeholder="e.g. Calculus finals prep" defaultValue={val("title")} required {...errorProps(state, "title")} />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Type" htmlFor="type" error={fieldError(state, "type")}>
          <Select id="type" name="type" defaultValue={val("type")} {...errorProps(state, "type")}>
            {SESSION_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Subject (optional)" htmlFor="categoryId">
          <Select id="categoryId" name="categoryId" defaultValue={val("categoryId")}>
            <option value="">No subject</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date" htmlFor="date" error={fieldError(state, "date")}>
          <Input id="date" name="date" type="date" min={minDate} defaultValue={val("date")} required {...errorProps(state, "date")} />
        </Field>
        <Field label="Start time (PH)" htmlFor="time" error={fieldError(state, "time")}>
          <Input id="time" name="time" type="time" defaultValue={val("time")} required {...errorProps(state, "time")} />
        </Field>
        <Field label="Duration" htmlFor="duration" error={fieldError(state, "duration")}>
          <Select id="duration" name="duration" defaultValue={val("duration")} {...errorProps(state, "duration")}>
            {DURATIONS.map((d) => (
              <option key={d} value={d}>
                {durationLabel(d)}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Max participants" htmlFor="capacity" error={fieldError(state, "capacity")}>
          <Input id="capacity" name="capacity" type="number" min={1} max={500} inputMode="numeric" defaultValue={val("capacity")} {...errorProps(state, "capacity")} />
        </Field>
        <label className="flex items-start gap-2.5 self-end pb-2 text-sm text-gray-700">
          <input
            type="checkbox"
            name="requiresApproval"
            defaultChecked={v ? v.requiresApproval === "on" : defaults.requiresApproval}
            className="mt-0.5 size-4 accent-brand"
          />
          <span>
            <span className="font-medium text-gray-900">I approve who joins</span>
            <span className="block text-gray-500">Otherwise anyone can take a free seat.</span>
          </span>
        </label>
      </div>

      <Field
        label="Meeting link (optional)"
        htmlFor="meetingUrl"
        error={fieldError(state, "meetingUrl")}
        hint="Google Meet, Zoom, Jitsi… Only you and accepted participants can see it."
      >
        <Input id="meetingUrl" name="meetingUrl" type="url" maxLength={500} placeholder="https://meet.google.com/…" defaultValue={val("meetingUrl")} {...errorProps(state, "meetingUrl")} />
      </Field>

      <Field label="Description" htmlFor="description" error={fieldError(state, "description")} hint="What will you cover? What should people prepare?">
        <Textarea id="description" name="description" maxLength={2000} rows={5} defaultValue={val("description")} {...errorProps(state, "description")} />
      </Field>

      <FormMessage state={state} />
      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
