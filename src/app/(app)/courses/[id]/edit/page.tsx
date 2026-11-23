import Link from "next/link";
import { notFound } from "next/navigation";
import { CourseForm } from "@/components/courses/course-form";
import { DeleteCourseForm } from "@/components/courses/owner-tools";
import { Card } from "@/components/ui/card";
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
      <Link href={`/courses/${course.id}`} className="text-sm font-medium text-brand hover:underline">
        ← Back to course
      </Link>
      <h1 className="text-2xl font-bold">Edit course</h1>
      <Card>
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
      </Card>
      <Card className="flex flex-col gap-3 border-red-200">
        <h2 className="text-lg font-semibold text-danger">Delete course</h2>
        <p className="text-sm text-gray-600">
          To stop new enrollments but keep the course for current students, set its visibility to Archived instead.
        </p>
        <DeleteCourseForm courseId={course.id} />
      </Card>
    </div>
  );
}
