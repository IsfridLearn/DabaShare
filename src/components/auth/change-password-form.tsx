"use client";

import { useActionState } from "react";
import { changePassword } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { errorProps, fieldError, FormMessage } from "@/components/ui/form-message";
import { PasswordInput } from "@/components/ui/password-input";

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePassword, initialFormState);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <Field label="Current password" htmlFor="currentPassword" error={fieldError(state, "currentPassword")}>
        <PasswordInput id="currentPassword" name="currentPassword" autoComplete="current-password" required {...errorProps(state, "currentPassword")} />
      </Field>
      <Field label="New password" htmlFor="password" error={fieldError(state, "password")}>
        <PasswordInput id="password" name="password" autoComplete="new-password" required rules {...errorProps(state, "password")} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword" error={fieldError(state, "confirmPassword")}>
        <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" required {...errorProps(state, "confirmPassword")} />
      </Field>
      <div>
        <Button type="submit" variant="secondary" loading={pending}>
          {pending ? "Updating…" : "Change password"}
        </Button>
      </div>
    </form>
  );
}
