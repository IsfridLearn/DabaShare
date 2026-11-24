"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useEffect, useRef } from "react";
import { addSkill, removeSkill } from "@/lib/profile/actions";
import type { SkillKind, SkillRef } from "@/lib/profile/queries";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";

const COPY: Record<SkillKind, { title: string; empty: string; placeholder: string }> = {
  teach: {
    title: "What I can teach",
    empty: "Add skills you're comfortable helping others with.",
    placeholder: "e.g. Python, Calculus, Guitar",
  },
  learn: {
    title: "What I want to learn",
    empty: "Add skills you'd like someone to teach you.",
    placeholder: "e.g. Accounting, Public Speaking",
  },
};

export function SkillsEditor({
  kind,
  skills,
  suggestionsId,
}: {
  kind: SkillKind;
  skills: SkillRef[];
  suggestionsId: string;
}) {
  const [state, action, pending] = useActionState(addSkill.bind(null, kind), initialFormState);
  const inputRef = useRef<HTMLInputElement>(null);
  const copy = COPY[kind];
  const inputId = `skill-${kind}`;
  const error = state.fieldErrors?.skill?.[0] ?? (state.status === "error" ? state.message : undefined);

  useEffect(() => {
    if (state.status === "success") inputRef.current?.focus();
  }, [state]);

  return (
    <section aria-labelledby={`${inputId}-title`} className="flex flex-col gap-3">
      <h3 id={`${inputId}-title`} className="text-small font-semibold text-fg">
        {copy.title}
      </h3>
      {skills.length ? (
        <ul className="flex flex-wrap gap-1.5">
          {skills.map((skill) => (
            <li key={skill.id}>
              <span className="inline-flex items-center gap-0.5 rounded-control border border-line-strong bg-surface py-0.5 pr-0.5 pl-2.5 text-small font-medium break-words text-fg">
                {skill.name}
                <form action={removeSkill.bind(null, kind, skill.id)} className="inline-flex">
                  <button
                    type="submit"
                    className="grid size-6 place-items-center rounded-[4px] text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg focus-visible:outline-2 focus-visible:outline-brand"
                    aria-label={`Remove ${skill.name}`}
                  >
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                </form>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-small text-fg-subtle">{copy.empty}</p>
      )}
      <form action={action} className="flex gap-2" noValidate>
        <label htmlFor={inputId} className="sr-only">
          Add a skill to “{copy.title}”
        </label>
        <Input
          ref={inputRef}
          id={inputId}
          name="skill"
          list={suggestionsId}
          maxLength={50}
          placeholder={copy.placeholder}
          defaultValue={state.status === "error" ? state.values?.skill : ""}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-error` : undefined}
        />
        <Button type="submit" variant="secondary" loading={pending} icon={<Plus className="size-4" aria-hidden="true" />}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </form>
      {error && (
        <p id={`${inputId}-error`} className="text-small text-danger-ink">
          {error}
        </p>
      )}
    </section>
  );
}

export function SkillSuggestions({ id, names }: { id: string; names: string[] }) {
  return (
    <datalist id={id}>
      {names.map((name) => (
        <option key={name} value={name} />
      ))}
    </datalist>
  );
}
