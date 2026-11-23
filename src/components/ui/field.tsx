import { cloneElement, isValidElement, type ComponentProps, type ReactElement, type ReactNode } from "react";
import { cn } from "@/lib/cn";

// 16px text on phones: iOS Safari zooms the page when focusing smaller inputs.
const control =
  "w-full rounded-control border-[1.5px] border-gray-200 bg-surface px-3.5 py-2.5 text-base text-gray-800 md:text-[0.95rem] " +
  "placeholder:text-gray-500 transition focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/15 " +
  "aria-invalid:border-danger disabled:bg-gray-100";

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

// Label + control + hint/error. The control must use the same id as htmlFor.
// The hint or error is linked to the control (aria-describedby) automatically,
// so screen readers read it too.
export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  const message = error ?? hint;
  const messageId = `${htmlFor}-message`;
  const control =
    message && isValidElement(children)
      ? cloneElement(children as ReactElement<{ "aria-describedby"?: string }>, { "aria-describedby": messageId })
      : children;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      {control}
      {message && (
        <p id={messageId} className={cn("text-sm", error ? "text-danger-ink" : "text-gray-600")}>
          {message}
        </p>
      )}
    </div>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(control, className)} {...props} />;
}

export function Textarea({ className, ...props }: ComponentProps<"textarea">) {
  return <textarea className={cn(control, "min-h-24 resize-y", className)} {...props} />;
}

export function Select({ className, ...props }: ComponentProps<"select">) {
  return <select className={cn(control, "appearance-auto", className)} {...props} />;
}
