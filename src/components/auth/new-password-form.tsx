"use client";

import { useActionState } from "react";
import { updatePassword } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { errorProps, fieldError, FormMessage } from "@/components/ui/form-message";

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialFormState);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <Field
        label="New password"
        htmlFor="password"
        error={fieldError(state, "password")}
        hint="At least 8 characters, with a letter and a number."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          {...errorProps(state, "password")}
        />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword" error={fieldError(state, "confirmPassword")}>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          {...errorProps(state, "confirmPassword")}
        />
      </Field>
      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
