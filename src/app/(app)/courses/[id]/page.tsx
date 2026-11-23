import Link from "next/link";
import { notFound } from "next/navigation";
import { EnrollmentPanel } from "@/components/courses/enrollment-panel";
import { EnrollmentRequests } from "@/components/courses/owner-tools";
import { MessageButton } from "@/components/messages/message-button";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Link href="/courses" className="text-sm font-medium text-brand-ink hover:underline">
        ← All courses
      </Link>
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            <Tag tone={course.price_php === 0 ? "free" : "paid"} className="font-semibold">
              {formatPrice(course.price_php)}
            </Tag>
            <Tag>{levelLabel(course.level)}</Tag>
            {course.category && <Tag>{course.category.name}</Tag>}
            {course.status !== "published" && <Tag className="bg-amber-100 text-amber-800">{statusLabel}</Tag>}
          </div>
          <h1 className="text-2xl font-bold break-words sm:text-3xl">{course.title}</h1>
          <p className="leading-relaxed break-words whitespace-pre-line text-gray-700">{course.description}</p>
          {course.skills.length > 0 && (
            <div>
              <h2 className="mb-2 text-sm font-semibold text-gray-700">Skills you&apos;ll learn</h2>
              <ul className="flex flex-wrap gap-2">
                {course.skills.map((s) => (
                  <li key={s}>
                    <Tag tone="learn">{s}</Tag>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          {owner && (
            <Card className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-gray-500">Tutor</h2>
              <Link href={`/u/${owner.username}`} className="flex items-center gap-3 hover:text-brand-ink">
                <Avatar name={owner.display_name} path={owner.avatar_path} size={48} />
                <span>
                  <span className="block font-semibold">{owner.display_name}</span>
                  {owner.university && <span className="block text-sm text-gray-500">{owner.university.name}</span>}
                </span>
              </Link>
              {!isOwner && (
                <div className="flex flex-wrap items-center gap-2">
                  <MessageButton otherId={owner.id} variant="outline" />
                  <Link href={`/report?type=course&id=${course.id}`} className="text-sm text-gray-500 hover:text-danger-ink">
                    Report course
                  </Link>
                </div>
              )}
            </Card>
          )}

          <Card className="order-first flex flex-col gap-4 lg:order-none">
            {isOwner ? (
              <>
                <h2 className="text-lg font-semibold">Your course</h2>
                <Link href={`/courses/${course.id}/edit`} className={buttonClasses({ variant: "outline", fullWidth: true })}>
                  Edit course
                </Link>
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold">Enroll</h2>
                <EnrollmentPanel
                  courseId={course.id}
                  pricePhp={course.price_php}
                  tutorName={owner?.display_name ?? "The tutor"}
                  enrollment={enrollment}
                />
              </>
            )}
          </Card>
        </div>
      </div>

      {isOwner && (
        <Card>
          <h2 className="mb-4 text-lg font-semibold">Enrollments</h2>
          <EnrollmentRequests enrollments={enrollments} />
        </Card>
      )}
    </div>
  );
}
