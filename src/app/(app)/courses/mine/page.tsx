import Link from "next/link";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Tag } from "@/components/ui/tag";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getMyLearning, getMyTeaching, type EnrollmentStatus } from "@/lib/courses/queries";
import { formatPrice, STATUSES } from "@/lib/courses/validation";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "My courses" };

const ENROLLMENT_LABEL: Record<EnrollmentStatus, string> = {
  requested: "Waiting for tutor",
  accepted: "Enrolled",
  declined: "Declined",
  cancelled: "Cancelled",
};

export default async function MyCoursesPage({ searchParams }: PageProps<"/courses/mine">) {
  const me = await requireOnboardedProfile();
  const [teaching, learning, query] = await Promise.all([getMyTeaching(me.id), getMyLearning(me.id), searchParams]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">My courses</h1>
        <Link href="/courses/new" className={buttonClasses({ size: "sm" })}>
          + Post a course
        </Link>
      </div>
      {query.notice === "deleted" && <Alert tone="success">The course was deleted and its students were notified.</Alert>}

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Teaching</h2>
        {teaching.length ? (
          <Card className="p-0">
            <ul className="divide-y divide-gray-100">
              {teaching.map((c) => (
                <li key={c.id}>
                  <Link href={`/courses/${c.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-gray-50">
                    <span className="min-w-0 flex-1 font-medium text-gray-900">{c.title}</span>
                    {c.status !== "published" && (
                      <Tag className="bg-amber-100 text-amber-800">{STATUSES.find((s) => s.value === c.status)?.label}</Tag>
                    )}
                    <span className="text-sm text-gray-500">{formatPrice(c.price_php)}</span>
                    <span className="text-sm text-gray-500">{c.students === 1 ? "1 student" : `${c.students} students`}</span>
                    {c.pending > 0 && <Tag tone="paid">{c.pending} new request{c.pending === 1 ? "" : "s"}</Tag>}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <EmptyState
            title="You're not teaching anything yet"
            description="Post a course to share a skill with other students."
            action={
              <Link href="/courses/new" className={buttonClasses({ variant: "outline" })}>
                Post a course
              </Link>
            }
          />
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold">Learning</h2>
        {learning.length ? (
          <Card className="p-0">
            <ul className="divide-y divide-gray-100">
              {learning.map((e) => (
                <li key={e.id}>
                  {e.course ? (
                    <Link href={`/courses/${e.course.id}`} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 hover:bg-gray-50">
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium text-gray-900">{e.course.title}</span>
                        {e.course.owner && <span className="block text-sm text-gray-500">with {e.course.owner.display_name}</span>}
                      </span>
                      <span className="text-sm text-gray-500">{formatPrice(e.course.price_php)}</span>
                      <Tag tone={e.status === "accepted" ? "free" : e.status === "requested" ? "learn" : "neutral"}>
                        {ENROLLMENT_LABEL[e.status]}
                      </Tag>
                    </Link>
                  ) : (
                    <p className="px-5 py-4 text-sm text-gray-500">A course you joined is no longer available.</p>
                  )}
                </li>
              ))}
            </ul>
          </Card>
        ) : (
          <EmptyState
            title="You haven't joined any courses"
            action={
              <Link href="/courses" className={buttonClasses({ variant: "outline" })}>
                Browse courses
              </Link>
            }
          />
        )}
      </section>
    </div>
  );
}
