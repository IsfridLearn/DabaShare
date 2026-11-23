import Link from "next/link";
import { Suspense } from "react";
import { AuthHeading } from "@/components/auth/auth-shell";
import { EmailForm } from "@/components/auth/email-form";
import { resendConfirmation } from "@/lib/auth/actions";

export const metadata = { title: "Check your email" };

export default function CheckEmailPage({ searchParams }: PageProps<"/check-email">) {
  return (
    <>
      <AuthHeading
        title="Check your email"
        subtitle="We sent you a confirmation link. Open it to activate your account."
      />
      <ul className="mb-6 list-disc space-y-1 pl-5 text-sm text-gray-600">
        <li>The link expires in 1 hour.</li>
        <li>Can&apos;t find it? Check your spam or promotions folder.</li>
        <li>Open the link on this device to be signed in automatically.</li>
      </ul>
      <p className="mb-3 text-sm font-medium text-gray-700">Didn&apos;t get it?</p>
      <Suspense fallback={<ResendForm />}>
        <ResendWithEmail searchParams={searchParams} />
      </Suspense>
      <p className="mt-6 text-center text-sm text-gray-600">
        <Link href="/login" className="font-medium text-brand-ink hover:underline">
          Back to sign in
        </Link>
      </p>
    </>
  );
}

async function ResendWithEmail({
  searchParams,
}: {
  searchParams: PageProps<"/check-email">["searchParams"];
}) {
  const { email } = await searchParams;
  return <ResendForm email={typeof email === "string" ? email : undefined} />;
}

function ResendForm({ email }: { email?: string }) {
  return (
    <EmailForm
      action={resendConfirmation}
      defaultEmail={email}
      submitLabel="Resend confirmation email"
      pendingLabel="Sending…"
      variant="outline"
    />
  );
}
