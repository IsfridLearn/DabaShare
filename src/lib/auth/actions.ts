"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { authLinkBaseUrl } from "@/lib/env";
import { formValues, validationError, type FormState } from "@/lib/forms";
import { createClient } from "@/lib/supabase/server";
import { RECOVERY_COOKIE } from "./recovery";
import {
  changePasswordSchema,
  emailOnlySchema,
  newPasswordSchema,
  safeNextPath,
  signInSchema,
  signUpSchema,
} from "./validation";

type AuthError = { code?: string; message: string };

const RATE_LIMIT_CODES = ["over_email_send_rate_limit", "over_request_rate_limit"];

// Supabase Auth error codes -> messages a student can act on.
function authErrorMessage(error: AuthError): string {
  switch (error.code) {
    case "invalid_credentials":
      return "Wrong email or password.";
    case "email_not_confirmed":
      return "Confirm your email first. Check your inbox for the link we sent.";
    case "weak_password":
      return "That password is too easy to guess. Try a longer one.";
    case "same_password":
      return "Choose a password different from your current one.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many attempts. Wait a few minutes and try again.";
    case "user_banned":
      return "This account has been suspended.";
    default:
      console.error("Supabase auth error", error.code, error.message);
      return "Something went wrong. Please try again.";
  }
}

function callbackUrl(next: string): string {
  return `${authLinkBaseUrl()}/auth/confirm?next=${encodeURIComponent(next)}`;
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData, ["password"]);

  const { email, password, displayName, universityId } = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: callbackUrl("/onboarding"),
      // Read by the database trigger that creates the profile.
      data: { display_name: displayName, university_id: String(universityId), accepted_terms: "true" },
    },
  });

  if (error) {
    return { status: "error", message: authErrorMessage(error), values: formValues(formData, ["password"]) };
  }
  // Same response whether or not the email already had an account, so the
  // form cannot be used to discover who is registered.
  redirect(`/check-email?email=${encodeURIComponent(email)}`);
}

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData, ["password"]);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    return { status: "error", message: authErrorMessage(error), values: formValues(formData, ["password"]) };
  }
  redirect(safeNextPath(formData.get("next")));
}

// Signs out this browser only (a shared library PC shouldn't log out your phone).
export async function signOut(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

// "Check your email" style actions: rate-limit errors get the same reply as
// success, because Supabase only rate-limits addresses that exist.
async function neutralEmailReply(error: AuthError | null, successMessage: string, formData: FormData) {
  if (error && !RATE_LIMIT_CODES.includes(error.code ?? "")) {
    return { status: "error" as const, message: authErrorMessage(error), values: formValues(formData) };
  }
  if (error) console.warn("Auth email rate-limited", error.code);
  return { status: "success" as const, message: successMessage };
}

export async function resendConfirmation(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailOnlySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: callbackUrl("/onboarding") },
  });
  return neutralEmailReply(
    error,
    "If that email is waiting for confirmation, we sent a new link. It can take a few minutes.",
    formData,
  );
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = emailOnlySchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData);

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl("/reset-password"),
  });
  return neutralEmailReply(
    error,
    "If an account uses that email, we sent a reset link. Open it on this device.",
    formData,
  );
}

// Password reset from the email link. Only allowed within 15 minutes of
// following a recovery link (cookie set by /auth/confirm), so a borrowed or
// stolen session cannot silently change the password.
export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = newPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return validationError(parsed.error, formData, ["password", "confirmPassword"]);

  const cookieStore = await cookies();
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) redirect("/login");
  if (cookieStore.get(RECOVERY_COOKIE)?.value !== userData.user.id) {
    return {
      status: "error",
      message: "This reset link has expired. Request a new one, or change your password in Settings.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: authErrorMessage(error) };
  cookieStore.delete(RECOVERY_COOKIE);
  await supabase.auth.signOut({ scope: "others" });
  redirect("/profile?notice=password-updated");
}

// Password change from Settings: requires the current password.
export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = changePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return validationError(parsed.error, formData, ["currentPassword", "password", "confirmPassword"]);
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user?.email) redirect("/login");

  const { error: checkError } = await supabase.auth.signInWithPassword({
    email: userData.user.email,
    password: parsed.data.currentPassword,
  });
  if (checkError) {
    return checkError.code === "invalid_credentials"
      ? { status: "error", fieldErrors: { currentPassword: ["That isn't your current password."] } }
      : { status: "error", message: authErrorMessage(checkError) };
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { status: "error", message: authErrorMessage(error) };
  await supabase.auth.signOut({ scope: "others" });
  return { status: "success", message: "Password updated. Other devices have been signed out." };
}
