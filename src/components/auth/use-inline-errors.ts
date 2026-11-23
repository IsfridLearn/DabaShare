"use client";

import { useState, type ChangeEvent, type FocusEvent } from "react";
import type { z } from "zod";
import { fieldError } from "@/components/ui/form-message";
import type { FormState } from "@/lib/forms";

type Target = HTMLInputElement | HTMLSelectElement;
// undefined: no local check yet (show the server's error, if any)
// null: checked locally and fine   string: the local error to show
type Checks = Record<string, string | null | undefined>;

// Earlier feedback for forms: a field is checked when you leave it, and once it
// shows an error it re-checks as you type, so the message clears as soon as
// the value is fixed. A new server response resets everything.
export function useInlineErrors(state: FormState, schemas: Record<string, z.ZodType>) {
  const [local, setLocal] = useState<{ state: FormState; checks: Checks }>({ state, checks: {} });
  const checks = local.state === state ? local.checks : {};

  function run(name: string, value: string): string | null {
    const result = schemas[name]?.safeParse(value);
    return !result || result.success ? null : (result.error.issues[0]?.message ?? null);
  }

  function set(name: string, next: string | null) {
    setLocal({ state, checks: { ...checks, [name]: next } });
  }

  const error = (name: string): string | undefined => {
    const own = checks[name];
    if (own === undefined) return fieldError(state, name);
    return own ?? undefined;
  };

  // Spread onto an input: {...bind("email")}
  const bind = (name: string) => ({
    onBlur: (e: FocusEvent<Target>) => {
      const value = e.currentTarget.value;
      // Don't nag about empty fields while tabbing through; submit catches them.
      set(name, value ? run(name, value) : null);
    },
    onChange: (e: ChangeEvent<Target>) => {
      if (error(name)) set(name, run(name, e.currentTarget.value));
    },
    "aria-invalid": error(name) ? true : undefined,
  });

  return { error, bind };
}
