import { z } from "zod";

// Shape returned by every form Server Action (used with React's useActionState).
// `values` lets the form re-fill its fields, because React resets uncontrolled
// inputs after an action runs. Passwords are never echoed back.
export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Partial<Record<string, string[]>>;
  values?: Record<string, string>;
};

export const initialFormState: FormState = { status: "idle" };

export function formValues(formData: FormData, omit: string[] = []): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (typeof value === "string" && !key.startsWith("$ACTION") && !omit.includes(key)) {
      values[key] = value;
    }
  }
  return values;
}

export function validationError(
  error: z.ZodError,
  formData: FormData,
  omit: string[] = [],
): FormState {
  return {
    status: "error",
    message: "Please fix the highlighted fields.",
    fieldErrors: z.flattenError(error).fieldErrors as Partial<Record<string, string[]>>,
    values: formValues(formData, omit),
  };
}

type DbError = { code?: string; message: string } | null | undefined;

// Turns a Postgres/PostgREST error into something safe to show.
// Our triggers raise plain-sentence messages with code P0001.
export function friendlyDbError(error: DbError, fallback = "Something went wrong. Please try again."): string {
  if (!error) return fallback;
  if (error.code === "P0001") return error.message;
  if (error.code === "23505") return "That value is already taken.";
  if (error.code === "23514") return "Some of the values aren't allowed.";
  return fallback;
}
