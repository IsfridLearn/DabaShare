import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { buttonClasses } from "./button";

// ── Badge: small, quiet status label (not interactive) ─────────────────────
type BadgeTone = "neutral" | "brand" | "success" | "warning" | "danger";
const badgeTones: Record<BadgeTone, string> = {
  neutral: "bg-subtle text-fg-muted",
  brand: "bg-brand-soft text-brand-ink",
  success: "bg-success-soft text-success-ink",
  warning: "bg-warning-soft text-warning-ink",
  danger: "bg-danger-soft text-danger-ink",
};

export function Badge({ tone = "neutral", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-[3px] px-1.5 py-0.5 text-caption font-medium whitespace-nowrap", badgeTones[tone], className)}>
      {children}
    </span>
  );
}

// ── PageHeader: a compact page bar ─────────────────────────────────────────
// The title names the place (the sidebar already does too), so it stays
// small and the content starts near the top. A description is for the rare
// page that needs one sentence of context.
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  count,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
  count?: number;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3 border-b border-line pb-4">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1.5 text-label text-fg-subtle">{eyebrow}</p>}
        <h1 className="flex items-baseline gap-2.5 text-[1.75rem] leading-none">
          {title}
          {count !== undefined && <span className="text-small font-normal tabular-nums [font-stretch:100%] text-fg-subtle">{count}</span>}
        </h1>
        {description && <p className="mt-2 max-w-2xl text-small text-fg-muted">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

// ── Tabs: underline tabs as links (filters live in the URL) ─────────────────
export function Tabs({
  label,
  items,
}: {
  label: string;
  items: { href: string; label: ReactNode; active: boolean; count?: number }[];
}) {
  return (
    <nav aria-label={label} className="-mb-px flex gap-5 overflow-x-auto border-b border-line">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "inline-flex shrink-0 items-center gap-1.5 border-b-2 py-2.5 text-[0.875rem] font-medium transition-colors duration-150",
            item.active ? "border-brand text-fg" : "border-transparent text-fg-muted hover:text-fg",
          )}
        >
          {item.label}
          {item.count !== undefined && <span className="text-caption text-fg-subtle">{item.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

// ── Chip: compact selectable filter (link) ─────────────────────────────────
export function Chip({ href, active, children }: { href: string; active: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      aria-current={active ? "true" : undefined}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-control border px-3 text-small font-medium transition-colors duration-150",
        active ? "border-brand bg-brand-soft text-brand-ink" : "border-line-strong bg-surface text-fg-muted hover:bg-subtle hover:text-fg",
      )}
    >
      {children}
    </Link>
  );
}

// ── Pagination: previous/next by URL ───────────────────────────────────────
export function Pagination({
  page,
  pages,
  hrefFor,
  previousLabel = "Previous",
  nextLabel = "Next",
}: {
  page: number;
  pages: number;
  hrefFor: (page: number) => string;
  previousLabel?: string;
  nextLabel?: string;
}) {
  if (pages <= 1) return null;
  const ghost = buttonClasses({ variant: "secondary", size: "sm" });
  return (
    <nav aria-label="Pages" className="flex items-center justify-between gap-3 border-t border-line pt-4">
      {page > 1 ? (
        <Link href={hrefFor(page - 1)} className={ghost}>
          ← {previousLabel}
        </Link>
      ) : (
        <span />
      )}
      <span className="text-small text-fg-subtle">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={hrefFor(page + 1)} className={ghost}>
          {nextLabel} →
        </Link>
      ) : (
        <span />
      )}
    </nav>
  );
}

// ── Skeleton: placeholder that matches the real layout ─────────────────────
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-control bg-subtle motion-reduce:animate-none", className)} />;
}

// ── Section: a titled block inside a page (no box by default) ──────────────
export function Section({
  title,
  description,
  actions,
  children,
  id,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  id?: string;
}) {
  return (
    <section id={id} className="scroll-mt-20" aria-labelledby={id ? `${id}-title` : undefined}>
      <div className="mb-3 flex items-end justify-between gap-3">
        <div>
          <h2 id={id ? `${id}-title` : undefined} className="text-heading">
            {title}
          </h2>
          {description && <p className="mt-0.5 text-small text-fg-muted">{description}</p>}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

// ── BackLink: "← All courses" at the top of a detail page ──────────────────
export function BackLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className="-ml-1.5 inline-flex items-center gap-1 self-start rounded-control px-1.5 py-1 text-small font-medium text-fg-muted transition-colors duration-150 hover:bg-subtle hover:text-fg"
    >
      <ChevronLeft className="size-4" aria-hidden="true" />
      {children}
    </Link>
  );
}

// ── Properties: Linear-style label/value rows for a detail page ────────────
export function Properties({ items, className }: { items: { label: string; value: ReactNode }[]; className?: string }) {
  return (
    <dl className={cn("flex flex-col text-small", className)}>
      {items.map((item) => (
        <div key={item.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)] gap-3 py-1.5">
          <dt className="text-fg-subtle">{item.label}</dt>
          <dd className="min-w-0 font-medium break-words text-fg">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

// ── PanelSection: settings-style row, title on the left, content on the right ─
export function PanelSection({
  id,
  title,
  description,
  tone = "default",
  children,
}: {
  id?: string;
  title: string;
  description?: ReactNode;
  tone?: "default" | "danger";
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={id ? `${id}-title` : undefined}
      className="grid scroll-mt-20 gap-4 border-t border-line py-8 first:border-t-0 first:pt-2 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-10"
    >
      <div>
        <h2 id={id ? `${id}-title` : undefined} className={cn("text-heading", tone === "danger" && "text-danger-ink")}>
          {title}
        </h2>
        {description && <p className="mt-1 text-small text-fg-muted">{description}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </section>
  );
}

// ── List: hairline-divided rows inside one bordered container ──────────────
export function RowList({ label, children, className }: { label?: string; children: ReactNode; className?: string }) {
  return (
    <ul aria-label={label} className={cn("divide-y divide-line overflow-hidden rounded-card border border-line bg-surface", className)}>
      {children}
    </ul>
  );
}

// ── Segmented: mutually exclusive views as links (one is always current) ───
export function Segmented({
  label,
  items,
}: {
  label: string;
  items: { href: string; label: ReactNode; active: boolean }[];
}) {
  return (
    <nav aria-label={label} className="inline-flex max-w-full overflow-x-auto rounded-control border border-line-strong bg-surface p-0.5">
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "inline-flex h-7 shrink-0 items-center gap-1.5 rounded-[3px] px-3 text-small font-medium whitespace-nowrap transition-colors duration-150",
            item.active ? "bg-fg text-canvas" : "text-fg-muted hover:bg-subtle hover:text-fg",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}

// ── GroupHeader: label + count above a group of rows (Linear-style) ────────
export function GroupHeader({ id, children, count }: { id?: string; children: ReactNode; count?: number }) {
  return (
    <h2 id={id} className="flex items-baseline gap-2 text-label text-fg-muted">
      {children}
      {count !== undefined && <span className="tabular-nums text-fg-subtle">{count}</span>}
    </h2>
  );
}
