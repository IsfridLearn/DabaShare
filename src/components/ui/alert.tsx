import { CircleAlert, CircleCheck, Info } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "error" | "success" | "info";

// Quiet inline message: a tinted hairline box with one small icon.
const tones: Record<Tone, { box: string; icon: typeof Info }> = {
  error: { box: "border-danger/25 bg-danger-soft text-fg [&>svg]:text-danger-ink", icon: CircleAlert },
  success: { box: "border-success/25 bg-success-soft/60 text-fg [&>svg]:text-success-ink", icon: CircleCheck },
  info: { box: "border-line bg-subtle text-fg [&>svg]:text-fg-muted", icon: Info },
};

export function Alert({ tone = "info", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  const { box, icon: Icon } = tones[tone];
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("flex items-start gap-2.5 rounded-control border px-3.5 py-2.5 text-small", box, className)}
    >
      <Icon className="mt-px size-4 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
