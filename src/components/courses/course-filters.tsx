import { Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { Chip } from "@/components/ui/primitives";
import { coursesHref, LEVELS, type CourseFilters } from "@/lib/courses/validation";
import type { Category, University } from "@/lib/reference";

// A plain GET form: works without JavaScript, and every result page has a
// shareable URL.
export function CourseFiltersBar({
  filters,
  universities,
  categories,
  total,
}: {
  filters: CourseFilters;
  universities: University[];
  categories: Category[];
  total: number;
}) {
  const priceOptions = [
    { value: undefined, label: "Any price" },
    { value: "free" as const, label: "Free" },
    { value: "paid" as const, label: "Paid" },
  ];
  const active = Boolean(filters.q || filters.uni || filters.cat || filters.level || filters.price);

  return (
    <div className="flex flex-col gap-3">
      <form
        action="/courses"
        method="get"
        role="search"
        className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]"
      >
        {filters.price && <input type="hidden" name="price" value={filters.price} />}
        <div className="relative col-span-2 sm:col-span-4 lg:col-span-1">
          <label className="sr-only" htmlFor="q">
            Search courses or tutors
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
          <Input id="q" name="q" type="search" className="pl-9" placeholder="Search courses, skills or tutors" defaultValue={filters.q} />
        </div>
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
        <Button type="submit" className="h-auto min-h-9">
          Search
        </Button>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        {priceOptions.map((option) => (
          <Chip key={option.label} href={coursesHref({ ...filters, price: option.value, page: 1 })} active={filters.price === option.value}>
            {option.label}
          </Chip>
        ))}
        <p className="text-small text-fg-subtle sm:ml-auto" aria-live="polite">
          {total === 1 ? "1 course" : `${total} courses`}
          {active ? " match your filters" : ""}
          {active && (
            <>
              {" · "}
              <Link href="/courses" className="font-medium text-fg-muted underline-offset-2 hover:text-fg hover:underline">
                Clear filters
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
