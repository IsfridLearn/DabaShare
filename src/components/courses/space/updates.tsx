import { ExternalLink, Megaphone } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { deleteUpdate } from "@/lib/courses/space-actions";
import type { CourseUpdate } from "@/lib/courses/space-queries";
import { formatWhen } from "@/lib/feed/validation";
import { UpdateForm } from "./update-form";

// The tutor's notes to the class, newest first. A link carries materials
// (slides, a Drive folder, a problem set).
export function Updates({ courseId, updates, isOwner }: { courseId: string; updates: CourseUpdate[]; isOwner: boolean }) {
  return (
    <div className="flex flex-col gap-8">
      {isOwner && <UpdateForm courseId={courseId} />}
      {updates.length ? (
        <ul className="divide-y divide-line border-y border-line">
          {updates.map((u) => (
            <li key={u.id} className="py-5">
              <article>
                <header className="flex items-baseline justify-between gap-3">
                  <time dateTime={u.created_at} className="text-label text-fg-subtle" suppressHydrationWarning>
                    {formatWhen(u.created_at)}
                  </time>
                  {isOwner && (
                    <form action={deleteUpdate.bind(null, u.id)}>
                      <button type="submit" className="rounded-control px-2 py-1 text-small text-fg-subtle hover:bg-subtle hover:text-danger-ink">
                        Delete
                      </button>
                    </form>
                  )}
                </header>
                <p className="mt-2 max-w-[66ch] break-words whitespace-pre-line text-fg">{u.body}</p>
                {u.link_url && (
                  <a
                    href={u.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex max-w-full items-center gap-1.5 border-l-2 border-brand pl-3 text-small font-medium text-brand-ink hover:underline"
                  >
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">{u.link_url.replace(/^https?:\/\//, "")}</span>
                  </a>
                )}
              </article>
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={<Megaphone className="size-5" />}
          title="No updates yet"
          description={isOwner ? "Post a note or share materials with your students. They get a notification." : "Your tutor's notes and materials will show up here."}
        />
      )}
    </div>
  );
}
