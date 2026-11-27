import type { FormState } from "@/lib/forms";
import { Alert } from "./alert";
import { ResultToast } from "./toast";

// Status line for a Server Action result. Errors always stay inline next to
// the form. A success can be a toast instead (`successAs="toast"`) when the
// form stays on screen and the outcome needs no follow-up.
export function FormMessage({ state, successAs = "inline" }: { state: FormState; successAs?: "inline" | "toast" }) {
  if (state.status === "idle" || !state.message) return null;
  if (state.status === "success" && successAs === "toast") return <ResultToast result={state} message={state.message} />;
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
