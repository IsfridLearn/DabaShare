"use client";

import { useActionState } from "react";
import { cancelEnrollment, enroll } from "@/lib/courses/actions";
import type { Enrollment } from "@/lib/courses/queries";
import { formatPrice } from "@/lib/courses/validation";
import { initialFormState } from "@/lib/forms";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { errorProps, fieldError, FormMessage } from "@/components/ui/form-message";

export function EnrollmentPanel({
  courseId,
  pricePhp,
  tutorName,
  enrollment,
}: {
  courseId: string;
  pricePhp: number;
  tutorName: string;
  enrollment: Enrollment | null;
}) {
  const [state, action, pending] = useActionState(enroll.bind(null, courseId), initialFormState);
  const free = pricePhp === 0;
  const status = enrollment?.status;

  if (status === "accepted") {
    return (
      <div className="flex flex-col gap-3">
        <Alert tone="success">
          You&apos;re enrolled.{" "}
          {free ? "Reach out to the tutor to plan your sessions." : `Arrange the ${formatPrice(pricePhp)} payment and schedule directly with ${tutorName}.`}
        </Alert>
        <form action={cancelEnrollment.bind(null, enrollment!.id)}>
          <Button type="submit" variant="ghost" size="sm">
            Leave this course
          </Button>
        </form>
      </div>
    );
  }

  if (status === "requested") {
    return (
      <div className="flex flex-col gap-3">
        <Alert tone="info">Request sent. {tutorName} will accept or decline it, and you&apos;ll get a notification.</Alert>
        <form action={cancelEnrollment.bind(null, enrollment!.id)}>
          <Button type="submit" variant="ghost" size="sm">
            Cancel request
          </Button>
        </form>
      </div>
    );
  }

  if (status === "declined") {
    return <Alert tone="info">{tutorName} declined your request for this course.</Alert>;
  }

  // No enrollment yet, or cancelled earlier.
  return (
    <form action={action} className="flex flex-col gap-3" noValidate>
      <FormMessage state={state} />
      {!free && (
        <>
          <Field
            label={`Message to ${tutorName} (optional)`}
            htmlFor="note"
            error={fieldError(state, "note")}
            hint="Say what you'd like to learn or when you're available."
          >
            <Textarea id="note" name="note" maxLength={500} rows={3} defaultValue={state.values?.note} {...errorProps(state, "note")} />
          </Field>
          <p className="text-sm text-gray-600">
            Paid course: if {tutorName} accepts, you arrange the {formatPrice(pricePhp)} payment with them directly.
            DabaShare doesn&apos;t handle payments.
          </p>
        </>
      )}
      <Button type="submit" size="lg" fullWidth disabled={pending}>
        {pending ? "Sending…" : free ? "Enroll for free" : `Request to enroll · ${formatPrice(pricePhp)}`}
      </Button>
    </form>
  );
}
