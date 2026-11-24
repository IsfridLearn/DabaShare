"use client";

import Link from "next/link";
import { useActionState } from "react";
import { decideEnrollment, deleteCourse } from "@/lib/courses/actions";
import type { OwnerEnrollment } from "@/lib/courses/queries";
import { initialFormState } from "@/lib/forms";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";
import { RowList } from "@/components/ui/primitives";

export function EnrollmentRequests({ enrollments }: { enrollments: OwnerEnrollment[] }) {
  const pending = enrollments.filter((e) => e.status === "requested");
  const accepted = enrollments.filter((e) => e.status === "accepted");

  return (
    <div className="grid gap-8 lg:grid-cols-2">
      <section className="flex flex-col gap-2">
        <h3 className="text-small font-semibold text-fg">
          Requests <span className="font-normal text-fg-subtle">({pending.length})</span>
        </h3>
        {pending.length ? (
          <RowList>
            {pending.map((e) => (
              <li key={e.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-start">
                <Person enrollment={e} />
                <div className="flex gap-2 sm:ml-auto">
                  <form action={decideEnrollment.bind(null, e.id, "accepted")}>
                    <Button type="submit" size="sm">
                      Accept
                    </Button>
                  </form>
                  <form action={decideEnrollment.bind(null, e.id, "declined")}>
                    <Button type="submit" size="sm" variant="secondary">
                      Decline
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </RowList>
        ) : (
          <p className="rounded-card border border-dashed border-line-strong px-4 py-5 text-small text-fg-subtle">No pending requests.</p>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="text-small font-semibold text-fg">
          Students <span className="font-normal text-fg-subtle">({accepted.length})</span>
        </h3>
        {accepted.length ? (
          <RowList>
            {accepted.map((e) => (
              <li key={e.id} className="flex items-center gap-2 px-4 py-3">
                <Person enrollment={e} />
                <form action={decideEnrollment.bind(null, e.id, "declined")} className="ml-auto">
                  <Button type="submit" size="sm" variant="ghost">
                    Remove
                  </Button>
                </form>
              </li>
            ))}
          </RowList>
        ) : (
          <p className="rounded-card border border-dashed border-line-strong px-4 py-5 text-small text-fg-subtle">No students yet.</p>
        )}
      </section>
    </div>
  );
}

function Person({ enrollment }: { enrollment: OwnerEnrollment }) {
  const student = enrollment.student;
  if (!student) return <span className="text-small text-fg-subtle">Student unavailable</span>;
  return (
    <div className="flex min-w-0 items-start gap-3">
      <Avatar name={student.display_name} path={student.avatar_path} size={32} />
      <div className="min-w-0">
        <Link href={`/u/${student.username}`} className="font-medium text-fg hover:underline">
          {student.display_name}
        </Link>
        {student.university && <span className="ml-2 text-small text-fg-subtle">{student.university.short_name}</span>}
        {enrollment.note && (
          <p className="mt-1 border-l-2 border-line-strong pl-2.5 text-small whitespace-pre-line text-fg-muted">{enrollment.note}</p>
        )}
      </div>
    </div>
  );
}

export function DeleteCourseForm({ courseId }: { courseId: string }) {
  const [state, action, pending] = useActionState(deleteCourse.bind(null, courseId), initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <label className="flex items-start gap-2.5 text-small text-fg-muted">
        <input type="checkbox" name="confirm" className="mt-0.5 size-4 accent-danger" />
        I understand this permanently deletes the course and its enrollments. Enrolled students are notified.
      </label>
      <div>
        <Button type="submit" variant="danger" size="sm" loading={pending}>
          {pending ? "Deleting…" : "Delete course"}
        </Button>
      </div>
    </form>
  );
}
