import { CourseForm, emptyCourse } from "@/components/courses/course-form";
import { PageHeader } from "@/components/ui/primitives";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { createCourse } from "@/lib/courses/actions";
import { getCategories } from "@/lib/reference";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Post a course" };

export default async function NewCoursePage() {
  await requireOnboardedProfile();
  const categories = await getCategories();
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader title="Post a course" description="Share what you know. Students from any Davao university can enroll." />
      <CourseForm action={createCourse} defaults={emptyCourse} categories={categories} submitLabel="Post course" />
    </div>
  );
}
