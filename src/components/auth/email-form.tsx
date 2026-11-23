"use client";

import { useActionState } from "react";
import { initialFormState, type FormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { errorProps, fieldError, FormMessage } from "@/components/ui/form-message";

// Single-email form used for "forgot password" and "resend confirmation".
export function EmailForm({
  action: serverAction,
  submitLabel,
  pendingLabel,
  defaultEmail,
  variant = "primary",
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  submitLabel: string;
  pendingLabel: string;
  defaultEmail?: string;
  variant?: "primary" | "outline";
}) {
  const [state, action, pending] = useActionState(serverAction, initialFormState);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <Field label="Email address" htmlFor="email" error={fieldError(state, "email")}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          defaultValue={state.values?.email ?? defaultEmail}
          required
          {...errorProps(state, "email")}
        />
      </Field>
      <Button type="submit" variant={variant} size="lg" fullWidth disabled={pending}>
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
