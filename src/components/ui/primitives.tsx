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
  warning: "bg-amber-100 text-amber-800",
  danger: "bg-danger-soft text-danger-ink",
};

export function Badge({ tone = "neutral", children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-[4px] px-1.5 py-0.5 text-caption font-medium whitespace-nowrap", badgeTones[tone], className)}>
      {children}
    </span>
  );
}

// ── PageHeader: one consistent top of every page ──────────────────────────
export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  eyebrow?: string;
}) {
  return (
    <header className="flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="mb-1.5 text-caption font-medium tracking-wide text-fg-subtle uppercase">{eyebrow}</p>}
        <h1 className="text-title">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-fg-muted">{description}</p>}
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
            item.active ? "border-fg text-fg" : "border-transparent text-fg-muted hover:text-fg",
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
        active ? "border-fg bg-fg text-canvas" : "border-line-strong bg-surface text-fg-muted hover:bg-subtle hover:text-fg",
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
