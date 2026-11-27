import { CalendarDays, ExternalLink, MapPin } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { deleteLesson } from "@/lib/courses/space-actions";
import type { Lesson } from "@/lib/courses/space-queries";
import { isWebLink, splitLessons } from "@/lib/courses/space-validation";
import { clockRange, sessionDay } from "@/lib/sessions/validation";
import { LessonForm } from "./lesson-form";

// The course timetable: upcoming lessons first, past ones folded away.
// The place or meeting link is only ever sent to members (RLS).
export function Schedule({
  courseId,
  lessons,
  isOwner,
  minDate,
  free,
}: {
  courseId: string;
  lessons: Lesson[];
  isOwner: boolean;
  minDate: string;
  free: boolean;
}) {
  const { upcoming, past } = splitLessons(lessons);

  return (
    <div className="flex flex-col gap-8">
      {isOwner && <LessonForm courseId={courseId} minDate={minDate} free={free} />}

      {upcoming.length ? (
        <section aria-labelledby="upcoming-title">
          <h2 id="upcoming-title" className="border-b border-line pb-2 text-label text-fg-muted">
            Upcoming
          </h2>
          <ul className="divide-y divide-line">
            {upcoming.map((l) => (
              <LessonRow key={l.id} lesson={l} isOwner={isOwner} />
            ))}
          </ul>
        </section>
      ) : (
        <EmptyState
          icon={<CalendarDays className="size-5" />}
          title="No lessons scheduled yet"
          description={isOwner ? "Add your first lesson above. Enrolled students get a notification." : "Your tutor hasn't scheduled a lesson yet. You'll get a notification when they do."}
        />
      )}

      {past.length > 0 && (
        <details className="group/past">
          <summary className="cursor-pointer list-none border-b border-line pb-2 text-label text-fg-muted hover:text-fg [&::-webkit-details-marker]:hidden">
            Past lessons ({past.length})
          </summary>
          <ul className="divide-y divide-line opacity-80">
            {past.map((l) => (
              <LessonRow key={l.id} lesson={l} isOwner={isOwner} past />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function LessonRow({ lesson, isOwner, past = false }: { lesson: Lesson; isOwner: boolean; past?: boolean }) {
  const day = sessionDay(lesson.starts_at);
  const link = isWebLink(lesson.location);
  return (
    <li className="flex gap-5 py-5">
      <span aria-hidden="true" className="w-11 shrink-0 pt-0.5 text-center leading-none">
        <span className="block text-label text-fg-subtle">{day.month}</span>
        <span className="mt-1 block font-display text-[1.75rem] text-fg">{day.day}</span>
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="font-display text-[1.25rem] leading-tight text-fg">{lesson.title}</h3>
        <p className="mt-0.5 text-small text-fg-muted">
          {day.label} · {clockRange(lesson.starts_at, lesson.ends_at)}
        </p>
        {lesson.location &&
          (link && !past ? (
            <a
              href={lesson.location}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex max-w-full items-center gap-1.5 text-small font-medium text-brand-ink hover:underline"
            >
              <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">Join: {lesson.location.replace(/^https?:\/\//, "")}</span>
            </a>
          ) : (
            <p className="mt-2 flex items-center gap-1.5 text-small text-fg-muted">
              <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
              <span className="truncate">{lesson.location}</span>
            </p>
          ))}
        {lesson.notes && <p className="mt-2 max-w-[62ch] text-small whitespace-pre-line text-fg-muted">{lesson.notes}</p>}
      </div>
      {isOwner && (
        <form action={deleteLesson.bind(null, lesson.id)}>
          <button
            type="submit"
            className="rounded-control px-2 py-1 text-small text-fg-subtle transition-colors duration-150 hover:bg-subtle hover:text-danger-ink"
            aria-label={`Remove lesson: ${lesson.title}`}
          >
            Remove
          </button>
        </form>
      )}
    </li>
  );
}
