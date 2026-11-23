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
      <FormMessage state={state} />
      <fieldset>
        <legend className="sr-only">Learning interests</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {categories.map((c) => (
            <label
              key={c.id}
              className="flex cursor-pointer items-center gap-2.5 rounded-control border border-gray-200 px-3 py-2 text-sm hover:bg-gray-50 has-checked:border-brand has-checked:bg-brand-soft"
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
      <div>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Saving…" : "Save interests"}
        </Button>
      </div>
    </form>
  );
}
