import { CalendarDays, Plus } from "lucide-react";
import Link from "next/link";
import { LiveDot, SessionRow } from "@/components/sessions/session-card";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, Pagination, RowList, Tabs } from "@/components/ui/primitives";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { listSessions, SESSIONS_PAGE } from "@/lib/sessions/queries";
import { groupByDay, parseTab, type SessionTab } from "@/lib/sessions/validation";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Webinars & study groups" };

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
  const href = (p: number) => `/sessions?tab=${tab}${p > 1 ? `&page=${p}` : ""}`;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="Sessions"
        description="Webinars, study groups and Q&A sessions, hosted by students across Davao."
        actions={
          <Link href="/sessions/new" className={buttonClasses()}>
            <Plus className="size-4" aria-hidden="true" />
            Host a session
          </Link>
        }
      />

      <Tabs
        label="Session tabs"
        items={[
          { href: "/sessions?tab=upcoming", label: "Upcoming", active: tab === "upcoming" },
          {
            href: "/sessions?tab=live",
            label: (
              <>
                <LiveDot />
                Live now
              </>
            ),
            active: tab === "live",
          },
          { href: "/sessions?tab=mine", label: "My sessions", active: tab === "mine" },
        ]}
      />

      {sessions.length ? (
        <div className="flex flex-col gap-6">
          {groupByDay(sessions).map((group) => (
            <section key={group.key} aria-label={group.label}>
              <h2 className="mb-2 text-small font-semibold text-fg-muted">{group.label}</h2>
              <RowList>
                {group.items.map((s) => (
                  <li key={s.id}>
                    <SessionRow session={s} meId={me.id} />
                  </li>
                ))}
              </RowList>
            </section>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<CalendarDays className="size-5" />}
          title={EMPTY[tab].title}
          description={EMPTY[tab].description}
          action={
            <Link href="/sessions/new" className={buttonClasses({ variant: "secondary" })}>
              Host a session
            </Link>
          }
        />
      )}

      <Pagination page={page} pages={Math.ceil(total / SESSIONS_PAGE)} hrefFor={href} />
    </div>
  );
}
