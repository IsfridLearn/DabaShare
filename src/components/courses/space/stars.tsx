import { Star } from "lucide-react";
import { cn } from "@/lib/cn";

// Five stars to the nearest half star, with a text equivalent.
export function Stars({ rating, size = 14, className }: { rating: number; size?: number; className?: string }) {
  const halves = Math.round(rating * 2);
  const box = { width: size, height: size };
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-brand-ink", className)}>
      <span className="sr-only">{rating.toFixed(1)} out of 5</span>
      {[1, 2, 3, 4, 5].map((i) => {
        const fill = halves >= i * 2 ? "full" : halves === i * 2 - 1 ? "half" : "none";
        return (
          <span key={i} aria-hidden="true" className="relative inline-block" style={box}>
            <Star style={box} className="absolute inset-0 text-line-strong" strokeWidth={1.75} />
            {fill !== "none" && (
              <span className="absolute inset-y-0 left-0 overflow-hidden" style={{ width: fill === "full" ? size : size / 2 }}>
                <Star style={box} className="fill-current" strokeWidth={1.75} />
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}

/** "★ 4.8 (12)": compact rating for lists. Nothing when there are no reviews. */
export function RatingInline({ avg, count, className }: { avg: number; count: number; className?: string }) {
  if (!count) return null;
  return (
    <span className={cn("inline-flex items-center gap-1 text-small", className)}>
      <Star className="size-3.5 fill-current text-brand-ink" aria-hidden="true" />
      <span className="font-medium text-fg">{avg.toFixed(1)}</span>
      <span className="text-fg-subtle">
        ({count}
        <span className="sr-only"> {count === 1 ? "review" : "reviews"}</span>)
      </span>
    </span>
  );
}
