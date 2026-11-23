"use client";

import { useActionState } from "react";
import { z } from "zod";
import { updatePassword } from "@/lib/auth/actions";
import { passwordSchema } from "@/lib/auth/validation";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { PasswordInput } from "@/components/ui/password-input";
import { useInlineErrors } from "./use-inline-errors";

export function NewPasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initialFormState);
  // "Confirm" is checked against the password typed above it.
  const { error, bind } = useInlineErrors(state, {
    password: passwordSchema,
    confirmPassword: z.string().refine(
      (v) => v === (document.getElementById("password") as HTMLInputElement | null)?.value,
      { error: "Passwords don't match." },
    ),
  });

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />
      <Field label="New password" htmlFor="password" error={error("password")}>
        <PasswordInput id="password" name="password" autoComplete="new-password" required rules {...bind("password")} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirmPassword" error={error("confirmPassword")}>
        <PasswordInput id="confirmPassword" name="confirmPassword" autoComplete="new-password" required {...bind("confirmPassword")} />
      </Field>
      <Button type="submit" size="lg" fullWidth loading={pending} className="mt-1">
        {pending ? "Saving…" : "Save new password"}
      </Button>
    </form>
  );
}
