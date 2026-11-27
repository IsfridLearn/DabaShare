import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import type { CourseListItem } from "@/lib/courses/queries";
import type { RatingSummary } from "@/lib/courses/space-queries";
import { RatingInline } from "./space/stars";
import { formatPrice, levelLabel } from "@/lib/courses/validation";

const MAX_SKILLS = 3;

// A catalogue entry, read like a course bulletin: department and level as a
// condensed label, the title large, who teaches it, and the price set apart.
export function CourseEntry({ course, rating }: { course: CourseListItem; rating?: RatingSummary }) {
  const free = course.price_php === 0;
  const extra = course.skill_names.length - MAX_SKILLS;

  return (
    <Link
      href={`/courses/${course.id}`}
      className="group -mx-3 grid grid-cols-[minmax(0,1fr)_auto] gap-x-6 gap-y-3 rounded-card px-3 py-5 transition-colors duration-150 hover:bg-subtle/60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand sm:py-6"
    >
      <div className="min-w-0">
        <p className="text-label text-fg-subtle">
          {course.category_name} <span aria-hidden="true">·</span> {levelLabel(course.level)}
        </p>
        <h3 className="mt-1.5 font-display text-[1.5rem] leading-[1.1] text-fg decoration-line-strong decoration-1 underline-offset-[5px] group-hover:underline sm:text-[1.625rem]">
          {course.title}
        </h3>
        <p className="mt-2 line-clamp-2 max-w-[62ch] text-fg-muted">{course.description}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-small">
          <span className="flex items-center gap-2 text-fg">
            <Avatar name={course.owner_name} path={course.owner_avatar} size={20} />
            <span>
              {course.owner_name}
              {course.university_short && <span className="text-fg-subtle"> · {course.university_short}</span>}
            </span>
          </span>
          {course.skill_names.length > 0 && (
            <span className="text-fg-subtle">
              <span className="sr-only">Skills: </span>
              {course.skill_names.slice(0, MAX_SKILLS).join(", ")}
              {extra > 0 && ` +${extra}`}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col items-end gap-2">
        <p className={free ? "font-display text-[1.25rem] leading-none text-brand-ink" : "font-display text-[1.25rem] leading-none text-fg"}>
          {formatPrice(course.price_php)}
        </p>
        {rating && <RatingInline avg={rating.avg} count={rating.count} />}
      </div>
    </Link>
  );
}
