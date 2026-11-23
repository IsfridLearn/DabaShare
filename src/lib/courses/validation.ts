import { z } from "zod";
import type { Enums } from "@/lib/supabase/database.types";

export type CourseLevel = Enums<"course_level">;
export type CourseStatus = Enums<"course_status">;

export const LEVELS: { value: CourseLevel; label: string }[] = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
  { value: "expert", label: "Expert" },
];

export const STATUSES: { value: CourseStatus; label: string; hint: string }[] = [
  { value: "published", label: "Published", hint: "Visible to students and open for enrollment." },
  { value: "draft", label: "Draft", hint: "Only you can see it." },
  { value: "archived", label: "Archived", hint: "Hidden from browsing; existing students keep it." },
];

export const PAGE_SIZE = 12;
export const MAX_PRICE_PHP = 100000;

const pesoFormat = new Intl.NumberFormat("en-PH", { maximumFractionDigits: 0 });

export function formatPrice(pricePhp: number): string {
  return pricePhp === 0 ? "Free" : `₱${pesoFormat.format(pricePhp)}`;
}

export function levelLabel(level: CourseLevel): string {
  return LEVELS.find((l) => l.value === level)?.label ?? level;
}

// ── Browse filters (from the URL) ──────────────────────────────────────────
export type CourseFilters = {
  q?: string;
  uni?: number;
  price?: "free" | "paid";
  cat?: number;
  level?: CourseLevel;
  page: number;
};

// smallint ids in the database: anything larger would make the query fail.
const positiveInt = z.coerce.number().int().positive().max(32767);
const pageNumber = z.coerce.number().int().positive();

// Invalid or unknown values are dropped rather than erroring, so a hand-edited
// URL still shows results.
export function parseCourseFilters(params: Record<string, string | string[] | undefined>): CourseFilters {
  const one = (key: string) => {
    const v = params[key];
    return typeof v === "string" ? v : undefined;
  };
  const q = one("q")?.trim().slice(0, 100);
  const uni = positiveInt.safeParse(one("uni"));
  const cat = positiveInt.safeParse(one("cat"));
  const page = pageNumber.safeParse(one("page"));
  const price = one("price");
  const level = one("level");
  return {
    q: q || undefined,
    uni: uni.success ? uni.data : undefined,
    cat: cat.success ? cat.data : undefined,
    price: price === "free" || price === "paid" ? price : undefined,
    level: LEVELS.some((l) => l.value === level) ? (level as CourseLevel) : undefined,
    page: page.success ? Math.min(page.data, 1000) : 1,
  };
}

// Builds a /courses URL from filters (used by pills and pagination links).
export function coursesHref(filters: Partial<CourseFilters>): string {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.uni) params.set("uni", String(filters.uni));
  if (filters.price) params.set("price", filters.price);
  if (filters.cat) params.set("cat", String(filters.cat));
  if (filters.level) params.set("level", filters.level);
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/courses?${query}` : "/courses";
}

// ── Course form ────────────────────────────────────────────────────────────
export function parseSkillList(input: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of input.split(",")) {
    const name = raw.trim().replace(/\s+/g, " ");
    const key = name.toLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      out.push(name);
    }
  }
  return out;
}

export const courseSchema = z
  .object({
    title: z.string().trim().min(3, { error: "Use at least 3 characters." }).max(120, { error: "Use at most 120 characters." }),
    description: z
      .string()
      .trim()
      .min(10, { error: "Describe the course in at least 10 characters." })
      .max(5000, { error: "Use at most 5,000 characters." }),
    categoryId: z.coerce.number({ error: "Choose a category." }).int().positive({ error: "Choose a category." }),
    level: z.enum(["beginner", "intermediate", "advanced", "expert"], { error: "Choose a level." }),
    priceType: z.enum(["free", "paid"], { error: "Choose free or paid." }),
    pricePhp: z.string().trim().optional(),
    status: z.enum(["published", "draft", "archived"]).default("published"),
    skills: z
      .string()
      .default("")
      .transform(parseSkillList)
      .refine((list) => list.length <= 10, { error: "Add up to 10 skills." })
      .refine((list) => list.every((s) => s.length <= 50), { error: "Each skill can be at most 50 characters." }),
  })
  .transform((v, ctx) => {
    let price = 0;
    if (v.priceType === "paid") {
      const amount = Number(v.pricePhp);
      if (!v.pricePhp || !Number.isInteger(amount) || amount < 1 || amount > MAX_PRICE_PHP) {
        ctx.addIssue({
          code: "custom",
          path: ["pricePhp"],
          message: `Enter a whole peso amount from 1 to ${pesoFormat.format(MAX_PRICE_PHP)}.`,
        });
        return z.NEVER;
      }
      price = amount;
    }
    return {
      title: v.title,
      description: v.description,
      category_id: v.categoryId,
      level: v.level,
      price_php: price,
      status: v.status,
      skills: v.skills,
    };
  });

export type CourseInput = z.infer<typeof courseSchema>;

export const enrollmentNoteSchema = z.object({
  note: z.string().trim().max(500, { error: "Use at most 500 characters." }).default(""),
});
