import { cloneElement, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/cn";

// 16px text on phones: iOS Safari zooms the page when focusing smaller inputs.
export const controlClasses =
  "w-full rounded-control border border-line-strong bg-surface px-3 py-2 text-base text-fg md:text-[0.9375rem] " +
  "placeholder:text-fg-subtle transition-[border-color,box-shadow] duration-150 " +
  "hover:border-fg-subtle/60 focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/15 " +
  "aria-invalid:border-danger aria-invalid:focus:ring-danger/15 disabled:bg-subtle disabled:text-fg-muted";

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  /** Shown at the end of the label row, e.g. a "Forgot password?" link. */
  labelAside?: ReactNode;
  children: ReactNode;
};

// Label + control + hint/error. The control must use the same id as htmlFor.
// The hint or error is linked to the control (aria-describedby) automatically,
// so screen readers read it too.
export function Field({ label, htmlFor, error, hint, labelAside, children }: FieldProps) {
  const message = error ?? hint;
  const messageId = `${htmlFor}-message`;
  const control =
    message && isValidElement(children)
      ? cloneElement(children as ReactElement<{ "aria-describedby"?: string }>, { "aria-describedby": messageId })
      : children;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={htmlFor} className="text-small font-medium text-fg">
          {label}
        </label>
        {labelAside}
      </div>
      {control}
      {message && (
        <p id={messageId} className={cn("text-small", error ? "text-danger-ink" : "text-fg-muted")}>
          {message}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(controlClasses, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(controlClasses, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(controlClasses, "appearance-auto", className)} {...props} />;
}
