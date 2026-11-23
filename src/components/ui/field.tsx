import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

const control =
  "w-full rounded-control border-[1.5px] border-gray-200 bg-white px-3.5 py-2.5 text-[0.95rem] text-gray-800 " +
  "placeholder:text-gray-400 transition focus:border-brand focus:outline-none focus:ring-3 focus:ring-brand/15 " +
  "aria-invalid:border-danger disabled:bg-gray-100";

type FieldProps = {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: ReactNode;
};

// Label + control + hint/error. The control must use the same id as htmlFor and
// set aria-invalid / aria-describedby={`${htmlFor}-message`} when there is an error.
export function Field({ label, htmlFor, error, hint, children }: FieldProps) {
  const message = error ?? hint;
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-gray-700">
        {label}
      </label>
      {children}
      {message && (
        <p
          id={`${htmlFor}-message`}
          className={cn("text-sm", error ? "text-danger" : "text-gray-500")}
        >
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
