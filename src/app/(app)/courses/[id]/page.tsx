import { CalendarDays, Flag, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { EnrollmentPanel } from "@/components/courses/enrollment-panel";
import { EnrollmentRequests } from "@/components/courses/owner-tools";
import { Reviews } from "@/components/courses/space/reviews";
import { Schedule } from "@/components/courses/space/schedule";
import { RatingInline } from "@/components/courses/space/stars";
import { Updates } from "@/components/courses/space/updates";
import { MessageButton } from "@/components/messages/message-button";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { BackLink, Badge, Properties, Tabs } from "@/components/ui/primitives";
import { NoticeToast } from "@/components/ui/toast";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getCourseDetail, getCourseEnrollments, getMyEnrollment, getPublishedCoursesBy } from "@/lib/courses/queries";
import { getLessons, getNextLessons, getRatingSummaries, getReviews, getUpdates } from "@/lib/courses/space-queries";
import { parseCourseTab, type CourseTab } from "@/lib/courses/space-validation";
import { formatPrice, levelLabel, STATUSES } from "@/lib/courses/validation";
import { clockRange, isoToManila, sessionDay } from "@/lib/sessions/validation";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Course" };

const NOTICES: Record<string, { tone: "success" | "error"; text: string }> = {
  created: { tone: "success", text: "Your course is posted." },
  updated: { tone: "success", text: "Changes saved." },
  "skills-failed": { tone: "error", text: "The course was saved, but its skills weren't. Edit the course to add them." },
};

// The course page is also the course space: everyone sees the overview and
// reviews; the tutor and enrolled students also get the schedule and updates;
// the tutor manages students. Each tab loads only its own data.
export default async function CoursePage({ params, searchParams }: PageProps<"/courses/[id]">) {
  const me = await requireOnboardedProfile();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const course = await getCourseDetail(id);
  if (!course) notFound();

  const isOwner = course.owner_id === me.id;
  const owner = course.owner;
  const enrollment = isOwner ? null : await getMyEnrollment(course.id, me.id);
  const member = isOwner || enrollment?.status === "accepted";
  const tab = parseCourseTab(query.tab, { member, owner: isOwner });

  const [ratings, nextLessons, tabData] = await Promise.all([
    getRatingSummaries([course.id]),
    member ? getNextLessons([course.id]) : new Map(),
    loadTab(tab, course.id, owner?.id, isOwner),
  ]);
  const rating = ratings.get(course.id) ?? null;
  const next = nextLessons.get(course.id);
  const notice = typeof query.notice === "string" ? NOTICES[query.notice] : undefined;
  const statusLabel = STATUSES.find((s) => s.value === course.status)?.label;
  const free = course.price_php === 0;
  const href = (t: CourseTab) => (t === "overview" ? `/courses/${course.id}` : `/courses/${course.id}?tab=${t}`);
  const pendingCount = tabData.kind === "students" ? tabData.enrollments.filter((e) => e.status === "requested").length : undefined;

  const tabs = [
    { key: "overview" as const, label: "Overview", show: true },
    { key: "schedule" as const, label: "Schedule", show: member },
    { key: "updates" as const, label: "Updates", show: member },
    { key: "reviews" as const, label: "Reviews", show: true, count: rating?.count },
    { key: "students" as const, label: "Students", show: isOwner, count: pendingCount || undefined },
  ].filter((t) => t.show);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <BackLink href="/courses">All courses</BackLink>
      {notice?.tone === "error" && <Alert tone="error">{notice.text}</Alert>}
      {notice && notice.tone !== "error" && <NoticeToast key={notice.text} tone={notice.tone} message={notice.text} />}

      <header>
        <p className="flex flex-wrap items-center gap-2 text-label text-fg-subtle">
          {course.category && <span>{course.category.name}</span>}
          <span aria-hidden="true">·</span>
          <span>{levelLabel(course.level)}</span>
          {course.status !== "published" && <Badge tone="warning">{statusLabel}</Badge>}
        </p>
        <h1 className="mt-2 text-[2.25rem] leading-[1.02] break-words sm:text-display">{course.title}</h1>
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-small text-fg-muted">
          {owner && (
            <span className="flex items-center gap-2">
              <Avatar name={owner.display_name} path={owner.avatar_path} size={22} />
              <span>
                Taught by{" "}
                <Link href={`/u/${owner.username}`} className="font-medium text-fg hover:underline">
                  {owner.display_name}
                </Link>
                {owner.university && <> · {owner.university.name}</>}
              </span>
            </span>
          )}
          {rating && (
            <Link href={href("reviews")} className="hover:underline">
              <RatingInline avg={rating.avg} count={rating.count} />
            </Link>
          )}
        </div>
      </header>

      {/* Phones: the action panel comes before the tabs. */}
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-14">
        <div className="order-2 flex min-w-0 flex-col gap-6 lg:order-none">
          <Tabs
            label="Course sections"
            items={tabs.map((t) => ({ href: href(t.key), label: t.label, active: tab === t.key, count: t.count }))}
          />
          {tabData.kind === "overview" && (
            <Overview course={course} owner={owner} isOwner={isOwner} alsoTaught={tabData.alsoTaught.filter((c) => c.id !== course.id).slice(0, 4)} />
          )}
          {tabData.kind === "schedule" && (
            <Schedule courseId={course.id} lessons={tabData.lessons} isOwner={isOwner} minDate={isoToManila(new Date().toISOString()).date} free={free} />
          )}
          {tabData.kind === "updates" && <Updates courseId={course.id} updates={tabData.updates} isOwner={isOwner} />}
          {tabData.kind === "reviews" && (
            <Reviews
              courseId={course.id}
              reviews={tabData.reviews}
              summary={rating}
              meId={me.id}
              canReview={!isOwner && Boolean(enrollment?.completed_at)}
              isOwner={isOwner}
            />
          )}
          {tabData.kind === "students" && (
            <section aria-label="Students">
              <p className="mb-5 text-small text-fg-muted">
                Accept requests to give students a place. Mark students as finished when they complete the course; finished students can
                leave a review.
              </p>
              <EnrollmentRequests enrollments={tabData.enrollments} />
            </section>
          )}
        </div>

        <aside className="order-1 flex flex-col gap-6 lg:sticky lg:top-10 lg:order-none lg:self-start" aria-label="Course details">
          <section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
            <div>
              <h2 className="sr-only">{isOwner ? "Your course" : "Enroll"}</h2>
              <p className={free ? "font-display text-title text-brand-ink" : "font-display text-title text-fg"}>{formatPrice(course.price_php)}</p>
              <p className="mt-1 text-small text-fg-muted">{free ? "Free to join" : "Paid directly to the tutor"}</p>
            </div>
            {isOwner ? (
              <Link href={`/courses/${course.id}/edit`} className={buttonClasses({ variant: "secondary", fullWidth: true })}>
                <Pencil className="size-4" aria-hidden="true" />
                Edit course
              </Link>
            ) : (
              <EnrollmentPanel
                courseId={course.id}
                pricePhp={course.price_php}
                tutorName={owner?.display_name ?? "The tutor"}
                enrollment={enrollment}
              />
            )}
            {member && next && (
              <Link href={href("schedule")} className="group flex items-start gap-2.5 border-t border-line pt-4">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-brand-ink" aria-hidden="true" />
                <span className="min-w-0 text-small">
                  <span className="block text-label text-fg-subtle">Next lesson</span>
                  <span className="mt-0.5 block truncate font-medium text-fg group-hover:underline">{next.title}</span>
                  <span className="block text-fg-muted">
                    {sessionDay(next.starts_at).weekday} {sessionDay(next.starts_at).month} {sessionDay(next.starts_at).day} ·{" "}
                    {clockRange(next.starts_at, next.ends_at)}
                  </span>
                </span>
              </Link>
            )}
          </section>

          {/* Phones: the masthead and panel already say all of this. */}
          <div className="hidden lg:block">
          <Properties
            className="px-1"
            items={[
              { label: "Level", value: levelLabel(course.level) },
              ...(course.category ? [{ label: "Category", value: course.category.name }] : []),
              { label: "Price", value: formatPrice(course.price_php) },
              ...(isOwner ? [{ label: "Status", value: statusLabel ?? course.status }] : []),
            ]}
          />
          </div>
        </aside>
      </div>
    </div>
  );
}

type TabData =
  | { kind: "overview"; alsoTaught: Awaited<ReturnType<typeof getPublishedCoursesBy>> }
  | { kind: "schedule"; lessons: Awaited<ReturnType<typeof getLessons>> }
  | { kind: "updates"; updates: Awaited<ReturnType<typeof getUpdates>> }
  | { kind: "reviews"; reviews: Awaited<ReturnType<typeof getReviews>> }
  | { kind: "students"; enrollments: Awaited<ReturnType<typeof getCourseEnrollments>> };

async function loadTab(tab: CourseTab, courseId: string, ownerId: string | undefined, isOwner: boolean): Promise<TabData> {
  switch (tab) {
    case "schedule":
      return { kind: "schedule", lessons: await getLessons(courseId) };
    case "updates":
      return { kind: "updates", updates: await getUpdates(courseId) };
    case "reviews":
      return { kind: "reviews", reviews: await getReviews(courseId) };
    case "students":
      return { kind: "students", enrollments: isOwner ? await getCourseEnrollments(courseId) : [] };
    default:
      return { kind: "overview", alsoTaught: ownerId ? await getPublishedCoursesBy(ownerId) : [] };
  }
}

function Overview({
  course,
  owner,
  isOwner,
  alsoTaught,
}: {
  course: NonNullable<Awaited<ReturnType<typeof getCourseDetail>>>;
  owner: NonNullable<Awaited<ReturnType<typeof getCourseDetail>>>["owner"];
  isOwner: boolean;
  alsoTaught: Awaited<ReturnType<typeof getPublishedCoursesBy>>;
}) {
  return (
    <div className="flex flex-col gap-10">
      <section aria-labelledby="about-title">
        <h2 id="about-title" className="text-label text-fg-muted">
          About this course
        </h2>
        <p className="mt-3 max-w-[66ch] text-[1.0625rem] leading-7 break-words whitespace-pre-line text-fg">{course.description}</p>
      </section>

      {course.skills.length > 0 && (
        <Section title="Skills you'll learn">
          <ul className="flex flex-wrap gap-1.5">
            {course.skills.map((s) => (
              <li key={s} className="rounded-control border border-line-strong bg-surface px-2.5 py-1 text-small font-medium text-fg">
                {s}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {owner && (
        <Section title="Your tutor">
          <div className="flex flex-wrap items-center gap-4">
            <Link href={`/u/${owner.username}`} className="group flex min-w-0 items-center gap-3">
              <Avatar name={owner.display_name} path={owner.avatar_path} size={44} />
              <span className="min-w-0">
                <span className="block truncate font-semibold text-fg group-hover:underline">{owner.display_name}</span>
                {owner.university && <span className="block truncate text-small text-fg-muted">{owner.university.name}</span>}
              </span>
            </Link>
            {!isOwner && (
              <div className="flex items-center gap-3 sm:ml-auto">
                <MessageButton otherId={owner.id} variant="secondary" size="sm" />
                <Link href={`/report?type=course&id=${course.id}`} className="inline-flex items-center gap-1.5 text-small text-fg-subtle hover:text-danger-ink">
                  <Flag className="size-3.5" aria-hidden="true" />
                  Report course
                </Link>
              </div>
            )}
          </div>
          {alsoTaught.length > 0 && (
            <div className="mt-5">
              <p className="text-small text-fg-muted">Also taught by {isOwner ? "you" : owner.display_name}</p>
              <ul className="mt-1 divide-y divide-line border-y border-line">
                {alsoTaught.map((c) => (
                  <li key={c.id}>
                    <Link href={`/courses/${c.id}`} className="flex items-baseline justify-between gap-3 py-2.5 hover:underline hover:decoration-line-strong hover:underline-offset-4">
                      <span className="min-w-0 truncate font-medium text-fg">{c.title}</span>
                      <span className={c.price_php === 0 ? "shrink-0 text-small text-brand-ink" : "shrink-0 text-small text-fg-muted"}>
                        {formatPrice(c.price_php)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="border-t border-line pt-6">
      <h2 className="mb-3 text-label text-fg-muted">{title}</h2>
      {children}
    </section>
  );
}
