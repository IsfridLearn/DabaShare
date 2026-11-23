import type { ReactNode } from "react";

// Calm, centred empty state: optional icon, one line of guidance, one action.
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-card border border-dashed border-line-strong px-6 py-12 text-center">
      {icon && (
        <span aria-hidden="true" className="mb-1 flex size-10 items-center justify-center rounded-full bg-subtle text-fg-muted">
          {icon}
        </span>
      )}
      <h2 className="text-heading">{title}</h2>
      {description && <p className="max-w-md text-small text-fg-muted">{description}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
