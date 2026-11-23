"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/lib/auth/actions";
import { emailSchema } from "@/lib/auth/validation";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { PasswordInput } from "@/components/ui/password-input";
import { useInlineErrors } from "./use-inline-errors";

const SCHEMAS = { email: emailSchema };

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, initialFormState);
  const { error, bind } = useInlineErrors(state, SCHEMAS);

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email address" htmlFor="email" error={error("email")}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="you@example.com"
          defaultValue={state.values?.email}
          required
          {...bind("email")}
        />
      </Field>
      <Field
        label="Password"
        htmlFor="password"
        error={error("password")}
        labelAside={
          <Link href="/forgot-password" className="text-small text-fg-muted underline-offset-2 hover:text-fg hover:underline">
            Forgot password?
          </Link>
        }
      >
        <PasswordInput id="password" name="password" autoComplete="current-password" required aria-invalid={error("password") ? true : undefined} />
      </Field>
      <Button type="submit" size="lg" fullWidth loading={pending} className="mt-1">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
