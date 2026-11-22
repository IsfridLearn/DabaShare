import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type Tone = "teach" | "learn" | "free" | "paid" | "neutral";

// teach/free = green, learn = blue, paid = purple: the prototype's colour language.
const tones: Record<Tone, string> = {
  teach: "bg-emerald-100 text-emerald-800",
  free: "bg-emerald-100 text-emerald-800",
  learn: "bg-blue-100 text-blue-800",
  paid: "bg-violet-100 text-violet-800",
  neutral: "bg-gray-100 text-gray-700",
};

export function Tag({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[0.83rem] font-medium whitespace-nowrap",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
