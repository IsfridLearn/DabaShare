import { AuthHeading } from "@/components/auth/auth-shell";
import { NewPasswordForm } from "@/components/auth/new-password-form";

export const metadata = { title: "Choose a new password" };

// Reached from the reset email (the link signs the user in first). The proxy
// sends anyone without a session to /login, and the action re-checks it.
export default function ResetPasswordPage() {
  return (
    <>
      <AuthHeading title="Choose a new password" subtitle="You'll use it the next time you sign in." />
      <NewPasswordForm />
    </>
  );
}
