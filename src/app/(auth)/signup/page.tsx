import Link from "next/link";
import { AuthFooter, AuthHeading, authLink } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { getUniversities } from "@/lib/reference";

export const metadata = { title: "Create account" };

export default async function SignupPage() {
  const universities = await getUniversities();
  return (
    <>
      <AuthHeading
        title="Create your account"
        subtitle="Share what you know and learn from students across Davao City. Free for students."
      />
      <SignupForm universities={universities} />
      <AuthFooter>
        Already have an account?{" "}
        <Link href="/login" className={authLink}>
          Sign in
        </Link>
      </AuthFooter>
    </>
  );
}
