import { CalendarDays, MessagesSquare, Sparkles } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";

// Every point is a real feature; no invented numbers or testimonials.
const POINTS = [
  { icon: Sparkles, title: "Teach what you know", text: "Offer a course or a skill swap. Your classmates' strengths are the curriculum." },
  { icon: MessagesSquare, title: "Find the right study partner", text: "Matches explain themselves: who can teach you, and who wants to learn from you." },
  { icon: CalendarDays, title: "Learn together, live", text: "Join study groups, webinars and Q&A sessions, or host your own." },
];

// Split editorial layout: a quiet identity panel on wide screens, and the
// form on a plain canvas. No cards, gradients or decorative blobs.
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-1 bg-canvas">
      <aside className="hidden w-[44%] max-w-[36rem] shrink-0 flex-col justify-between border-r border-line bg-subtle px-12 py-10 lg:flex">
        <Link href="/" className="self-start text-brand-ink" aria-label="DabaShare home">
          <Logo size={28} />
        </Link>
        <div className="max-w-md">
          <p className="text-caption font-medium tracking-wide text-fg-subtle uppercase">For college students in Davao City</p>
          <p className="mt-4 font-serif text-[2.75rem] leading-[1.08] font-medium tracking-[-0.02em] text-fg">
            Learn from the student <em className="text-brand-ink">next to you.</em>
          </p>
          <ul className="mt-10 flex flex-col gap-6">
            {POINTS.map(({ icon: Icon, title, text }) => (
              <li key={title} className="flex gap-3.5">
                <span className="flex size-8 shrink-0 items-center justify-center rounded-control border border-line-strong bg-surface text-fg-muted">
                  <Icon className="size-4" strokeWidth={1.75} aria-hidden="true" />
                </span>
                <div>
                  <p className="font-medium text-fg">{title}</p>
                  <p className="mt-0.5 text-small text-fg-muted">{text}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
        <p className="text-caption text-fg-subtle">
          Free for students.{" "}
          <Link href="/privacy" className="underline decoration-line-strong underline-offset-2 hover:text-fg hover:decoration-current">
            How we handle your data
          </Link>
        </p>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="px-6 py-5 sm:px-10 lg:hidden">
          <Link href="/" className="text-brand-ink" aria-label="DabaShare home">
            <Logo size={26} />
          </Link>
        </header>
        <main id="main" className="flex flex-1 justify-center px-6 pt-6 pb-16 sm:px-10 sm:pt-12 lg:items-center lg:py-12">
          <div className="w-full max-w-[24rem]">{children}</div>
        </main>
      </div>
    </div>
  );
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <h1 className="text-title">{title}</h1>
      {subtitle && <p className="mt-2 text-fg-muted">{subtitle}</p>}
    </div>
  );
}

// "Don't have an account? Create one" line under a form.
export function AuthFooter({ children }: { children: ReactNode }) {
  return <p className="mt-8 border-t border-line pt-6 text-small text-fg-muted">{children}</p>;
}

export const authLink = "font-medium text-brand-ink underline-offset-2 hover:underline";
