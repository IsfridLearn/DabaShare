import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge, PageHeader, RowList, Section } from "@/components/ui/primitives";
import { NoticeToast } from "@/components/ui/toast";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getMyLearning, getMyTeaching, type EnrollmentStatus } from "@/lib/courses/queries";
import { formatPrice, STATUSES } from "@/lib/courses/validation";
import { getNextLessons, type Lesson } from "@/lib/courses/space-queries";
import { clockRange, sessionDay } from "@/lib/sessions/validation";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "My courses" };

const ENROLLMENT: Record<EnrollmentStatus, { label: string; tone: "success" | "brand" | "neutral" }> = {
  requested: { label: "Waiting for tutor", tone: "brand" },
  accepted: { label: "Enrolled", tone: "success" },
  declined: { label: "Declined", tone: "neutral" },
  cancelled: { label: "Cancelled", tone: "neutral" },
};

const row = "group flex items-center gap-x-4 gap-y-1 px-4 py-3.5 transition-colors duration-150 hover:bg-subtle sm:px-5";

export default async function MyCoursesPage({ searchParams }: PageProps<"/courses/mine">) {
  const me = await requireOnboardedProfile();
  const [teaching, learning, query] = await Promise.all([getMyTeaching(me.id), getMyLearning(me.id), searchParams]);
  const next = await getNextLessons([
    ...teaching.map((c) => c.id),
    ...learning.filter((e) => e.status === "accepted" && e.course).map((e) => e.course!.id),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-10">
      <div className="flex flex-col gap-4">
        <PageHeader
          title="My courses"
          description="What you teach and what you're learning."
          actions={
            <Link href="/courses/new" className={buttonClasses()}>
              <Plus className="size-4" aria-hidden="true" />
              Post a course
            </Link>
          }
        />
        {query.notice === "deleted" && <NoticeToast message="The course was deleted and its students were notified." />}
      </div>

      <Section title="Teaching">
        {teaching.length ? (
          <RowList label="Courses you teach">
            {teaching.map((c) => (
              <li key={c.id}>
                <Link href={`/courses/${c.id}`} className={row}>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-fg">{c.title}</span>
                    <span className="block text-small text-fg-subtle">
                      {formatPrice(c.price_php)} · {c.students === 1 ? "1 student" : `${c.students} students`}
                    </span>
                    <NextLesson lesson={next.get(c.id)} />
                  </span>
                  {c.status !== "published" && <Badge tone="warning">{STATUSES.find((s) => s.value === c.status)?.label}</Badge>}
                  {c.pending > 0 && (
                    <Badge tone="brand">
                      {c.pending} new request{c.pending === 1 ? "" : "s"}
                    </Badge>
                  )}
                  <ChevronRight className="size-4 shrink-0 text-fg-subtle group-hover:text-fg" aria-hidden="true" />
                </Link>
              </li>
            ))}
          </RowList>
        ) : (
          <EmptyState
            title="You're not teaching anything yet"
            description="Post a course to share a skill with other students."
            action={
              <Link href="/courses/new" className={buttonClasses({ variant: "secondary" })}>
                Post a course
              </Link>
            }
          />
        )}
      </Section>

      <Section title="Learning">
        {learning.length ? (
          <RowList label="Courses you joined">
            {learning.map((e) => (
              <li key={e.id}>
                {e.course ? (
                  <Link href={`/courses/${e.course.id}`} className={row}>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium text-fg">{e.course.title}</span>
                      <span className="block truncate text-small text-fg-subtle">
                        {e.course.owner ? `with ${e.course.owner.display_name} · ` : ""}
                        {formatPrice(e.course.price_php)}
                      </span>
                      {e.status === "accepted" && <NextLesson lesson={next.get(e.course.id)} />}
                    </span>
                    <Badge tone={ENROLLMENT[e.status].tone}>{ENROLLMENT[e.status].label}</Badge>
                    <ChevronRight className="size-4 shrink-0 text-fg-subtle group-hover:text-fg" aria-hidden="true" />
                  </Link>
                ) : (
                  <p className="px-4 py-3.5 text-small text-fg-subtle sm:px-5">A course you joined is no longer available.</p>
                )}
              </li>
            ))}
          </RowList>
        ) : (
          <EmptyState
            title="You haven't joined any courses"
            action={
              <Link href="/courses" className={buttonClasses({ variant: "secondary" })}>
                Browse courses
              </Link>
            }
          />
        )}
      </Section>
    </div>
  );
}

function NextLesson({ lesson }: { lesson?: Lesson }) {
  if (!lesson) return null;
  const day = sessionDay(lesson.starts_at);
  return (
    <span className="mt-1 block truncate text-caption text-brand-ink">
      Next lesson: {day.weekday} {day.month} {day.day} · {clockRange(lesson.starts_at, lesson.ends_at)}
    </span>
  );
}
