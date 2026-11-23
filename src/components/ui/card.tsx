import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("rounded-card border border-gray-200 bg-surface p-5 shadow-card sm:p-6", className)}
      {...props}
    />
  );
}
