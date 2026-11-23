"use client";

import { useActionState } from "react";
import { emailSchema } from "@/lib/auth/validation";
import { initialFormState, type FormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { useInlineErrors } from "./use-inline-errors";

const SCHEMAS = { email: emailSchema };

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
  variant?: "primary" | "secondary";
}) {
  const [state, action, pending] = useActionState(serverAction, initialFormState);
  const { error, bind } = useInlineErrors(state, SCHEMAS);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />
      <Field label="Email address" htmlFor="email" error={error("email")}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="you@example.com"
          defaultValue={state.values?.email ?? defaultEmail}
          required
          {...bind("email")}
        />
      </Field>
      <Button type="submit" variant={variant} size="lg" fullWidth loading={pending}>
        {pending ? pendingLabel : submitLabel}
      </Button>
    </form>
  );
}
