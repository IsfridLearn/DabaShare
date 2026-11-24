"use client";

import { useActionState } from "react";
import { saveInterests } from "@/lib/profile/actions";
import { initialFormState } from "@/lib/forms";
import type { Category } from "@/lib/reference";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";

export function InterestsForm({ categories, selected }: { categories: Category[]; selected: number[] }) {
  const [state, action, pending] = useActionState(saveInterests, initialFormState);

  return (
    <form action={action} className="flex flex-col gap-4">
      <fieldset>
        <legend className="sr-only">Learning interests</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {categories.map((c) => (
            <label
              key={c.id}
              className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-control border border-line-strong bg-surface px-3 py-2 text-small leading-snug text-fg transition-colors duration-150 hover:bg-subtle has-checked:border-brand has-checked:bg-brand-soft"
            >
              <input
                type="checkbox"
                name="categoryId"
                value={c.id}
                defaultChecked={selected.includes(c.id)}
                className="size-4 accent-brand"
              />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>
      <FormMessage state={state} />
      <div>
        <Button type="submit" variant="secondary" loading={pending}>
          {pending ? "Saving…" : "Save interests"}
        </Button>
      </div>
    </form>
  );
}
