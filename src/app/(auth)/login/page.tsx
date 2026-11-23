import Link from "next/link";
import { Suspense } from "react";
import { AuthHeading } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { Alert } from "@/components/ui/alert";
import { getNotice } from "@/lib/auth/notices";
import { safeNextPath } from "@/lib/auth/validation";

export const metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <AuthHeading title="Welcome back" subtitle="Sign in to continue your learning journey." />
      <Suspense fallback={<LoginForm />}>
        <LoginWithParams searchParams={searchParams} />
      </Suspense>
      <p className="mt-6 text-center text-sm text-gray-600">
        Don&apos;t have an account?{" "}
        <Link href="/signup" className="font-medium text-brand-ink hover:underline">
          Create one
        </Link>
      </p>
    </>
  );
}

async function LoginWithParams({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const notice = getNotice(params.notice);
  const next = typeof params.next === "string" ? safeNextPath(params.next) : undefined;
  return (
    <div className="flex flex-col gap-4">
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
      <LoginForm next={next} />
    </div>
  );
}
