import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Composer } from "@/components/feed/composer";
import { FeedList } from "@/components/feed/feed-list";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, Tabs } from "@/components/ui/primitives";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { searchCourses } from "@/lib/courses/queries";
import { formatPrice } from "@/lib/courses/validation";
import { getAttachOptions, getFeed } from "@/lib/feed/queries";
import { parseScope } from "@/lib/feed/validation";
import { getMatches } from "@/lib/matching/queries";
import { listSessions } from "@/lib/sessions/queries";
import { sessionDay, typeLabel } from "@/lib/sessions/validation";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Home" };

const clock = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", hour: "numeric", minute: "2-digit" });

// The noticeboard: write something, read what classmates shared, and on wide
// screens see what's coming up this week. Everything shown is real data.
export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const me = await requireOnboardedProfile();
  const params = await searchParams;
  const scope = parseScope(params.feed);
  const [feed, attach] = await Promise.all([getFeed(scope), getAttachOptions(me.id)]);

  return (
    <div className="grid gap-12 xl:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-6">
        <h1 className="sr-only">Home</h1>
        <Composer
          name={me.display_name}
          avatarPath={me.avatar_path}
          sessions={attach.sessions}
          courses={attach.courses}
          autoFocus={params.compose === "1"}
        />
        <div>
          <Tabs
            label="Feed"
            items={[
              { href: "/home", label: "Following", active: scope === "following" },
              { href: "/home?feed=everyone", label: "Everyone", active: scope === "everyone" },
            ]}
          />
          <FeedList
            // A new first post (you just posted) starts the list over.
            key={`${scope}:${feed.posts[0]?.id ?? "empty"}`}
            initial={feed.posts}
            initialHasMore={feed.hasMore}
            scope={scope}
            meId={me.id}
            label={scope === "following" ? "Posts from people you follow" : "Posts from everyone"}
            empty={
              <div className="pt-6">
                {scope === "following" ? (
                  <EmptyState
                    title="Your feed is quiet"
                    description="Follow classmates and tutors to see their posts, events and study sessions here."
                    action={
                      <div className="flex flex-wrap justify-center gap-2">
                        <Link href="/matches" className={buttonClasses({ size: "sm" })}>
                          Find people
                        </Link>
                        <Link href="/home?feed=everyone" className={buttonClasses({ variant: "secondary", size: "sm" })}>
                          See everyone&apos;s posts
                        </Link>
                      </div>
                    }
                  />
                ) : (
                  <EmptyState title="No posts yet" description="Be the first to share something with DabaShare." />
                )}
              </div>
            }
          />
        </div>
      </div>

      <aside aria-label="This week" className="hidden flex-col gap-10 pt-1 xl:flex">
        <Suspense fallback={<RailSkeleton title="Coming up" />}>
          <ComingUp />
        </Suspense>
        <Suspense fallback={<RailSkeleton title="Can teach you" />}>
          <CanTeachYou />
        </Suspense>
        <Suspense fallback={<RailSkeleton title="New courses" />}>
          <NewCourses meId={me.id} />
        </Suspense>
      </aside>
    </div>
  );
}

function Rail({ title, href, linkLabel, children }: { title: string; href: string; linkLabel: string; children: ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between border-b border-line pb-2">
        <h2 className="text-label text-fg-muted">{title}</h2>
        <Link href={href} className="text-caption text-fg-subtle hover:text-fg hover:underline">
          {linkLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}

function RailSkeleton({ title }: { title: string }) {
  return (
    <section aria-busy="true">
      <h2 className="mb-3 border-b border-line pb-2 text-label text-fg-muted">{title}</h2>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
      </div>
    </section>
  );
}

// A small timetable: day column, then what and when.
async function ComingUp() {
  const { sessions } = await listSessions("upcoming", 1);
  const next = sessions.slice(0, 4);
  if (!next.length) return null;
  return (
    <Rail title="Coming up" href="/sessions" linkLabel="All sessions">
      <ul className="flex flex-col">
        {next.map((s) => {
          const day = sessionDay(s.starts_at);
          return (
            <li key={s.id}>
              <Link href={`/sessions/${s.id}`} className="group -mx-2 flex gap-3 rounded-control px-2 py-2 transition-colors duration-150 hover:bg-subtle">
                <span className="w-9 shrink-0 text-center leading-none">
                  <span className="block text-label text-fg-subtle">{day.weekday}</span>
                  <span className="mt-1 block font-display text-[1.25rem] text-fg">{day.day}</span>
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 text-small font-medium text-fg">{s.title}</span>
                  <span className="block text-caption text-fg-subtle">
                    {typeLabel(s.type)} · {clock.format(new Date(s.starts_at))}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </Rail>
  );
}

// People whose skills match what you want to learn (the matching engine).
async function CanTeachYou() {
  const { matches } = await getMatches({ mode: "teaches_me", sameUni: false, page: 1 });
  const people = matches.filter((m) => m.teaches_you.length > 0).slice(0, 4);
  if (!people.length) return null;
  return (
    <Rail title="Can teach you" href="/matches?mode=teaches_me" linkLabel="See all">
      <ul className="flex flex-col">
        {people.map((p) => (
          <li key={p.profile_id}>
            <Link href={`/u/${p.username}`} className="group -mx-2 flex items-center gap-2.5 rounded-control px-2 py-2 transition-colors duration-150 hover:bg-subtle">
              <Avatar name={p.display_name} path={p.avatar_path} size={32} />
              <span className="min-w-0 leading-tight">
                <span className="block truncate text-small font-medium text-fg">{p.display_name}</span>
                <span className="block truncate text-caption text-brand-ink">{p.teaches_you.slice(0, 2).join(", ")}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Rail>
  );
}

async function NewCourses({ meId }: { meId: string }) {
  const { courses } = await searchCourses({ page: 1 });
  const fresh = courses.filter((c) => c.owner_id !== meId).slice(0, 3);
  if (!fresh.length) return null;
  return (
    <Rail title="New courses" href="/courses" linkLabel="Catalogue">
      <ul className="flex flex-col">
        {fresh.map((c) => (
          <li key={c.id}>
            <Link href={`/courses/${c.id}`} className="group -mx-2 block rounded-control px-2 py-2 transition-colors duration-150 hover:bg-subtle">
              <span className="block text-small font-medium text-fg">{c.title}</span>
              <span className="flex justify-between gap-2 text-caption text-fg-subtle">
                <span className="truncate">{c.owner_name}</span>
                <span className={c.price_php === 0 ? "shrink-0 text-brand-ink" : "shrink-0"}>{formatPrice(c.price_php)}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </Rail>
  );
}
