"use client";

import { Check, Eye, EyeOff } from "lucide-react";
import { useState, type ComponentProps } from "react";
import { cn } from "@/lib/cn";
import { PASSWORD_RULES } from "@/lib/auth/validation";
import { controlClasses } from "./field";

// Password field with a show/hide toggle. With `rules`, a checklist under the
// field ticks off each requirement as you type (the server still validates).
export function PasswordInput({
  id,
  rules = false,
  className,
  onChange,
  "aria-describedby": describedBy,
  ...props
}: Omit<ComponentProps<"input">, "type"> & { id: string; rules?: boolean }) {
  const [visible, setVisible] = useState(false);
  const [value, setValue] = useState(typeof props.defaultValue === "string" ? props.defaultValue : "");
  const rulesId = `${id}-rules`;
  const describedByAll = [describedBy, rules ? rulesId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div className="flex flex-col gap-2">
      <div className="relative">
        <input
          id={id}
          type={visible ? "text" : "password"}
          // Browsers must not autocorrect or capitalise a visible password.
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          aria-describedby={describedByAll}
          className={cn(controlClasses, "pr-11", className)}
          onChange={(e) => {
            if (rules) setValue(e.currentTarget.value);
            onChange?.(e);
          }}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "Hide password" : "Show password"}
          aria-pressed={visible}
          aria-controls={id}
          className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-control text-fg-subtle transition-colors duration-150 hover:text-fg focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand"
        >
          {visible ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
        </button>
      </div>
      {rules && (
        <ul id={rulesId} className="flex flex-wrap gap-x-4 gap-y-1 text-caption">
          {PASSWORD_RULES.map((rule) => {
            const met = rule.test(value);
            return (
              <li key={rule.label} className={cn("inline-flex items-center gap-1.5 transition-colors duration-150", met ? "text-success-ink" : "text-fg-subtle")}>
                {met ? (
                  <Check className="size-3.5" strokeWidth={2.5} aria-hidden="true" />
                ) : (
                  <span aria-hidden="true" className="mx-[3px] size-2 rounded-full border border-current" />
                )}
                <span className="sr-only">{met ? "Done: " : "Needed: "}</span>
                {rule.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
