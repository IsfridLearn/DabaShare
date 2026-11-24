import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import type { CourseListItem } from "@/lib/courses/queries";
import { formatPrice, levelLabel } from "@/lib/courses/validation";

const MAX_SKILLS = 3;

// Flat catalogue entry: hairline border, no lift. The whole card is the link.
export function CourseCard({ course }: { course: CourseListItem }) {
  const free = course.price_php === 0;
  const extra = course.skill_names.length - MAX_SKILLS;

  return (
    <Link
      href={`/courses/${course.id}`}
      className="group flex w-full flex-col rounded-card border border-line bg-surface p-5 transition-colors duration-150 hover:border-line-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <p className="flex items-center justify-between gap-3 text-caption text-fg-subtle">
        <span className="truncate">
          {course.category_name} · {levelLabel(course.level)}
        </span>
        <span className={free ? "shrink-0 font-medium text-success-ink" : "shrink-0 font-medium text-fg"}>{formatPrice(course.price_php)}</span>
      </p>
      <h2 className="mt-2 text-heading leading-snug decoration-line-strong underline-offset-4 group-hover:underline">{course.title}</h2>
      <p className="mt-1.5 line-clamp-2 text-small text-fg-muted">{course.description}</p>
      {course.skill_names.length > 0 && (
        <p className="mt-3 truncate text-caption text-fg-subtle">
          <span className="sr-only">Skills: </span>
          {course.skill_names.slice(0, MAX_SKILLS).join(" · ")}
          {extra > 0 && ` · +${extra}`}
        </p>
      )}
      <div className="mt-auto flex items-center gap-2 pt-4 text-small">
        <Avatar name={course.owner_name} path={course.owner_avatar} size={22} />
        <span className="truncate text-fg">{course.owner_name}</span>
        {course.university_short && <span className="ml-auto shrink-0 text-fg-subtle">{course.university_short}</span>}
      </div>
    </Link>
  );
}
