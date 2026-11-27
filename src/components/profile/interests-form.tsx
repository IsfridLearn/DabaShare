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
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <label
              key={c.id}
              className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-control border border-line-strong bg-surface px-3 py-1.5 text-small leading-snug text-fg-muted transition-colors duration-150 hover:bg-subtle hover:text-fg has-checked:border-fg has-checked:bg-fg has-checked:text-canvas has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-brand"
            >
              <input
                type="checkbox"
                name="categoryId"
                value={c.id}
                defaultChecked={selected.includes(c.id)}
                className="sr-only"
              />
              {c.name}
            </label>
          ))}
        </div>
      </fieldset>
      <FormMessage state={state} successAs="toast" />
      <div>
        <Button type="submit" variant="secondary" loading={pending}>
          {pending ? "Saving…" : "Save interests"}
        </Button>
      </div>
    </form>
  );
}
