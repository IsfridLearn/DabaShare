import type { FormState } from "@/lib/forms";
import { Alert } from "./alert";

// Top-of-form status line for a Server Action result.
export function FormMessage({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) return null;
  return <Alert tone={state.status === "error" ? "error" : "success"}>{state.message}</Alert>;
}

// First error for a field, if any.
export function fieldError(state: FormState, name: string): string | undefined {
  return state.fieldErrors?.[name]?.[0];
}

// Props that wire an input to its <Field> error message for screen readers.
export function errorProps(state: FormState, name: string) {
  const error = fieldError(state, name);
  return error ? { "aria-invalid": true, "aria-describedby": `${name}-message` } : {};
}
