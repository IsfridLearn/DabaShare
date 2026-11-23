"use client";

import { useActionState, useEffect, useRef } from "react";
import { addSkill, removeSkill } from "@/lib/profile/actions";
import type { SkillKind, SkillRef } from "@/lib/profile/queries";
import { initialFormState } from "@/lib/forms";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { Tag } from "@/components/ui/tag";

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
      <h3 id={`${inputId}-title`} className="text-base font-semibold">
        {copy.title}
      </h3>
      {skills.length ? (
        <ul className="flex flex-wrap gap-2">
          {skills.map((skill) => (
            <li key={skill.id}>
              <Tag tone={kind}>
                {skill.name}
                <form action={removeSkill.bind(null, kind, skill.id)} className="inline-flex">
                  <button
                    type="submit"
                    className="-mr-1 rounded-full px-1 leading-none opacity-70 hover:opacity-100"
                    aria-label={`Remove ${skill.name}`}
                  >
                    ×
                  </button>
                </form>
              </Tag>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">{copy.empty}</p>
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
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </form>
      {error && (
        <p id={`${inputId}-error`} className="text-sm text-danger">
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
