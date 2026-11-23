import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { Database, Enums } from "@/lib/supabase/database.types";
import { PAGE_SIZE, type CourseFilters } from "./validation";

export type CourseListItem = Database["public"]["Functions"]["search_courses"]["Returns"][number];
export type EnrollmentStatus = Enums<"request_status">;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (value: string) => UUID.test(value);

export async function searchCourses(filters: CourseFilters) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("search_courses", {
    filter_text: filters.q,
    filter_university: filters.uni,
    filter_price: filters.price,
    filter_category: filters.cat,
    filter_level: filters.level,
    page_size: PAGE_SIZE,
    page_offset: (filters.page - 1) * PAGE_SIZE,
  });
  if (error) throw new Error(`Could not load courses: ${error.message}`);
  return { courses: data, total: Number(data[0]?.total_count ?? 0) };
}

type PersonRef = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_path: string | null;
  university: { short_name: string; name: string } | null;
};

export type CourseDetail = {
  id: string;
  owner_id: string;
  title: string;
  description: string;
  level: Enums<"course_level">;
  price_php: number;
  status: Enums<"course_status">;
  category_id: number;
  created_at: string;
  updated_at: string;
  category: { name: string } | null;
  owner: PersonRef | null;
  skills: string[];
};

export type Enrollment = {
  id: string;
  status: EnrollmentStatus;
  note: string | null;
  created_at: string;
  decided_at: string | null;
};

export type OwnerEnrollment = Enrollment & { student: PersonRef | null };

const PERSON = "id, display_name, username, avatar_path, university:universities(short_name, name)";

// RLS decides visibility (published, or your own; no blocked tutors).
export async function getCourseDetail(id: string): Promise<CourseDetail | null> {
  if (!isUuid(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select(
      `id, owner_id, title, description, level, price_php, status, category_id, created_at, updated_at,
       category:categories(name), owner:profiles(${PERSON}), course_skills(skill:skills(name))`,
    )
    .eq("id", id)
    .maybeSingle<
      Omit<CourseDetail, "skills"> & { course_skills: { skill: { name: string } | null }[] }
    >();
  if (error) throw new Error(`Could not load course: ${error.message}`);
  if (!data) return null;
  const { course_skills, ...course } = data;
  return {
    ...course,
    skills: course_skills.flatMap((cs) => (cs.skill ? [cs.skill.name] : [])).sort((a, b) => a.localeCompare(b)),
  };
}

export async function getMyEnrollment(courseId: string, userId: string): Promise<Enrollment | null> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("course_enrollments")
    .select("id, status, note, created_at, decided_at")
    .eq("course_id", courseId)
    .eq("student_id", userId)
    .maybeSingle();
  return data;
}

// Only the owner can read these (RLS); newest requests first.
export async function getCourseEnrollments(courseId: string): Promise<OwnerEnrollment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_enrollments")
    .select(`id, status, note, created_at, decided_at, student:profiles(${PERSON})`)
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<OwnerEnrollment[]>();
  if (error) throw new Error(`Could not load enrollments: ${error.message}`);
  return data;
}

export type TeachingCourse = {
  id: string;
  title: string;
  status: Enums<"course_status">;
  price_php: number;
  level: Enums<"course_level">;
  updated_at: string;
  pending: number;
  students: number;
};

export async function getMyTeaching(userId: string): Promise<TeachingCourse[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, status, price_php, level, updated_at, course_enrollments(status)")
    .eq("owner_id", userId)
    .order("updated_at", { ascending: false });
  if (error) throw new Error(`Could not load your courses: ${error.message}`);
  return data.map(({ course_enrollments, ...c }) => ({
    ...c,
    pending: course_enrollments.filter((e) => e.status === "requested").length,
    students: course_enrollments.filter((e) => e.status === "accepted").length,
  }));
}

// A student's published courses (public profile). RLS hides blocked owners.
export async function getPublishedCoursesBy(ownerId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .select("id, title, price_php")
    .eq("owner_id", ownerId)
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw new Error(`Could not load courses: ${error.message}`);
  return data;
}

export type LearningEnrollment = Enrollment & {
  course: { id: string; title: string; price_php: number; owner: { display_name: string } | null } | null;
};

export async function getMyLearning(userId: string): Promise<LearningEnrollment[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_enrollments")
    .select("id, status, note, created_at, decided_at, course:courses(id, title, price_php, owner:profiles(display_name))")
    .eq("student_id", userId)
    .neq("status", "cancelled")
    .order("created_at", { ascending: false })
    .returns<LearningEnrollment[]>();
  if (error) throw new Error(`Could not load your enrollments: ${error.message}`);
  return data;
}
