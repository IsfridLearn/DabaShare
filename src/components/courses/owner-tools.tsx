"use client";

import Link from "next/link";
import { useActionState } from "react";
import { decideEnrollment, deleteCourse } from "@/lib/courses/actions";
import type { OwnerEnrollment } from "@/lib/courses/queries";
import { initialFormState } from "@/lib/forms";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";

export function EnrollmentRequests({ enrollments }: { enrollments: OwnerEnrollment[] }) {
  const pending = enrollments.filter((e) => e.status === "requested");
  const accepted = enrollments.filter((e) => e.status === "accepted");

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">Requests ({pending.length})</h3>
        {pending.length ? (
          <ul className="flex flex-col divide-y divide-gray-100">
            {pending.map((e) => (
              <li key={e.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-start">
                <Person enrollment={e} />
                <div className="flex gap-2 sm:ml-auto">
                  <form action={decideEnrollment.bind(null, e.id, "accepted")}>
                    <Button type="submit" size="sm">
                      Accept
                    </Button>
                  </form>
                  <form action={decideEnrollment.bind(null, e.id, "declined")}>
                    <Button type="submit" size="sm" variant="outline">
                      Decline
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No pending requests.</p>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h3 className="text-base font-semibold">Students ({accepted.length})</h3>
        {accepted.length ? (
          <ul className="flex flex-col divide-y divide-gray-100">
            {accepted.map((e) => (
              <li key={e.id} className="flex items-center gap-2 py-3">
                <Person enrollment={e} />
                <form action={decideEnrollment.bind(null, e.id, "declined")} className="ml-auto">
                  <Button type="submit" size="sm" variant="ghost">
                    Remove
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No students yet.</p>
        )}
      </section>
    </div>
  );
}

function Person({ enrollment }: { enrollment: OwnerEnrollment }) {
  const student = enrollment.student;
  if (!student) return <span className="text-sm text-gray-500">Student unavailable</span>;
  return (
    <div className="flex min-w-0 items-start gap-3">
      <Avatar name={student.display_name} path={student.avatar_path} size={36} />
      <div className="min-w-0">
        <Link href={`/u/${student.username}`} className="font-medium text-gray-900 hover:text-brand-ink">
          {student.display_name}
        </Link>
        {student.university && <span className="ml-2 text-sm text-gray-500">{student.university.short_name}</span>}
        {enrollment.note && <p className="mt-1 text-sm whitespace-pre-line text-gray-600">“{enrollment.note}”</p>}
      </div>
    </div>
  );
}

export function DeleteCourseForm({ courseId }: { courseId: string }) {
  const [state, action, pending] = useActionState(deleteCourse.bind(null, courseId), initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <label className="flex items-start gap-2.5 text-sm text-gray-700">
        <input type="checkbox" name="confirm" className="mt-0.5 size-4 accent-danger" />
        I understand this permanently deletes the course and its enrollments. Enrolled students are notified.
      </label>
      <div>
        <Button type="submit" variant="danger" size="sm" disabled={pending}>
          {pending ? "Deleting…" : "Delete course"}
        </Button>
      </div>
    </form>
  );
}
