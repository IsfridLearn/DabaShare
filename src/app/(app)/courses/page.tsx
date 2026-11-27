import { BookOpen, Plus, SearchX } from "lucide-react";
import Link from "next/link";
import { CourseEntry } from "@/components/courses/course-card";
import { CourseSearch } from "@/components/courses/course-filters";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, Pagination } from "@/components/ui/primitives";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { searchCourses } from "@/lib/courses/queries";
import { getRatingSummaries } from "@/lib/courses/space-queries";
import { coursesHref, PAGE_SIZE, parseCourseFilters } from "@/lib/courses/validation";
import { getCategories, getUniversities } from "@/lib/reference";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Browse courses" };

// The catalogue: search, the departments, then a ruled list of courses.
export default async function CoursesPage({ searchParams }: PageProps<"/courses">) {
  await requireOnboardedProfile();
  const filters = parseCourseFilters(await searchParams);
  const [{ courses, total }, universities, categories] = await Promise.all([
    searchCourses(filters),
    getUniversities(),
    getCategories(),
  ]);
  const ratings = await getRatingSummaries(courses.map((c) => c.id));
  const filtered = Boolean(filters.q || filters.uni || filters.cat || filters.level || filters.price);
  const category = categories.find((c) => c.id === filters.cat);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="Courses"
        actions={
          <>
            <Link href="/courses/mine" className={`${buttonClasses({ variant: "ghost" })} max-sm:hidden`}>
              My courses
            </Link>
            <Link href="/courses/new" className={buttonClasses()}>
              <Plus className="size-4" aria-hidden="true" />
              Post a course
            </Link>
          </>
        }
      />

      <CourseSearch filters={filters} universities={universities} categories={categories} />

      <section aria-labelledby="results-title">
        <h2 id="results-title" className="flex items-baseline justify-between border-b border-line pb-2 text-label text-fg-muted" aria-live="polite">
          <span>{category ? category.name : filters.q ? `Results for “${filters.q}”` : "All courses"}</span>
          <span className="tabular-nums text-fg-subtle">
            {total === 1 ? "1 course" : `${total} courses`}
          </span>
        </h2>

        {courses.length ? (
          <ul className="divide-y divide-line border-b border-line">
            {courses.map((course) => (
              <li key={course.id}>
                <CourseEntry course={course} rating={ratings.get(course.id)} />
              </li>
            ))}
          </ul>
        ) : (
          <div className="pt-6">
            {filtered ? (
              <EmptyState
                icon={<SearchX className="size-5" />}
                title="No courses match"
                description="Try a different search term, another category, or fewer filters."
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
          </div>
        )}
      </section>

      <Pagination page={filters.page} pages={Math.ceil(total / PAGE_SIZE)} hrefFor={(page) => coursesHref({ ...filters, page })} />
    </div>
  );
}
