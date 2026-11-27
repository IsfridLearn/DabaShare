import { Flag, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { ReactNode } from "react";
import { EnrollmentPanel } from "@/components/courses/enrollment-panel";
import { EnrollmentRequests } from "@/components/courses/owner-tools";
import { MessageButton } from "@/components/messages/message-button";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { BackLink, Badge, Properties } from "@/components/ui/primitives";
import { NoticeToast } from "@/components/ui/toast";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getCourseDetail, getCourseEnrollments, getMyEnrollment, getPublishedCoursesBy } from "@/lib/courses/queries";
import { formatPrice, levelLabel, STATUSES } from "@/lib/courses/validation";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Course" };

const NOTICES: Record<string, { tone: "success" | "error"; text: string }> = {
  created: { tone: "success", text: "Your course is posted." },
  updated: { tone: "success", text: "Changes saved." },
  "skills-failed": { tone: "error", text: "The course was saved, but its skills weren't. Edit the course to add them." },
};

// A course page reads like a bulletin entry: the course, then who teaches it.
// The facts panel holds the price and the one action (enrol or edit).
export default async function CoursePage({ params, searchParams }: PageProps<"/courses/[id]">) {
  const me = await requireOnboardedProfile();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const course = await getCourseDetail(id);
  if (!course) notFound();

  const isOwner = course.owner_id === me.id;
  const owner = course.owner;
  const [enrollment, enrollments, ownerCourses] = await Promise.all([
    isOwner ? null : getMyEnrollment(course.id, me.id),
    isOwner ? getCourseEnrollments(course.id) : [],
    owner ? getPublishedCoursesBy(owner.id) : [],
  ]);
  const notice = typeof query.notice === "string" ? NOTICES[query.notice] : undefined;
  const statusLabel = STATUSES.find((s) => s.value === course.status)?.label;
  const free = course.price_php === 0;
  const alsoTaught = ownerCourses.filter((c) => c.id !== course.id).slice(0, 4);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <BackLink href="/courses">All courses</BackLink>
      {notice?.tone === "error" && <Alert tone="error">{notice.text}</Alert>}
      {notice && notice.tone !== "error" && <NoticeToast key={notice.text} tone={notice.tone} message={notice.text} />}

      {/* Phones: masthead, then the action panel, then the body. */}
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_18rem] lg:gap-14">
        <article className="contents lg:flex lg:min-w-0 lg:flex-col">
          <header className="order-1 lg:order-none">
            <p className="flex flex-wrap items-center gap-2 text-label text-fg-subtle">
              {course.category && <span>{course.category.name}</span>}
              <span aria-hidden="true">·</span>
              <span>{levelLabel(course.level)}</span>
              {course.status !== "published" && <Badge tone="warning">{statusLabel}</Badge>}
            </p>
            <h1 className="mt-2 text-[2.25rem] leading-[1.02] break-words sm:text-display">{course.title}</h1>
            {owner && (
              <p className="mt-4 flex items-center gap-2 text-small text-fg-muted">
                <Avatar name={owner.display_name} path={owner.avatar_path} size={22} />
                <span>
                  Taught by{" "}
                  <Link href={`/u/${owner.username}`} className="font-medium text-fg hover:underline">
                    {owner.display_name}
                  </Link>
                  {owner.university && <> · {owner.university.name}</>}
                </span>
              </p>
            )}
          </header>

          <div className="order-3 flex flex-col gap-10 lg:order-none lg:mt-8">
            <section aria-labelledby="about-title" className="border-t border-line pt-6">
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
                      <Link
                        href={`/report?type=course&id=${course.id}`}
                        className="inline-flex items-center gap-1.5 text-small text-fg-subtle hover:text-danger-ink"
                      >
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
        </article>

        <aside className="contents lg:sticky lg:top-10 lg:flex lg:flex-col lg:gap-6 lg:self-start" aria-label="Course details">
          <section className="order-2 flex flex-col gap-4 rounded-card border border-line bg-surface p-5 lg:order-none">
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
          </section>

          <Properties
            className="order-4 px-1 lg:order-none"
            items={[
              { label: "Level", value: levelLabel(course.level) },
              ...(course.category ? [{ label: "Category", value: course.category.name }] : []),
              { label: "Price", value: formatPrice(course.price_php) },
              ...(isOwner ? [{ label: "Status", value: statusLabel ?? course.status }] : []),
            ]}
          />
        </aside>
      </div>

      {isOwner && (
        <section aria-labelledby="enrollments-title" className="mt-6 border-t border-line pt-8">
          <h2 id="enrollments-title" className="text-heading">
            Enrollments
          </h2>
          <p className="mt-0.5 mb-5 text-small text-fg-muted">Accept requests to give students a place. They get a notification either way.</p>
          <EnrollmentRequests enrollments={enrollments} />
        </section>
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
