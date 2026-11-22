import { cn } from "@/lib/cn";

export function Logo({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg width={size} height={size} viewBox="0 0 32 32" fill="none" aria-hidden="true">
        <path
          d="M4 22 L16 10 L28 22"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <rect x="8" y="22" width="16" height="4" rx="2" fill="currentColor" opacity="0.3" />
        <circle cx="16" cy="10" r="3" fill="currentColor" />
      </svg>
      <span className="font-display text-xl font-bold text-gray-900">DabaShare</span>
    </span>
  );
}
