import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "error" | "success" | "info";

const tones: Record<Tone, string> = {
  error: "border-red-200 bg-danger-soft text-red-800",
  success: "border-emerald-200 bg-success-soft text-emerald-800",
  info: "border-blue-200 bg-brand-soft text-blue-800",
};

export function Alert({ tone = "info", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-control border px-4 py-3 text-sm", tones[tone])}
    >
      {children}
    </div>
  );
}
