"use client";

import { useActionState } from "react";
import { deleteAccount, setDiscoverable } from "@/lib/profile/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { errorProps, fieldError, FormMessage } from "@/components/ui/form-message";

export function DiscoverableForm({ discoverable }: { discoverable: boolean }) {
  const [state, action, pending] = useActionState(setDiscoverable, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-4">
      <FormMessage state={state} successAs="toast" />
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="discoverable"
          defaultChecked={discoverable}
          className="mt-1 size-4 shrink-0 accent-brand"
        />
        <span>
          <span className="font-medium text-fg">Show me in matches and search</span>
          <span className="mt-0.5 block text-small text-fg-muted">
            When off, you won&apos;t be suggested to other students. People you already message, and the
            courses and sessions you publish, stay visible.
          </span>
        </span>
      </label>
      <div>
        <Button type="submit" variant="secondary" loading={pending}>
          {pending ? "Saving…" : "Save privacy setting"}
        </Button>
      </div>
    </form>
  );
}

export function DeleteAccountForm() {
  const [state, action, pending] = useActionState(deleteAccount, initialFormState);
  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} successAs="toast" />
      <p className="text-small text-fg-muted">
        This permanently deletes your profile, photo, skills, courses, enrollments, messages and study
        sessions. It can&apos;t be undone.
      </p>
      <Field label="Type DELETE to confirm" htmlFor="confirm" error={fieldError(state, "confirm")}>
        <Input
          id="confirm"
          name="confirm"
          autoComplete="off"
          autoCapitalize="characters"
          className="max-w-xs"
          {...errorProps(state, "confirm")}
        />
      </Field>
      <div>
        <Button type="submit" variant="danger" loading={pending}>
          {pending ? "Deleting…" : "Delete my account"}
        </Button>
      </div>
    </form>
  );
}
