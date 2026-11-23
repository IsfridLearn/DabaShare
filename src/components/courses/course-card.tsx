import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/tag";
import type { CourseListItem } from "@/lib/courses/queries";
import { formatPrice, levelLabel } from "@/lib/courses/validation";

const MAX_TAGS = 4;

export function CourseCard({ course }: { course: CourseListItem }) {
  const free = course.price_php === 0;
  const extra = course.skill_names.length - MAX_TAGS;

  return (
    <Link
      href={`/courses/${course.id}`}
      className="group flex flex-col gap-3 rounded-card border border-gray-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 motion-reduce:transform-none hover:border-blue-200 hover:shadow-card-lg focus-visible:outline-2 focus-visible:outline-brand"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="text-base leading-snug font-semibold group-hover:text-brand">{course.title}</h2>
        <Tag tone={free ? "free" : "paid"} className="shrink-0 font-semibold">
          {formatPrice(course.price_php)}
        </Tag>
      </div>
      <p className="text-sm text-gray-500">
        {levelLabel(course.level)} · {course.category_name}
      </p>
      <p className="line-clamp-3 text-sm leading-relaxed text-gray-600">{course.description}</p>
      {course.skill_names.length > 0 && (
        <ul className="flex flex-wrap gap-1.5" aria-label="Skills">
          {course.skill_names.slice(0, MAX_TAGS).map((s) => (
            <li key={s}>
              <Tag className="px-2.5 py-0.5 text-xs">{s}</Tag>
            </li>
          ))}
          {extra > 0 && <li className="self-center text-xs text-gray-500">+{extra} more</li>}
        </ul>
      )}
      <div className="mt-auto flex items-center gap-2 border-t border-gray-100 pt-3 text-sm">
        <Avatar name={course.owner_name} path={course.owner_avatar} size={24} />
        <span className="truncate font-medium text-gray-800">{course.owner_name}</span>
        {course.university_short && <span className="ml-auto shrink-0 text-gray-500">{course.university_short}</span>}
      </div>
    </Link>
  );
}
