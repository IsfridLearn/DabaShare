import "server-only";
import { createClient } from "@/lib/supabase/server";

// Reads for the course space. RLS decides everything: lessons and updates
// only reach members, reviews follow the course's visibility.

export type Lesson = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  location: string | null;
  notes: string | null;
};

export type CourseUpdate = { id: string; body: string; link_url: string | null; created_at: string };

export type Review = {
  id: string;
  rating: number;
  body: string | null;
  created_at: string;
  updated_at: string;
  author_id: string;
  author: { display_name: string; username: string | null; avatar_path: string | null } | null;
};

export type RatingSummary = { avg: number; count: number };

export async function getLessons(courseId: string): Promise<Lesson[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_lessons")
    .select("id, title, starts_at, ends_at, location, notes")
    .eq("course_id", courseId)
    .order("starts_at")
    .limit(200);
  if (error) throw new Error(`Could not load lessons: ${error.message}`);
  return data;
}

export async function getUpdates(courseId: string): Promise<CourseUpdate[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_updates")
    .select("id, body, link_url, created_at")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(`Could not load updates: ${error.message}`);
  return data;
}

export async function getReviews(courseId: string): Promise<Review[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_reviews")
    .select("id, rating, body, created_at, updated_at, author_id, author:profiles(display_name, username, avatar_path)")
    .eq("course_id", courseId)
    .order("created_at", { ascending: false })
    .limit(100)
    .returns<Review[]>();
  if (error) throw new Error(`Could not load reviews: ${error.message}`);
  return data;
}

export async function getRatingSummaries(courseIds: string[]): Promise<Map<string, RatingSummary>> {
  const ids = [...new Set(courseIds)].slice(0, 100);
  if (!ids.length) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("course_rating_summary", { course_ids: ids });
  if (error) throw new Error(`Could not load ratings: ${error.message}`);
  return new Map(data.map((r) => [r.course_id, { avg: Number(r.rating_avg), count: r.rating_count }]));
}

export async function getTutorRating(tutorId: string): Promise<RatingSummary | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("tutor_rating_summary", { tutor: tutorId });
  if (error) throw new Error(`Could not load the tutor's rating: ${error.message}`);
  const row = data[0];
  return row && row.rating_count > 0 ? { avg: Number(row.rating_avg), count: row.rating_count } : null;
}

/** The next lesson of each course you're in (for My courses). */
export async function getNextLessons(courseIds: string[]): Promise<Map<string, Lesson>> {
  const ids = [...new Set(courseIds)].slice(0, 100);
  if (!ids.length) return new Map();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("course_lessons")
    .select("id, course_id, title, starts_at, ends_at, location, notes")
    .in("course_id", ids)
    .gt("ends_at", new Date().toISOString())
    .order("starts_at")
    .limit(300);
  if (error) throw new Error(`Could not load lessons: ${error.message}`);
  const next = new Map<string, Lesson>();
  for (const { course_id, ...lesson } of data) if (!next.has(course_id)) next.set(course_id, lesson);
  return next;
}
