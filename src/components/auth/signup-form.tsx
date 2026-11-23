"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import { z } from "zod";
import { signUp } from "@/lib/auth/actions";
import { displayNameSchema, emailSchema, passwordSchema } from "@/lib/auth/validation";
import { initialFormState } from "@/lib/forms";
import type { University } from "@/lib/reference";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { FormMessage } from "@/components/ui/form-message";
import { PasswordInput } from "@/components/ui/password-input";
import { useInlineErrors } from "./use-inline-errors";

const SCHEMAS = {
  displayName: displayNameSchema,
  email: emailSchema,
  password: passwordSchema,
  universityId: z.string().min(1, { error: "Choose your university." }),
};

export function SignupForm({ universities }: { universities: University[] }) {
  const [state, action, pending] = useActionState(signUp, initialFormState);
  const { error, bind } = useInlineErrors(state, SCHEMAS);
  const v = state.values;

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <Field label="Full name" htmlFor="displayName" error={error("displayName")} hint="Shown on your profile.">
        <Input
          id="displayName"
          name="displayName"
          autoComplete="name"
          placeholder="Juan Dela Cruz"
          maxLength={60}
          defaultValue={v?.displayName}
          required
          {...bind("displayName")}
        />
      </Field>
      <Field label="Email address" htmlFor="email" error={error("email")}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          autoCapitalize="none"
          placeholder="you@example.com"
          defaultValue={v?.email}
          required
          {...bind("email")}
        />
      </Field>
      <Field label="University" htmlFor="universityId" error={error("universityId")}>
        <Select id="universityId" name="universityId" defaultValue={v?.universityId ?? ""} required {...bind("universityId")}>
          <option value="" disabled>
            Select your university
          </option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
              {u.short_name !== "Other" ? ` (${u.short_name})` : ""}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="Password" htmlFor="password" error={error("password")}>
        <PasswordInput id="password" name="password" autoComplete="new-password" required rules {...bind("password")} />
      </Field>

      <div className="flex flex-col gap-3 border-t border-line pt-5">
        <Checkbox name="confirmAge" error={error("confirmAge")} defaultChecked={v?.confirmAge === "on"}>
          I am 18 years old or older.
        </Checkbox>
        <Checkbox name="acceptTerms" error={error("acceptTerms")} defaultChecked={v?.acceptTerms === "on"}>
          I have read the{" "}
          <Link href="/privacy" target="_blank" className="font-medium text-brand-ink underline-offset-2 hover:underline">
            privacy notice<span className="sr-only"> (opens in a new tab)</span>
          </Link>{" "}
          and agree to DabaShare processing my information as described.
        </Checkbox>
      </div>

      <FormMessage state={state} />
      <Button type="submit" size="lg" fullWidth loading={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

function Checkbox({
  name,
  error,
  defaultChecked,
  children,
}: {
  name: string;
  error?: string;
  defaultChecked: boolean;
  children: ReactNode;
}) {
  return (
    <div>
      <label className="flex items-start gap-2.5 text-small text-fg-muted">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${name}-message` : undefined}
          className="mt-0.5 size-4 shrink-0 accent-brand"
        />
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${name}-message`} className="mt-1 pl-6.5 text-small text-danger-ink">
          {error}
        </p>
      )}
    </div>
  );
}
