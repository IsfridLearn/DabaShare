import Link from "next/link";
import { Suspense } from "react";
import { AuthHeading } from "@/components/auth/auth-shell";
import { EmailForm } from "@/components/auth/email-form";
import { Alert } from "@/components/ui/alert";
import { requestPasswordReset } from "@/lib/auth/actions";
import { getNotice } from "@/lib/auth/notices";

export const metadata = { title: "Reset password" };

export default function ForgotPasswordPage({ searchParams }: PageProps<"/forgot-password">) {
  return (
    <>
      <AuthHeading
        title="Forgot your password?"
        subtitle="Enter your email and we'll send you a link to choose a new one."
      />
      <Suspense fallback={null}>
        <NoticeFromParams searchParams={searchParams} />
      </Suspense>
      <EmailForm action={requestPasswordReset} submitLabel="Send reset link" pendingLabel="Sending…" />
      <p className="mt-6 text-center text-sm text-gray-600">
        <Link href="/login" className="font-medium text-brand hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}

async function NoticeFromParams({
  searchParams,
}: {
  searchParams: PageProps<"/forgot-password">["searchParams"];
}) {
  const notice = getNotice((await searchParams).notice);
  if (!notice) return null;
  return (
    <div className="mb-4">
      <Alert tone={notice.tone}>{notice.text}</Alert>
    </div>
  );
}
