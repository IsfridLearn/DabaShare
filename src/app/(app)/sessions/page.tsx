import Link from "next/link";
import { SessionCard } from "@/components/sessions/session-card";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { listSessions, SESSIONS_PAGE } from "@/lib/sessions/queries";
import { parseTab, type SessionTab } from "@/lib/sessions/validation";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Webinars & study groups" };

const TABS: { value: SessionTab; label: string }[] = [
  { value: "upcoming", label: "Upcoming" },
  { value: "live", label: "🔴 Live now" },
  { value: "mine", label: "My sessions" },
];

const EMPTY: Record<SessionTab, { title: string; description: string }> = {
  upcoming: { title: "No upcoming sessions", description: "Host a study group or webinar and invite your classmates." },
  live: { title: "Nothing is live right now", description: "Check the upcoming tab for what's next." },
  mine: { title: "You have no sessions", description: "Join an upcoming session or host your own." },
};

export default async function SessionsPage({ searchParams }: PageProps<"/sessions">) {
  const me = await requireOnboardedProfile();
  const params = await searchParams;
  const tab = parseTab(params.tab);
  const pageNum = Number(params.page);
  const page = Number.isInteger(pageNum) && pageNum > 0 ? Math.min(pageNum, 500) : 1;
  const { sessions, total } = await listSessions(tab, page);
  const pages = Math.ceil(total / SESSIONS_PAGE);
  const href = (p: number) => `/sessions?tab=${tab}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Webinars &amp; study groups</h1>
          <p className="mt-1.5 text-gray-600">Host or join live sessions with students across Davao.</p>
        </div>
        <Link href="/sessions/new" className={buttonClasses()}>
          + Host a session
        </Link>
      </div>

      <nav aria-label="Session tabs" className="flex flex-wrap gap-2">
        {TABS.map((t) => (
          <Link
            key={t.value}
            href={`/sessions?tab=${t.value}`}
            aria-current={tab === t.value ? "page" : undefined}
            className={cn(
              "rounded-full border px-4 py-1.5 text-sm font-medium transition",
              tab === t.value ? "border-brand bg-brand text-white" : "border-gray-200 bg-surface text-gray-600 hover:border-brand hover:text-brand-ink",
            )}
          >
            {t.label}
          </Link>
        ))}
      </nav>

      {sessions.length ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {sessions.map((s) => (
            <li key={s.id}>
              <SessionCard session={s} meId={me.id} />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          title={EMPTY[tab].title}
          description={EMPTY[tab].description}
          action={
            <Link href="/sessions/new" className={buttonClasses({ variant: "outline" })}>
              Host a session
            </Link>
          }
        />
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-center gap-3">
          {page > 1 && (
            <Link href={href(page - 1)} className={buttonClasses({ variant: "outline", size: "sm" })}>
              ← Previous
            </Link>
          )}
          <span className="text-sm text-gray-600">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link href={href(page + 1)} className={buttonClasses({ variant: "outline", size: "sm" })}>
              Next →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
