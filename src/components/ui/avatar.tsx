import Image from "next/image";
import { cn } from "@/lib/cn";
import { avatarUrl } from "@/lib/profile/avatar";

const COLORS = ["bg-blue-600", "bg-violet-600", "bg-emerald-700", "bg-amber-700", "bg-rose-600", "bg-cyan-700"];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : (parts[0] ?? "?").slice(0, 2);
  return letters.toUpperCase();
}

function colorFor(name: string): string {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return COLORS[hash % COLORS.length];
}

export function Avatar({
  name,
  path,
  size = 40,
  className,
}: {
  name: string;
  path?: string | null;
  size?: number;
  className?: string;
}) {
  const style = { width: size, height: size };
  if (path) {
    return (
      <Image
        src={avatarUrl(path)}
        alt=""
        width={size}
        height={size}
        unoptimized
        className={cn("shrink-0 rounded-full bg-subtle object-cover", className)}
        style={style}
      />
    );
  }
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white",
        colorFor(name),
        className,
      )}
      style={{ ...style, fontSize: Math.max(12, size * 0.38) }}
    >
      {initials(name)}
    </span>
  );
}
