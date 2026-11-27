import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { getUniversities } from "@/lib/reference";

// Three steps, each one sentence; every line describes something that works today.
const STEPS = [
  { title: "Say what you know", text: "List the skills you can teach and the ones you want to learn. That's your whole profile." },
  { title: "Find the student next to you", text: "People shows who can teach you, who wants to learn from you, and who can swap." },
  { title: "Learn together", text: "Take a classmate's course, join a study group or webinar, or message to plan a session." },
];

export default async function LandingPage() {
  // "Other" is a sign-up fallback, not a campus.
  const universities = (await getUniversities()).filter((u) => u.short_name.toLowerCase() !== "other");

  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Link href="/" className="text-brand-ink" aria-label="DabaShare home">
          <Logo size={24} />
        </Link>
        <nav aria-label="Account" className="flex items-center gap-1 sm:gap-2">
          <Link href="/login" className={buttonClasses({ variant: "ghost", size: "sm" })}>
            Sign in
          </Link>
          <Link href="/signup" className={buttonClasses({ size: "sm" })}>
            Create account
          </Link>
        </nav>
      </header>

      <main id="main" className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pt-12 pb-16 sm:px-8 sm:pt-24 sm:pb-24">
          <p className="text-label text-brand-ink">A student commons for Davao City</p>
          <h1 className="mt-5 max-w-4xl text-[3.25rem] leading-[0.95] tracking-[-0.015em] sm:text-[5.5rem]">
            Learn from the student <br className="hidden sm:block" />
            next to you.
          </h1>
          <div className="mt-8 flex flex-col gap-7">
            <p className="max-w-md text-[1.0625rem] leading-relaxed text-fg-muted">
              Teach what you know, find someone who can teach you, and study together. Free for students.
            </p>
            <div className="flex shrink-0 flex-wrap gap-3">
              <Link href="/signup" className={buttonClasses({ size: "lg" })}>
                Create your account
                <ArrowRight className="size-4" aria-hidden="true" />
              </Link>
              <Link href="/login" className={buttonClasses({ variant: "secondary", size: "lg" })}>
                Sign in
              </Link>
            </div>
          </div>
        </section>

        {universities.length > 0 && (
          <section aria-labelledby="campuses-title" className="border-y border-line">
            <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-5 sm:flex-row sm:items-baseline sm:gap-8 sm:px-8">
              <h2 id="campuses-title" className="shrink-0 text-label text-fg-subtle">
                Students from
              </h2>
              <ul className="flex flex-wrap gap-x-5 gap-y-1.5">
                {universities.map((u) => (
                  <li key={u.id} title={u.name} className="text-small font-medium text-fg">
                    {u.short_name}
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        <section aria-labelledby="how-title" className="mx-auto max-w-6xl px-4 py-16 sm:px-8 sm:py-20">
          <h2 id="how-title" className="text-label text-fg-subtle">
            How it works
          </h2>
          <ol className="mt-6 grid gap-10 md:grid-cols-3 md:gap-12">
            {STEPS.map((step, i) => (
              <li key={step.title} className="border-t border-fg pt-4">
                <span className="font-display text-[1.5rem] leading-none text-brand-ink tabular-nums">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 font-display text-[1.625rem] leading-[1.1]">{step.title}</h3>
                <p className="mt-2 text-fg-muted">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-6 text-small text-fg-subtle sm:px-8">
          <span>DabaShare · Davao City</span>
          <Link href="/privacy" className="hover:text-fg hover:underline">
            Privacy
          </Link>
        </div>
      </footer>
    </div>
  );
}
