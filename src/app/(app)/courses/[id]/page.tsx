import { Flag, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnrollmentPanel } from "@/components/courses/enrollment-panel";
import { EnrollmentRequests } from "@/components/courses/owner-tools";
import { MessageButton } from "@/components/messages/message-button";
import { Alert } from "@/components/ui/alert";
import { NoticeToast } from "@/components/ui/toast";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { BackLink, Badge, Properties } from "@/components/ui/primitives";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getCourseDetail, getCourseEnrollments, getMyEnrollment } from "@/lib/courses/queries";
import { formatPrice, levelLabel, STATUSES } from "@/lib/courses/validation";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Course" };

const NOTICES: Record<string, { tone: "success" | "error"; text: string }> = {
  created: { tone: "success", text: "Your course is posted." },
  updated: { tone: "success", text: "Changes saved." },
  "skills-failed": { tone: "error", text: "The course was saved, but its skills weren't. Edit the course to add them." },
};

export default async function CoursePage({ params, searchParams }: PageProps<"/courses/[id]">) {
  const me = await requireOnboardedProfile();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const course = await getCourseDetail(id);
  if (!course) notFound();

  const isOwner = course.owner_id === me.id;
  const [enrollment, enrollments] = await Promise.all([
    isOwner ? null : getMyEnrollment(course.id, me.id),
    isOwner ? getCourseEnrollments(course.id) : [],
  ]);
  const notice = typeof query.notice === "string" ? NOTICES[query.notice] : undefined;
  const owner = course.owner;
  const statusLabel = STATUSES.find((s) => s.value === course.status)?.label;
  const free = course.price_php === 0;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <BackLink href="/courses">All courses</BackLink>
      {notice?.tone === "error" && <Alert tone="error">{notice.text}</Alert>}
      {notice && notice.tone !== "error" && <NoticeToast key={notice.text} tone={notice.tone} message={notice.text} />}

      <div className="flex flex-col gap-8 lg:grid lg:gap-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
        {/* The course reads like a document. */}
        <article className="contents lg:flex lg:min-w-0 lg:flex-col">
          <header className="order-1 lg:order-none">
          <p className="flex flex-wrap items-center gap-2 text-small text-fg-subtle">
            {course.category && <span>{course.category.name}</span>}
            {course.status !== "published" && <Badge tone="warning">{statusLabel}</Badge>}
          </p>
          <h1 className="mt-2 text-title break-words sm:text-display">{course.title}</h1>
          {owner && (
            <p className="mt-4 flex items-center gap-2 text-small text-fg-muted">
              <Avatar name={owner.display_name} path={owner.avatar_path} size={24} />
              <span>
                Taught by{" "}
                <Link href={`/u/${owner.username}`} className="font-medium text-fg hover:underline">
                  {owner.display_name}
                </Link>
                {owner.university && <> · {owner.university.short_name}</>}
              </span>
            </p>
          )}

          </header>
          <div className="order-3 lg:order-none">
          <div className="border-t lg:mt-8 border-line pt-8">
            <h2 className="sr-only">About this course</h2>
            <p className="max-w-[68ch] text-[1rem] leading-7 break-words whitespace-pre-line text-fg">{course.description}</p>
          </div>

          {course.skills.length > 0 && (
            <section className="mt-10">
              <h2 className="text-heading">Skills you&apos;ll learn</h2>
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {course.skills.map((s) => (
                  <li key={s}>
                    <Badge className="px-2 py-1 text-small">{s}</Badge>
                  </li>
                ))}
              </ul>
            </section>
          )}
          </div>
        </article>

        <aside className="contents lg:sticky lg:top-10 lg:flex lg:flex-col lg:gap-6 lg:self-start" aria-label="Course details">
          <section className="order-2 flex flex-col gap-4 rounded-card lg:order-none border border-line bg-surface p-5">
            <div>
              <h2 className="sr-only">{isOwner ? "Your course" : "Enroll"}</h2>
              <p className={free ? "text-title font-serif text-success-ink" : "text-title font-serif text-fg"}>{formatPrice(course.price_php)}</p>
              <p className="mt-0.5 text-small text-fg-muted">
                {free ? "Free to join" : "Paid directly to the tutor"} · {levelLabel(course.level)}
              </p>
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

          <div className="order-4 flex flex-col gap-6 lg:order-none">
          <Properties
            className="px-1"
            items={[
              { label: "Level", value: levelLabel(course.level) },
              ...(course.category ? [{ label: "Category", value: course.category.name }] : []),
              { label: "Price", value: formatPrice(course.price_php) },
              ...(isOwner ? [{ label: "Status", value: statusLabel ?? course.status }] : []),
            ]}
          />

          {owner && (
            <section className="flex flex-col gap-3 border-t border-line px-1 pt-6">
              <h2 className="text-small font-semibold text-fg">Tutor</h2>
              <Link href={`/u/${owner.username}`} className="group flex items-center gap-3">
                <Avatar name={owner.display_name} path={owner.avatar_path} size={40} />
                <span className="min-w-0">
                  <span className="block truncate font-medium text-fg group-hover:underline">{owner.display_name}</span>
                  {owner.university && <span className="block truncate text-small text-fg-muted">{owner.university.name}</span>}
                </span>
              </Link>
              {!isOwner && (
                <div className="flex flex-wrap items-center gap-3">
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
            </section>
          )}
          </div>
        </aside>
      </div>

      {isOwner && (
        <section aria-labelledby="enrollments-title" className="mt-4 border-t border-line pt-8">
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
