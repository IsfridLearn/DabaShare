import Link from "next/link";
import { AuthHeading } from "@/components/auth/auth-shell";
import { SignupForm } from "@/components/auth/signup-form";
import { getUniversities } from "@/lib/reference";

export const metadata = { title: "Create account" };

export default async function SignupPage() {
  const universities = await getUniversities();
  return (
    <>
      <AuthHeading
        title="Join the community"
        subtitle="Exchange skills with students across Davao City."
      />
      <SignupForm universities={universities} />
      <p className="mt-6 text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </>
  );
}
