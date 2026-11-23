"use client";

import { useActionState } from "react";
import { fileReport } from "@/lib/safety/actions";
import { REPORT_REASONS, type ReportTarget } from "@/lib/safety/options";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Field, Textarea } from "@/components/ui/field";
import { errorProps, fieldError, FormMessage } from "@/components/ui/form-message";

export function ReportForm({ targetType, targetId }: { targetType: ReportTarget; targetId: string }) {
  const [state, action, pending] = useActionState(fileReport, initialFormState);

  if (state.status === "success") return <FormMessage state={state} />;

  return (
    <form action={action} className="flex flex-col gap-4" noValidate>
      <FormMessage state={state} />
      <input type="hidden" name="targetType" value={targetType} />
      <input type="hidden" name="targetId" value={targetId} />
      <fieldset>
        <legend className="mb-2 text-sm font-medium text-gray-700">What&apos;s wrong?</legend>
        <div className="flex flex-col gap-2">
          {REPORT_REASONS.map((r) => (
            <label
              key={r.value}
              className="flex cursor-pointer items-center gap-2.5 rounded-control border border-gray-200 px-3 py-2 text-sm has-checked:border-brand has-checked:bg-brand-soft"
            >
              <input
                type="radio"
                name="reason"
                value={r.value}
                defaultChecked={state.values?.reason === r.value}
                className="accent-brand"
              />
              {r.label}
            </label>
          ))}
        </div>
        {fieldError(state, "reason") && <p className="mt-1 text-sm text-danger-ink">{fieldError(state, "reason")}</p>}
      </fieldset>
      <Field label="Details (optional)" htmlFor="details" error={fieldError(state, "details")}>
        <Textarea id="details" name="details" maxLength={1000} rows={4} defaultValue={state.values?.details} {...errorProps(state, "details")} />
      </Field>
      <div>
        <Button type="submit" variant="danger" disabled={pending}>
          {pending ? "Sending…" : "Send report"}
        </Button>
      </div>
    </form>
  );
}
