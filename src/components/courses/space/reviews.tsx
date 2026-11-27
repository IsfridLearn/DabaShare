import { Flag, MessageSquareQuote } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { deleteReview } from "@/lib/courses/space-actions";
import type { RatingSummary, Review } from "@/lib/courses/space-queries";
import { formatWhen } from "@/lib/feed/validation";
import { ReviewForm } from "./review-form";
import { Stars } from "./stars";

// Reviews come only from students who finished the course (enforced in the
// database), which is what makes the rating worth reading.
export function Reviews({
  courseId,
  reviews,
  summary,
  meId,
  canReview,
  isOwner,
}: {
  courseId: string;
  reviews: Review[];
  summary: RatingSummary | null;
  meId: string;
  canReview: boolean;
  isOwner: boolean;
}) {
  const mine = reviews.find((r) => r.author_id === meId) ?? null;
  const others = reviews.filter((r) => r.author_id !== meId);

  return (
    <div className="flex flex-col gap-8">
      {summary && (
        <div className="flex items-end gap-4 border-b border-line pb-5">
          <p className="font-display text-[3rem] leading-none text-fg">{summary.avg.toFixed(1)}</p>
          <div className="pb-1">
            <Stars rating={summary.avg} size={16} />
            <p className="mt-1 text-small text-fg-muted">
              {summary.count === 1 ? "1 review" : `${summary.count} reviews`} from students who finished
            </p>
          </div>
        </div>
      )}

      {canReview && (
        <section aria-labelledby="my-review-title" className="flex flex-col gap-3">
          <h2 id="my-review-title" className="text-label text-fg-muted">
            {mine ? "Your review" : "You finished this course"}
          </h2>
          <ReviewForm courseId={courseId} existing={mine ? { rating: mine.rating, body: mine.body } : null} />
          {mine && (
            <form action={deleteReview.bind(null, mine.id)}>
              <button type="submit" className="text-small text-fg-subtle hover:text-danger-ink hover:underline">
                Delete my review
              </button>
            </form>
          )}
        </section>
      )}

      {others.length ? (
        <ul className="divide-y divide-line border-y border-line" aria-label="Reviews">
          {others.map((r) => (
            <li key={r.id} className="flex gap-3 py-5">
              <Avatar name={r.author?.display_name ?? "Student"} path={r.author?.avatar_path ?? null} size={32} />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  {r.author?.username ? (
                    <Link href={`/u/${r.author.username}`} className="font-semibold text-fg hover:underline">
                      {r.author.display_name}
                    </Link>
                  ) : (
                    <span className="font-semibold text-fg">{r.author?.display_name ?? "A student"}</span>
                  )}
                  <Stars rating={r.rating} />
                  <time dateTime={r.created_at} className="text-caption text-fg-subtle" suppressHydrationWarning>
                    {formatWhen(r.created_at)}
                  </time>
                </div>
                {r.body && <p className="mt-1.5 max-w-[66ch] break-words whitespace-pre-line text-fg">{r.body}</p>}
                <Link
                  href={`/report?type=review&id=${r.id}`}
                  className="mt-2 inline-flex items-center gap-1 text-caption text-fg-subtle hover:text-danger-ink"
                >
                  <Flag className="size-3" aria-hidden="true" />
                  Report
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        !mine && (
          <EmptyState
            icon={<MessageSquareQuote className="size-5" />}
            title="No reviews yet"
            description={
              isOwner
                ? "Students can review the course once you mark them as finished in the Students tab."
                : "Reviews come from students who finished the course."
            }
          />
        )
      )}
    </div>
  );
}
