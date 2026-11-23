import Link from "next/link";
import { Suspense } from "react";
import { MailCheck } from "lucide-react";
import { AuthFooter, AuthHeading, authLink } from "@/components/auth/auth-shell";
import { EmailForm } from "@/components/auth/email-form";
import { resendConfirmation } from "@/lib/auth/actions";

export const metadata = { title: "Check your email" };

export default function CheckEmailPage({ searchParams }: PageProps<"/check-email">) {
  return (
    <>
      <span className="mb-5 flex size-10 items-center justify-center rounded-control border border-line-strong bg-surface text-brand-ink">
        <MailCheck className="size-5" strokeWidth={1.75} aria-hidden="true" />
      </span>
      <AuthHeading
        title="Check your email"
        subtitle="We sent you a confirmation link. Open it to activate your account."
      />
      <ul className="mb-8 flex flex-col gap-2 border-l-2 border-line-strong pl-4 text-small text-fg-muted">
        <li>The link expires in 1 hour.</li>
        <li>Can&apos;t find it? Check your spam or promotions folder.</li>
        <li>Open the link on this device to be signed in automatically.</li>
      </ul>
      <p className="mb-3 text-small font-medium text-fg">Didn&apos;t get it? Send it again.</p>
      <Suspense fallback={<ResendForm />}>
        <ResendWithEmail searchParams={searchParams} />
      </Suspense>
      <AuthFooter>
        Already confirmed?{" "}
        <Link href="/login" className={authLink}>
          Sign in
        </Link>
      </AuthFooter>
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
      variant="secondary"
    />
  );
}
