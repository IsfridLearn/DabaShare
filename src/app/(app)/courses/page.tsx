import Link from "next/link";
import { CourseCard } from "@/components/courses/course-card";
import { CourseFiltersBar } from "@/components/courses/course-filters";
import { Pagination } from "@/components/courses/pagination";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { searchCourses } from "@/lib/courses/queries";
import { parseCourseFilters } from "@/lib/courses/validation";
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
      <section className="rounded-card bg-linear-120 from-brand to-accent px-6 py-8 text-white shadow-card-lg sm:px-10">
        <h1 className="text-2xl font-bold text-white sm:text-3xl">Browse available courses</h1>
        <p className="mt-2 max-w-xl text-blue-50">Discover skills shared by students across Davao City universities.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <Link href="/courses/new" className={buttonClasses({ variant: "outline" }) + " border-white"}>
            + Post a course
          </Link>
          <Link
            href="/courses/mine"
            className="inline-flex items-center rounded-control border-[1.5px] border-white/60 px-5 py-2.5 font-display text-[0.95rem] font-semibold text-white hover:bg-white/10"
          >
            My courses
          </Link>
        </div>
      </section>

      <CourseFiltersBar filters={filters} universities={universities} categories={categories} />

      <p className="text-sm text-gray-600" aria-live="polite">
        {total === 1 ? "1 course" : `${total} courses`}
        {filtered ? " match your filters" : ""}
      </p>

      {courses.length ? (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((course) => (
            <li key={course.id} className="flex">
              <CourseCard course={course} />
            </li>
          ))}
        </ul>
      ) : filtered ? (
        <EmptyState
          title="No courses match"
          description="Try a different search term or remove some filters."
          action={
            <Link href="/courses" className={buttonClasses({ variant: "outline" })}>
              Clear filters
            </Link>
          }
        />
      ) : (
        <EmptyState
          title="No courses yet"
          description="Be the first to share what you know with students across Davao."
          action={
            <Link href="/courses/new" className={buttonClasses()}>
              Post a course
            </Link>
          }
        />
      )}

      <Pagination filters={filters} total={total} />
    </div>
  );
}
