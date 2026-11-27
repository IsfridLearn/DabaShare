import { GraduationCap } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { FeedList } from "@/components/feed/feed-list";
import { FollowButton } from "@/components/feed/follow-button";
import { MessageButton } from "@/components/messages/message-button";
import { StudentMenu } from "@/components/safety/student-menu";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { Badge } from "@/components/ui/primitives";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getPublishedCoursesBy } from "@/lib/courses/queries";
import { formatPrice } from "@/lib/courses/validation";
import { getFeed, getSocial } from "@/lib/feed/queries";
import { skillOverlap } from "@/lib/profile/overlap";
import { getProfileDetailsById, getProfileDetailsByUsername, type SkillRef } from "@/lib/profile/queries";
import { getCategories } from "@/lib/reference";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Student profile" };

export default async function PublicProfilePage({ params }: PageProps<"/u/[username]">) {
  const me = await requireOnboardedProfile();
  const { username } = await params;
  // One round trip for everything that doesn't depend on the other student's id.
  const [profile, categories, mine] = await Promise.all([
    getProfileDetailsByUsername(username),
    getCategories(),
    getProfileDetailsById(me.id),
  ]);
  // RLS hides unfinished profiles and anyone in a block relationship.
  if (!profile) notFound();

  const isMe = profile.id === me.id;
  const interests = categories.filter((c) => profile.interestIds.includes(c.id));
  const [courses, social, posts] = await Promise.all([
    getPublishedCoursesBy(profile.id),
    getSocial(profile.id),
    getFeed("everyone", null, profile.id),
  ]);
  const overlap = mine && !isMe ? skillOverlap(mine, profile) : null;
  const hasOverlap = Boolean(overlap && (overlap.theyTeachYou.length || overlap.youTeachThem.length));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-10">
      <header className="flex flex-col gap-5 border-b border-line pb-8 sm:flex-row sm:items-end">
        <Avatar name={profile.display_name} path={profile.avatar_path} size={88} />
        <div className="min-w-0 flex-1">
          <h1 className="text-title break-words">{profile.display_name}</h1>
          <p className="mt-1 text-small text-fg-subtle">@{profile.username}</p>
          {(profile.program || profile.university) && (
            <p className="mt-2 flex items-center gap-1.5 text-fg-muted">
              <GraduationCap className="size-4 shrink-0 text-fg-subtle" aria-hidden="true" />
              {[profile.program, profile.university?.name].filter(Boolean).join(" · ")}
            </p>
          )}
          <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-small text-fg-muted">
            <span>
              <strong className="font-semibold text-fg">{social.followers.toLocaleString("en-US")}</strong>{" "}
              {social.followers === 1 ? "follower" : "followers"}
            </span>
            <span>
              <strong className="font-semibold text-fg">{social.following.toLocaleString("en-US")}</strong> following
            </span>
            {social.follows_me && !isMe && <Badge>Follows you</Badge>}
          </p>
        </div>
        {isMe ? (
          <Link href="/profile" className={buttonClasses({ variant: "secondary" })}>
            Edit profile
          </Link>
        ) : (
          <div className="flex w-full items-start gap-2 sm:w-auto">
            <div className="flex-1 sm:flex-none">
              <FollowButton profileId={profile.id} following={social.i_follow} name={profile.display_name} size="md" fullWidth />
            </div>
            <div className="flex-1 sm:flex-none">
              <MessageButton otherId={profile.id} variant="secondary" size="md" fullWidth />
            </div>
            <StudentMenu studentId={profile.id} />
          </div>
        )}
      </header>

      {/* Phones: about, then skills and courses, then posts. */}
      <div className="flex flex-col gap-10 lg:grid lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="contents lg:flex lg:min-w-0 lg:flex-col lg:gap-10">
          {profile.bio && (
            <section aria-labelledby="about-title" className="order-1 lg:order-none">
              <h2 id="about-title" className="text-heading">
                About
              </h2>
              <p className="mt-2 max-w-[68ch] leading-7 break-words whitespace-pre-line text-fg">{profile.bio}</p>
            </section>
          )}

          <section aria-labelledby="posts-title" className="order-3 flex flex-col gap-3 lg:order-none">
            <h2 id="posts-title" className="text-heading">
              Posts
            </h2>
            <FeedList
              key={posts.posts[0]?.id ?? "empty"}
              initial={posts.posts}
              initialHasMore={posts.hasMore}
              scope="everyone"
              onlyAuthor={profile.id}
              meId={me.id}
              label={`Posts by ${profile.display_name}`}
              empty={
                <p className="rounded-card border border-dashed border-line-strong px-5 py-6 text-center text-small text-fg-muted">
                  {isMe ? (
                    <>
                      You haven&apos;t posted yet.{" "}
                      <Link href="/home" className="font-medium text-brand-ink hover:underline">
                        Write your first post
                      </Link>
                    </>
                  ) : (
                    `${profile.display_name} hasn't posted yet.`
                  )}
                </p>
              }
            />
          </section>
        </div>

        <aside className="order-2 flex flex-col gap-8 lg:order-none" aria-label="Skills and courses">
          {hasOverlap && overlap && (
            <section className="rounded-card border border-line bg-surface p-4">
              <h2 className="text-small font-semibold text-fg">Why you two match</h2>
              {overlap.theyTeachYou.length > 0 && (
                <SkillGroup title={`${profile.display_name} can teach you`}>{overlap.theyTeachYou}</SkillGroup>
              )}
              {overlap.youTeachThem.length > 0 && <SkillGroup title={`You can teach ${profile.display_name}`}>{overlap.youTeachThem}</SkillGroup>}
            </section>
          )}

          <SkillList title="Can teach" skills={profile.teaches} />
          <SkillList title="Wants to learn" skills={profile.learns} />

          {courses.length > 0 && (
            <RailSection title={`Courses by ${isMe ? "you" : profile.display_name}`}>
              <ul className="-mx-2 flex flex-col">
                {courses.map((c) => (
                  <li key={c.id}>
                    <Link href={`/courses/${c.id}`} className="flex items-baseline justify-between gap-3 rounded-control px-2 py-1.5 hover:bg-subtle">
                      <span className="min-w-0 truncate text-small font-medium text-fg">{c.title}</span>
                      <span className={c.price_php === 0 ? "shrink-0 text-caption text-success-ink" : "shrink-0 text-caption text-fg-muted"}>
                        {formatPrice(c.price_php)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </RailSection>
          )}

          {interests.length > 0 && (
            <RailSection title="Interests">
              <p className="text-small text-fg-muted">{interests.map((c) => c.name).join(" · ")}</p>
            </RailSection>
          )}
        </aside>
      </div>
    </div>
  );
}

function RailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-small font-semibold text-fg">{title}</h2>
      {children}
    </section>
  );
}

function SkillGroup({ title, children }: { title: string; children: string[] }) {
  return (
    <div className="mt-3">
      <p className="mb-1.5 text-caption text-fg-subtle">{title}</p>
      <ul className="flex flex-wrap gap-1.5">
        {children.map((s) => (
          <li key={s}>
            <Badge tone="brand">{s}</Badge>
          </li>
        ))}
      </ul>
    </div>
  );
}

function SkillList({ title, skills }: { title: string; skills: SkillRef[] }) {
  return (
    <RailSection title={title}>
      {skills.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {skills.map((s) => (
            <li key={s.id}>
              <Badge className="px-2 py-1 text-small">{s.name}</Badge>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-small text-fg-subtle">Nothing listed yet.</p>
      )}
    </RailSection>
  );
}
