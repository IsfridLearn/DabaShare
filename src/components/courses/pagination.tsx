import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { coursesHref, PAGE_SIZE, type CourseFilters } from "@/lib/courses/validation";

export function Pagination({ filters, total }: { filters: CourseFilters; total: number }) {
  const pages = Math.ceil(total / PAGE_SIZE);
  if (pages <= 1) return null;
  const { page } = filters;

  return (
    <nav aria-label="Pages" className="flex items-center justify-center gap-3">
      {page > 1 ? (
        <Link href={coursesHref({ ...filters, page: page - 1 })} className={buttonClasses({ variant: "outline", size: "sm" })}>
          ← Previous
        </Link>
      ) : (
        <span className={buttonClasses({ variant: "outline", size: "sm" }) + " pointer-events-none opacity-40"} aria-hidden="true">
          ← Previous
        </span>
      )}
      <span className="text-sm text-gray-600">
        Page {page} of {pages}
      </span>
      {page < pages ? (
        <Link href={coursesHref({ ...filters, page: page + 1 })} className={buttonClasses({ variant: "outline", size: "sm" })}>
          Next →
        </Link>
      ) : (
        <span className={buttonClasses({ variant: "outline", size: "sm" }) + " pointer-events-none opacity-40"} aria-hidden="true">
          Next →
        </span>
      )}
    </nav>
  );
}
