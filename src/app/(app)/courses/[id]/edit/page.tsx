import { notFound } from "next/navigation";
import { CourseForm } from "@/components/courses/course-form";
import { DeleteCourseForm } from "@/components/courses/owner-tools";
import { BackLink, PageHeader, PanelSection } from "@/components/ui/primitives";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { updateCourse } from "@/lib/courses/actions";
import { getCourseDetail } from "@/lib/courses/queries";
import { getCategories } from "@/lib/reference";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Edit course" };

export default async function EditCoursePage({ params }: PageProps<"/courses/[id]/edit">) {
  const me = await requireOnboardedProfile();
  const { id } = await params;
  const [course, categories] = await Promise.all([getCourseDetail(id), getCategories()]);
  // Not yours (or not visible) looks the same as not existing.
  if (!course || course.owner_id !== me.id) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <BackLink href={`/courses/${course.id}`}>Back to course</BackLink>
      <PageHeader title="Edit course" />
        <CourseForm
          action={updateCourse.bind(null, course.id)}
          categories={categories}
          submitLabel="Save changes"
          defaults={{
            title: course.title,
            description: course.description,
            categoryId: String(course.category_id),
            level: course.level,
            priceType: course.price_php > 0 ? "paid" : "free",
            pricePhp: course.price_php > 0 ? String(course.price_php) : "",
            status: course.status,
            skills: course.skills.join(", "),
          }}
        />
      <div className="mt-6 border-t border-line">
        <PanelSection
          title="Delete course"
          tone="danger"
          description="To stop new enrollments but keep the course for current students, set its visibility to Archived instead."
        >
          <DeleteCourseForm courseId={course.id} />
        </PanelSection>
      </div>
    </div>
  );
}
