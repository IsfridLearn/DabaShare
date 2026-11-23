import Link from "next/link";
import type { ReactNode } from "react";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

// Ported from the prototype's login page (prototype/Main.html, "login-left").
export default function HomePage() {
  return (
    <div className="relative flex-1 overflow-hidden bg-linear-135 from-[#f0f4ff] via-[#fafbff] to-[#f5f0ff] dark:from-[#0b1220] dark:via-[#0f172a] dark:to-[#140f2a]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 size-[500px] rounded-full bg-blue-200 opacity-30 blur-[80px] dark:opacity-60" />
        <div className="absolute right-24 -bottom-20 size-[400px] rounded-full bg-violet-200 opacity-30 blur-[80px] dark:opacity-60" />
      </div>

      <header className="relative px-4 py-6 sm:px-12">
        <Logo className="text-brand-ink" />
      </header>

      <main className="relative mx-auto max-w-3xl px-4 pt-8 pb-16 sm:px-12 sm:pt-16">
        <h1 className="text-4xl leading-tight font-extrabold sm:text-5xl">
          Learn Together,
          <br />
          Grow Together
        </h1>
        <p className="mt-5 max-w-xl text-lg text-gray-600">
          Connect with students across Davao City universities. Exchange skills, find tutors, and
          build a collaborative learning community.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/signup" className={buttonClasses({ size: "lg" })}>
            Create your account →
          </Link>
          <Link href="/login" className={buttonClasses({ variant: "outline", size: "lg" })}>
            Sign in
          </Link>
        </div>

        <ul className="mt-10 flex flex-col gap-6">
          <Feature
            title="Smart Matching"
            iconClass="bg-blue-100 text-brand-ink"
            icon={
              <>
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </>
            }
          >
            Get connected with students who can teach what you need and want to learn what you
            offer.
          </Feature>
          <Feature
            title="Free & Paid Options"
            iconClass="bg-violet-100 text-accent"
            icon={
              <>
                <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
              </>
            }
          >
            Browse courses offered for free or for a small fee set by fellow students.
          </Feature>
          <Feature
            title="Cross-University Network"
            iconClass="bg-emerald-100 text-success-ink"
            icon={
              <>
                <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                <path d="M6 12v5c3 3 9 3 12 0v-5" />
              </>
            }
          >
            Meet students from UM, AdDU, UP Mindanao, and more universities in Davao.
          </Feature>
        </ul>
      </main>
    </div>
  );
}

function Feature({
  title,
  iconClass,
  icon,
  children,
}: {
  title: string;
  iconClass: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span
        aria-hidden="true"
        className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-xl ${iconClass}`}
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          {icon}
        </svg>
      </span>
      <div>
        <strong className="font-display text-gray-900">{title}</strong>
        <p className="mt-1 text-[0.95rem] leading-relaxed text-gray-600">{children}</p>
      </div>
    </li>
  );
}
