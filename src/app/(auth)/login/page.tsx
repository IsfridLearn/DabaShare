import Link from "next/link";
import { Suspense } from "react";
import { AuthFooter, AuthHeading, authLink } from "@/components/auth/auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { Alert } from "@/components/ui/alert";
import { getNotice } from "@/lib/auth/notices";
import { safeNextPath } from "@/lib/auth/validation";

export const metadata = { title: "Sign in" };

export default function LoginPage({ searchParams }: PageProps<"/login">) {
  return (
    <>
      <AuthHeading title="Welcome back" subtitle="Sign in to see what your classmates are sharing." />
      <Suspense fallback={<LoginForm />}>
        <LoginWithParams searchParams={searchParams} />
      </Suspense>
      <AuthFooter>
        New to DabaShare?{" "}
        <Link href="/signup" className={authLink}>
          Create an account
        </Link>
      </AuthFooter>
    </>
  );
}

async function LoginWithParams({ searchParams }: { searchParams: PageProps<"/login">["searchParams"] }) {
  const params = await searchParams;
  const notice = getNotice(params.notice);
  const next = typeof params.next === "string" ? safeNextPath(params.next) : undefined;
  return (
    <div className="flex flex-col gap-5">
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
      <LoginForm next={next} />
    </div>
  );
}
