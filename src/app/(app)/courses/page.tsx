import { BookOpen, Plus, SearchX } from "lucide-react";
import Link from "next/link";
import { CourseCard } from "@/components/courses/course-card";
import { CourseFiltersBar } from "@/components/courses/course-filters";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, Pagination } from "@/components/ui/primitives";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { searchCourses } from "@/lib/courses/queries";
import { coursesHref, PAGE_SIZE, parseCourseFilters } from "@/lib/courses/validation";
import { getCategories, getUniversities } from "@/lib/reference";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Browse courses" };

export default async function CoursesPage({ searchParams }: PageProps<"/courses">) {
  await requireOnboardedProfile();
  const filters = parseCourseFilters(await searchParams);
  const [{ courses, total }, universities, categories] = await Promise.all([
    searchCourses(filters),
    getUniversities(),
    getCategories(),
  ]);
  const filtered = Boolean(filters.q || filters.uni || filters.cat || filters.level || filters.price);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Courses"
        description="Skills taught by students across Davao City universities."
        actions={
          <>
            <Link href="/courses/mine" className={buttonClasses({ variant: "secondary" })}>
              My courses
            </Link>
            <Link href="/courses/new" className={buttonClasses()}>
              <Plus className="size-4" aria-hidden="true" />
              Post a course
            </Link>
          </>
        }
      />

      <CourseFiltersBar filters={filters} universities={universities} categories={categories} total={total} />

      {courses.length ? (
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <li key={course.id} className="flex">
              <CourseCard course={course} />
            </li>
          ))}
        </ul>
      ) : filtered ? (
        <EmptyState
          icon={<SearchX className="size-5" />}
          title="No courses match"
          description="Try a different search term or remove some filters."
          action={
            <Link href="/courses" className={buttonClasses({ variant: "secondary" })}>
              Clear filters
            </Link>
          }
        />
      ) : (
        <EmptyState
          icon={<BookOpen className="size-5" />}
          title="No courses yet"
          description="Be the first to share what you know with students across Davao."
          action={
            <Link href="/courses/new" className={buttonClasses()}>
              Post a course
            </Link>
          }
        />
      )}

      <Pagination page={filters.page} pages={Math.ceil(total / PAGE_SIZE)} hrefFor={(page) => coursesHref({ ...filters, page })} />
    </div>
  );
}
