"use client";

import { useActionState } from "react";
import { initialFormState, type FormState } from "@/lib/forms";
import type { University } from "@/lib/reference";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { errorProps, fieldError, FormMessage } from "@/components/ui/form-message";

export type ProfileFormDefaults = {
  username: string;
  displayName: string;
  universityId: string;
  program: string;
  bio: string;
};

// Shared by onboarding (completeOnboarding) and profile editing (updateProfile).
export function ProfileForm({
  action: serverAction,
  defaults,
  universities,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults: ProfileFormDefaults;
  universities: University[];
  submitLabel: string;
}) {
  const [state, action, pending] = useActionState(serverAction, initialFormState);
  const v = { ...defaults, ...state.values };

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Display name" htmlFor="displayName" error={fieldError(state, "displayName")}>
          <Input
            id="displayName"
            name="displayName"
            maxLength={60}
            defaultValue={v.displayName}
            required
            {...errorProps(state, "displayName")}
          />
        </Field>
        <Field
          label="Username"
          htmlFor="username"
          error={fieldError(state, "username")}
          hint="Your profile link: dabashare/u/username"
        >
          <Input
            id="username"
            name="username"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={20}
            placeholder="juan_dc"
            defaultValue={v.username}
            required
            {...errorProps(state, "username")}
          />
        </Field>
      </div>
      <Field label="University" htmlFor="universityId" error={fieldError(state, "universityId")}>
        <Select
          id="universityId"
          name="universityId"
          defaultValue={v.universityId}
          required
          {...errorProps(state, "universityId")}
        >
          <option value="" disabled>
            Select your university
          </option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Course / program" htmlFor="program" error={fieldError(state, "program")}>
        <Input
          id="program"
          name="program"
          maxLength={100}
          placeholder="e.g. BS Computer Science"
          defaultValue={v.program}
          {...errorProps(state, "program")}
        />
      </Field>
      <Field label="Bio" htmlFor="bio" error={fieldError(state, "bio")} hint="Up to 500 characters.">
        <Textarea
          id="bio"
          name="bio"
          maxLength={500}
          placeholder="Tell other students what you're studying and what you'd like to learn."
          defaultValue={v.bio}
          {...errorProps(state, "bio")}
        />
      </Field>
      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
