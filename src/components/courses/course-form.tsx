"use client";

import { useActionState } from "react";
import { initialFormState, type FormState } from "@/lib/forms";
import { LEVELS, MAX_PRICE_PHP, STATUSES } from "@/lib/courses/validation";
import type { Category } from "@/lib/reference";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { errorProps, fieldError, FormMessage } from "@/components/ui/form-message";

export type CourseFormDefaults = {
  title: string;
  description: string;
  categoryId: string;
  level: string;
  priceType: "free" | "paid";
  pricePhp: string;
  status: string;
  skills: string;
};

export const emptyCourse: CourseFormDefaults = {
  title: "",
  description: "",
  categoryId: "",
  level: "beginner",
  priceType: "free",
  pricePhp: "",
  status: "published",
  skills: "",
};

export function CourseForm({
  action: serverAction,
  defaults,
  categories,
  submitLabel,
}: {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  defaults: CourseFormDefaults;
  categories: Category[];
  submitLabel: string;
}) {
  const [state, action, pending] = useActionState(serverAction, initialFormState);
  const v = { ...defaults, ...state.values } as CourseFormDefaults;

  return (
    <form action={action} className="flex flex-col gap-5" noValidate>
      <FormMessage state={state} />
      <Field label="Course title" htmlFor="title" error={fieldError(state, "title")}>
        <Input
          id="title"
          name="title"
          maxLength={120}
          placeholder="e.g. Introduction to Python"
          defaultValue={v.title}
          required
          {...errorProps(state, "title")}
        />
      </Field>

      <Field
        label="Description"
        htmlFor="description"
        error={fieldError(state, "description")}
        hint="What will students learn? How do sessions work (online, in person, schedule)?"
      >
        <Textarea
          id="description"
          name="description"
          maxLength={5000}
          rows={6}
          defaultValue={v.description}
          required
          {...errorProps(state, "description")}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category" htmlFor="categoryId" error={fieldError(state, "categoryId")}>
          <Select id="categoryId" name="categoryId" defaultValue={v.categoryId} required {...errorProps(state, "categoryId")}>
            <option value="" disabled>
              Choose a category
            </option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Level" htmlFor="level" error={fieldError(state, "level")}>
          <Select id="level" name="level" defaultValue={v.level} {...errorProps(state, "level")}>
            {LEVELS.map((l) => (
              <option key={l.value} value={l.value}>
                {l.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <fieldset className="group flex flex-col gap-3">
        <legend className="mb-1.5 text-sm font-medium text-gray-700">Price</legend>
        <div className="flex flex-wrap gap-3">
          {(["free", "paid"] as const).map((type) => (
            <label
              key={type}
              className="flex cursor-pointer items-center gap-2 rounded-control border border-gray-200 px-4 py-2 text-sm has-checked:border-brand has-checked:bg-brand-soft"
            >
              <input
                type="radio"
                id={`price-${type}`}
                name="priceType"
                value={type}
                defaultChecked={v.priceType === type}
                className="accent-brand"
              />
              {type === "free" ? "Free" : "Paid (₱)"}
            </label>
          ))}
        </div>
        {/* Shown only when "Paid" is selected — pure CSS, no JavaScript needed. */}
        <div className="hidden group-has-[#price-paid:checked]:block">
          <Field
            label="Amount (₱)"
            htmlFor="pricePhp"
            error={fieldError(state, "pricePhp")}
            hint="Students arrange payment with you directly. DabaShare doesn't handle payments."
          >
            <Input
              id="pricePhp"
              name="pricePhp"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_PRICE_PHP}
              step={1}
              className="max-w-40"
              defaultValue={v.pricePhp}
              {...errorProps(state, "pricePhp")}
            />
          </Field>
        </div>
        {fieldError(state, "pricePhp") && (
          <p className="text-sm text-danger group-has-[#price-paid:checked]:hidden">{fieldError(state, "pricePhp")}</p>
        )}
      </fieldset>

      <Field
        label="Skills taught"
        htmlFor="skills"
        error={fieldError(state, "skills")}
        hint="Up to 10, separated by commas. These help students find your course."
      >
        <Input
          id="skills"
          name="skills"
          placeholder="e.g. Python, Data Structures & Algorithms"
          defaultValue={v.skills}
          {...errorProps(state, "skills")}
        />
      </Field>

      <Field label="Visibility" htmlFor="status" error={fieldError(state, "status")}>
        <Select id="status" name="status" defaultValue={v.status} {...errorProps(state, "status")}>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label} — {s.hint}
            </option>
          ))}
        </Select>
      </Field>

      <div>
        <Button type="submit" size="lg" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
