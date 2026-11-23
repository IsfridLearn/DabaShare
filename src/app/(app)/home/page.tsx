import Link from "next/link";
import { Suspense } from "react";
import { Composer } from "@/components/feed/composer";
import { FeedList } from "@/components/feed/feed-list";
import { FollowButton } from "@/components/feed/follow-button";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton, Tabs } from "@/components/ui/primitives";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getAttachOptions, getFeed, getFollowingIds } from "@/lib/feed/queries";
import { formatWhen, parseScope } from "@/lib/feed/validation";
import { getMatches } from "@/lib/matching/queries";
import { listSessions } from "@/lib/sessions/queries";
import { typeLabel } from "@/lib/sessions/validation";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Home" };

export default async function HomePage({ searchParams }: PageProps<"/home">) {
  const me = await requireOnboardedProfile();
  const scope = parseScope((await searchParams).feed);
  const [feed, attach] = await Promise.all([getFeed(scope), getAttachOptions(me.id)]);

  return (
    <div className="grid gap-10 xl:grid-cols-[minmax(0,1fr)_18rem]">
      <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-5">
        <h1 className="text-title">Home</h1>
        <Composer name={me.display_name} avatarPath={me.avatar_path} sessions={attach.sessions} courses={attach.courses} />
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
            scope === "following" ? (
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
            )
          }
        />
      </div>

      <aside aria-label="Suggestions" className="hidden flex-col gap-8 xl:flex">
        <Suspense fallback={<RailSkeleton title="People to follow" />}>
          <PeopleToFollow meId={me.id} />
        </Suspense>
        <Suspense fallback={<RailSkeleton title="Upcoming sessions" />}>
          <UpcomingSessions />
        </Suspense>
      </aside>
    </div>
  );
}

function RailTitle({ title, href }: { title: string; href: string }) {
  return (
    <div className="mb-3 flex items-baseline justify-between">
      <h2 className="text-small font-semibold text-fg">{title}</h2>
      <Link href={href} className="text-caption text-fg-subtle hover:text-fg">
        See all
      </Link>
    </div>
  );
}

function RailSkeleton({ title }: { title: string }) {
  return (
    <section aria-busy="true">
      <h2 className="mb-3 text-small font-semibold text-fg">{title}</h2>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    </section>
  );
}

async function PeopleToFollow({ meId }: { meId: string }) {
  const [{ matches }, following] = await Promise.all([getMatches({ sameUni: false, page: 1 }), getFollowingIds(meId)]);
  const people = matches.filter((m) => !following.has(m.profile_id)).slice(0, 4);
  if (!people.length) return null;
  return (
    <section>
      <RailTitle title="People to follow" href="/matches" />
      <ul className="flex flex-col gap-3">
        {people.map((p) => (
          <li key={p.profile_id} className="flex items-center gap-2.5">
            <Avatar name={p.display_name} path={p.avatar_path} size={36} />
            <div className="min-w-0 flex-1 leading-tight">
              {p.username ? (
                <Link href={`/u/${p.username}`} className="block truncate text-small font-medium text-fg hover:underline">
                  {p.display_name}
                </Link>
              ) : (
                <span className="block truncate text-small font-medium text-fg">{p.display_name}</span>
              )}
              <span className="block truncate text-caption text-fg-subtle">
                {p.teaches_you?.length ? `Can teach you ${p.teaches_you[0]}` : [p.program, p.university_short].filter(Boolean).join(" · ")}
              </span>
            </div>
            <FollowButton profileId={p.profile_id} following={false} name={p.display_name} />
          </li>
        ))}
      </ul>
    </section>
  );
}

async function UpcomingSessions() {
  const { sessions } = await listSessions("upcoming", 1);
  const next = sessions.slice(0, 3);
  if (!next.length) return null;
  return (
    <section>
      <RailTitle title="Upcoming sessions" href="/sessions" />
      <ul className="flex flex-col gap-1">
        {next.map((s) => (
          <li key={s.id}>
            <Link href={`/sessions/${s.id}`} className="-mx-2 block rounded-control px-2 py-2 hover:bg-subtle">
              <span className="block truncate text-small font-medium text-fg">{s.title}</span>
              <span className="block truncate text-caption text-fg-subtle">
                {typeLabel(s.type)} · {formatWhen(s.starts_at)}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
