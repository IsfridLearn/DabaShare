import { ArrowRight, BookOpen, CalendarDays, MessagesSquare, Newspaper, Users } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

// Every line describes a real feature; no invented numbers or testimonials.
const FEATURES = [
  {
    icon: Users,
    title: "Find the right study partner",
    text: "Matches explain themselves: who can teach you what you need, and who wants to learn what you know. Skill swaps come first.",
  },
  {
    icon: BookOpen,
    title: "Teach what you know",
    text: "Post a course for free or for a small fee you set. Students from any Davao university can request to join.",
  },
  {
    icon: CalendarDays,
    title: "Learn together, live",
    text: "Host or join study groups, webinars and Q&A sessions, with seats, approvals and a meeting link in one place.",
  },
];

const PLACES = [
  { icon: Newspaper, title: "Home", text: "Posts, events and study sessions from people you follow." },
  { icon: BookOpen, title: "Courses", text: "Browse by university, subject, level and price." },
  { icon: Users, title: "People", text: "Follow classmates and tutors; see why you match." },
  { icon: MessagesSquare, title: "Messages", text: "Plan sessions one-to-one, in real time." },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col bg-canvas">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-8">
        <Link href="/" className="text-brand-ink" aria-label="DabaShare home">
          <Logo size={26} />
        </Link>
        <nav aria-label="Account" className="flex items-center gap-1 sm:gap-2">
          <Link href="/login" className={buttonClasses({ variant: "ghost" })}>
            Sign in
          </Link>
          <Link href="/signup" className={buttonClasses()}>
            Create account
          </Link>
        </nav>
      </header>

      <main id="main" className="flex-1">
        <section className="mx-auto max-w-6xl px-4 pt-14 pb-16 sm:px-8 sm:pt-24 sm:pb-24">
          <p className="text-caption font-medium tracking-wide text-fg-subtle uppercase">For college students in Davao City</p>
          <h1 className="mt-5 max-w-3xl text-[2.75rem] leading-[1.05] tracking-[-0.025em] sm:text-[4.25rem]">
            Learn from the student <em className="text-brand-ink">next to you.</em>
          </h1>
          <p className="mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-fg-muted">
            DabaShare connects students across UM, AdDU, UP Mindanao and other Davao universities to swap skills, find
            tutors and study together.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/signup" className={buttonClasses({ size: "lg" })}>
              Create your account
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link href="/login" className={buttonClasses({ variant: "secondary", size: "lg" })}>
              Sign in
            </Link>
          </div>
          <p className="mt-4 text-small text-fg-subtle">Free for students.</p>
        </section>

        <section aria-labelledby="how-title" className="border-t border-line">
          <div className="mx-auto max-w-6xl px-4 py-16 sm:px-8">
            <h2 id="how-title" className="sr-only">
              How DabaShare works
            </h2>
            <ul className="grid gap-10 md:grid-cols-3 md:gap-0 md:divide-x md:divide-line">
              {FEATURES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="md:px-8 md:first:pl-0 md:last:pr-0">
                  <Icon className="size-5 text-fg-muted" strokeWidth={1.75} aria-hidden="true" />
                  <h3 className="mt-4 text-heading">{title}</h3>
                  <p className="mt-2 text-fg-muted">{text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section aria-labelledby="inside-title" className="border-t border-line bg-subtle">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-8 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <div>
              <h2 id="inside-title" className="font-serif text-[2rem] leading-tight font-medium tracking-[-0.015em] text-fg">
                A small network, built around studying.
              </h2>
              <p className="mt-3 max-w-md text-fg-muted">
                Profiles, follows and posts like a social network, with courses and live sessions built in.
              </p>
            </div>
            <ul className="grid gap-px overflow-hidden rounded-card border border-line bg-line sm:grid-cols-2">
              {PLACES.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3 bg-surface p-5">
                  <Icon className="mt-0.5 size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
                  <div>
                    <h3 className="text-body font-semibold">{title}</h3>
                    <p className="mt-0.5 text-small text-fg-muted">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
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
