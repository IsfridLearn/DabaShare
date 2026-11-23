"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signUp } from "@/lib/auth/actions";
import { initialFormState } from "@/lib/forms";
import type { University } from "@/lib/reference";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { errorProps, fieldError, FormMessage } from "@/components/ui/form-message";

export function SignupForm({ universities }: { universities: University[] }) {
  const [state, action, pending] = useActionState(signUp, initialFormState);
  const v = state.values;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <Field label="Full name" htmlFor="displayName" error={fieldError(state, "displayName")}>
        <Input
          id="displayName"
          name="displayName"
          autoComplete="name"
          placeholder="Juan Dela Cruz"
          maxLength={60}
          defaultValue={v?.displayName}
          required
          {...errorProps(state, "displayName")}
        />
      </Field>
      <Field label="Email address" htmlFor="email" error={fieldError(state, "email")}>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          defaultValue={v?.email}
          required
          {...errorProps(state, "email")}
        />
      </Field>
      <Field label="University" htmlFor="universityId" error={fieldError(state, "universityId")}>
        <Select
          id="universityId"
          name="universityId"
          defaultValue={v?.universityId ?? ""}
          required
          {...errorProps(state, "universityId")}
        >
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
      <Field
        label="Password"
        htmlFor="password"
        error={fieldError(state, "password")}
        hint="At least 8 characters, with a letter and a number."
      >
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
          {...errorProps(state, "password")}
        />
      </Field>

      <Checkbox name="confirmAge" state={state} defaultChecked={v?.confirmAge === "on"}>
        I am 18 years old or older.
      </Checkbox>
      <Checkbox name="acceptTerms" state={state} defaultChecked={v?.acceptTerms === "on"}>
        I have read the{" "}
        <Link href="/privacy" target="_blank" className="font-medium text-brand hover:underline">
          privacy notice
        </Link>{" "}
        and agree to DabaShare processing my information as described.
      </Checkbox>

      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}

function Checkbox({
  name,
  state,
  defaultChecked,
  children,
}: {
  name: string;
  state: Parameters<typeof fieldError>[0];
  defaultChecked: boolean;
  children: React.ReactNode;
}) {
  const error = fieldError(state, name);
  return (
    <div>
      <label className="flex items-start gap-2.5 text-sm text-gray-700">
        <input
          type="checkbox"
          name={name}
          defaultChecked={defaultChecked}
          className="mt-0.5 size-4 shrink-0 accent-brand"
          {...errorProps(state, name)}
        />
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${name}-message`} className="mt-1 pl-6.5 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}
