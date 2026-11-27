"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/field";
import { errorProps, fieldError, FormMessage } from "@/components/ui/form-message";
import { postUpdate } from "@/lib/courses/space-actions";
import { UPDATE_MAX } from "@/lib/courses/space-validation";
import { initialFormState } from "@/lib/forms";

export function UpdateForm({ courseId }: { courseId: string }) {
  const [state, action, pending] = useActionState(postUpdate.bind(null, courseId), initialFormState);
  const val = (k: string) => (state.status === "error" ? state.values?.[k] : undefined);

  return (
    // React resets the fields after the action; on an error they refill from state.values.
    <form action={action} className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4" noValidate>
      <FormMessage state={state} successAs="toast" />
      <Field label="Post an update" htmlFor="update-body" error={fieldError(state, "body")}>
        <Textarea
          id="update-body"
          name="body"
          rows={3}
          maxLength={UPDATE_MAX}
          placeholder="e.g. Problem set 2 is up. We'll go through it on Saturday."
          defaultValue={val("body")}
          required
          {...errorProps(state, "body")}
        />
      </Field>
      <Field label="Link (optional)" htmlFor="update-link" error={fieldError(state, "link")} hint="Slides, a Drive folder, a reading. Must start with https://">
        <Input id="update-link" name="link" type="url" inputMode="url" maxLength={500} placeholder="https://" defaultValue={val("link")} {...errorProps(state, "link")} />
      </Field>
      <div>
        <Button type="submit" loading={pending}>
          {pending ? "Posting…" : "Post update"}
        </Button>
      </div>
    </form>
  );
}
