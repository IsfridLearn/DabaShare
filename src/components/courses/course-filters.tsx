import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { cn } from "@/lib/cn";
import { coursesHref, LEVELS, type CourseFilters } from "@/lib/courses/validation";
import type { Category, University } from "@/lib/reference";

// A plain GET form: works without JavaScript, and every result page has a
// shareable URL.
export function CourseFiltersBar({
  filters,
  universities,
  categories,
}: {
  filters: CourseFilters;
  universities: University[];
  categories: Category[];
}) {
  const priceOptions = [
    { value: undefined, label: "All" },
    { value: "free" as const, label: "Free" },
    { value: "paid" as const, label: "Paid" },
  ];
  const active = Boolean(filters.q || filters.uni || filters.cat || filters.level || filters.price);

  return (
    <div className="flex flex-col gap-3 rounded-card border border-gray-200 bg-white p-4 shadow-card">
      <form action="/courses" method="get" className="grid grid-cols-2 gap-3 md:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">
        {filters.price && <input type="hidden" name="price" value={filters.price} />}
        <label className="sr-only" htmlFor="q">
          Search courses or tutors
        </label>
        <Input id="q" name="q" type="search" className="col-span-2 md:col-span-1" placeholder="Search courses, skills or tutors…" defaultValue={filters.q} />
        <label className="sr-only" htmlFor="uni">
          University
        </label>
        <Select id="uni" name="uni" defaultValue={filters.uni ?? ""}>
          <option value="">All universities</option>
          {universities.map((u) => (
            <option key={u.id} value={u.id}>
              {u.short_name}
            </option>
          ))}
        </Select>
        <label className="sr-only" htmlFor="cat">
          Category
        </label>
        <Select id="cat" name="cat" defaultValue={filters.cat ?? ""}>
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <label className="sr-only" htmlFor="level">
          Level
        </label>
        <Select id="level" name="level" defaultValue={filters.level ?? ""}>
          <option value="">All levels</option>
          {LEVELS.map((l) => (
            <option key={l.value} value={l.value}>
              {l.label}
            </option>
          ))}
        </Select>
        <button type="submit" className={`${buttonClasses()} md:col-span-1`}>
          Search
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm text-gray-500">Price:</span>
        {priceOptions.map((option) => {
          const selected = filters.price === option.value;
          return (
            <Link
              key={option.label}
              href={coursesHref({ ...filters, price: option.value, page: 1 })}
              aria-current={selected ? "true" : undefined}
              className={cn(
                "rounded-full border px-3.5 py-1 text-sm font-medium transition",
                selected
                  ? "border-brand bg-brand text-white"
                  : "border-gray-200 bg-white text-gray-600 hover:border-brand hover:text-brand",
              )}
            >
              {option.label}
            </Link>
          );
        })}
        {active && (
          <Link href="/courses" className="ml-auto text-sm font-medium text-brand hover:underline">
            Clear filters
          </Link>
        )}
      </div>
    </div>
  );
}
