import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/cn";

// "outline" is the legacy name for "secondary" (kept so older screens work).
type Variant = "primary" | "secondary" | "outline" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-control font-sans font-medium " +
  "transition-colors duration-150 ease-out-soft " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand " +
  "disabled:cursor-not-allowed disabled:opacity-55";

const variants: Record<Variant, string> = {
  primary: "bg-brand text-white hover:bg-brand-dark active:bg-brand-dark",
  secondary: "border border-line-strong bg-surface text-fg hover:border-fg-subtle/50 hover:bg-subtle",
  outline: "border border-line-strong bg-surface text-fg hover:border-fg-subtle/50 hover:bg-subtle",
  ghost: "text-fg-muted hover:bg-subtle hover:text-fg",
  danger: "bg-danger text-white hover:bg-danger-dark",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-small",
  md: "h-9 px-3.5 text-[0.875rem]",
  lg: "h-11 px-5 text-body",
};

// Shared so links can look like buttons: <Link className={buttonClasses()} />
export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
}: { variant?: Variant; size?: Size; fullWidth?: boolean } = {}): string {
  return cn(base, variants[variant], sizes[size], fullWidth && "w-full");
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("size-4 animate-spin motion-reduce:animate-none", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  fullWidth?: boolean;
  /** Shows a spinner and disables the button. */
  loading?: boolean;
  icon?: ReactNode;
};

export function Button({
  variant,
  size,
  fullWidth,
  loading = false,
  icon,
  className,
  type = "button",
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(buttonClasses({ variant, size, fullWidth }), className)}
      {...props}
    >
      {loading ? <Spinner /> : icon}
      {children}
    </button>
  );
}

// Square button for a single icon; `label` is required for screen readers.
export function IconButton({
  label,
  children,
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { label: string; children: ReactNode }) {
  return (
    <button
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex size-9 items-center justify-center rounded-control text-fg-muted transition-colors duration-150 hover:bg-subtle hover:text-fg",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:opacity-55",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
