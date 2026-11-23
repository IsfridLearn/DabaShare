"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { errorProps, fieldError, FormMessage } from "@/components/ui/form-message";

export function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(signIn, initialFormState);

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="next" value={next ?? ""} />
      <Field label="Email address" htmlFor="email" error={fieldError(state, "email")}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={state.values?.email}
          required
          {...errorProps(state, "email")}
        />
      </Field>
      <Field label="Password" htmlFor="password" error={fieldError(state, "password")}>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          {...errorProps(state, "password")}
        />
      </Field>
      <div className="-mt-1 text-right text-sm">
        <Link href="/forgot-password" className="font-medium text-brand hover:underline">
          Forgot password?
        </Link>
      </div>
      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
