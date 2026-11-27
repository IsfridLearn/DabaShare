"use client";

import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { useEffect, useEffectEvent, useState } from "react";
import { cn } from "@/lib/cn";

type Tone = "success" | "info" | "error";

const ICONS = { success: CircleCheck, info: Info, error: CircleAlert } as const;
const ICON_TONE = { success: "text-success-ink", info: "text-fg-subtle", error: "text-danger-ink" } as const;
const VISIBLE_MS = 5000;

// A short confirmation that floats above the page and leaves on its own.
// It's rendered on the server too, so it shows (and stays) without JavaScript.
// Sits above the phone tab bar; bottom-right on desktop.
export function Toast({ tone = "success", message, onDismiss }: { tone?: Tone; message: string; onDismiss: () => void }) {
  const Icon = ICONS[tone];
  const dismiss = useEffectEvent(onDismiss);

  // One timer per toast, even if the parent re-renders meanwhile.
  useEffect(() => {
    const timer = setTimeout(dismiss, VISIBLE_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-sm items-start gap-2.5 rounded-card border border-line bg-surface py-2.5 pr-2 pl-3.5 text-small text-fg shadow-overlay",
        "transition-[opacity,translate] duration-200 ease-out-soft starting:translate-y-2 starting:opacity-0 motion-reduce:transition-none",
        "lg:inset-x-auto lg:right-6 lg:bottom-6",
      )}
    >
      <Icon className={cn("mt-px size-4 shrink-0", ICON_TONE[tone])} aria-hidden="true" />
      <p className="min-w-0 flex-1 py-px">{message}</p>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="-my-1 flex size-7 shrink-0 items-center justify-center rounded-control text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-fg"
      >
        <X className="size-4" aria-hidden="true" />
      </button>
    </div>
  );
}

// Toast for a "?notice=…" redirect (e.g. after creating a course). Removes
// the notice from the address bar, so a reload or a shared link doesn't
// repeat it.
export function NoticeToast({ tone = "success", message }: { tone?: Tone; message: string }) {
  const [open, setOpen] = useState(true);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (!url.searchParams.has("notice")) return;
    url.searchParams.delete("notice");
    window.history.replaceState(window.history.state, "", url.pathname + url.search + url.hash);
  }, []);

  if (!open) return null;
  return <Toast tone={tone} message={message} onDismiss={() => setOpen(false)} />;
}

// Toast for a form result: each new result from the server shows once.
export function ResultToast<T extends object>({ result, tone = "success", message }: { result: T; tone?: Tone; message: string }) {
  // A new result object means a new submission: give it a fresh toast (and timer).
  const [seen, setSeen] = useState({ result, key: 0 });
  const [dismissed, setDismissed] = useState<T | null>(null);
  if (seen.result !== result) setSeen({ result, key: seen.key + 1 });
  if (dismissed === result) return null;
  return <Toast key={seen.key} tone={tone} message={message} onDismiss={() => setDismissed(result)} />;
}
