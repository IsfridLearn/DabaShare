import { Search, SlidersHorizontal, X } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/field";
import { coursesHref, LEVELS, type CourseFilters } from "@/lib/courses/validation";
import type { Category, University } from "@/lib/reference";

// Search, then one row: the departments (real categories) and a "Filters"
// dropdown for university, level and price. The dropdown is a <details>, so
// it works without JavaScript; active filters show as removable chips.
// A plain GET form: every result page has a shareable URL.
export function CourseSearch({
  filters,
  universities,
  categories,
}: {
  filters: CourseFilters;
  universities: University[];
  categories: Category[];
}) {
  const university = universities.find((u) => u.id === filters.uni);
  const level = LEVELS.find((l) => l.value === filters.level);
  const refined = Boolean(university || level || filters.price);

  return (
    <form action="/courses" method="get" role="search" className="flex flex-col gap-4">
      {filters.cat && <input type="hidden" name="cat" value={filters.cat} />}
      <div className="flex gap-2">
        <div className="relative min-w-0 flex-1">
          <label className="sr-only" htmlFor="q">
            Search courses or tutors
          </label>
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" aria-hidden="true" />
          <Input id="q" name="q" type="search" className="h-10 pl-9" placeholder="Course, skill or tutor" defaultValue={filters.q} />
        </div>
        <Button type="submit" className="h-10">
          Search
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <CategoryIndex filters={filters} categories={categories} />
        <details className="relative shrink-0">
          <summary className="inline-flex h-8 cursor-pointer list-none items-center gap-2 rounded-control border border-line-strong bg-surface px-2.5 text-small font-medium text-fg transition-colors duration-150 hover:bg-subtle [&::-webkit-details-marker]:hidden">
            <SlidersHorizontal className="size-4 text-fg-muted" aria-hidden="true" />
            Filters
          </summary>
          <div className="absolute right-0 z-30 mt-2 flex w-[min(20rem,calc(100vw-2rem))] flex-col gap-3 rounded-card border border-line bg-surface p-4 shadow-overlay">
            <FilterField label="University" htmlFor="uni">
              <Select id="uni" name="uni" defaultValue={filters.uni ?? ""}>
                <option value="">Any university</option>
                {universities.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.short_name}
                  </option>
                ))}
              </Select>
            </FilterField>
            <FilterField label="Level" htmlFor="level">
              <Select id="level" name="level" defaultValue={filters.level ?? ""}>
                <option value="">Any level</option>
                {LEVELS.map((l) => (
                  <option key={l.value} value={l.value}>
                    {l.label}
                  </option>
                ))}
              </Select>
            </FilterField>
            <FilterField label="Price" htmlFor="price">
              <Select id="price" name="price" defaultValue={filters.price ?? ""}>
                <option value="">Any price</option>
                <option value="free">Free</option>
                <option value="paid">Paid</option>
              </Select>
            </FilterField>
            <Button type="submit" fullWidth>
              Show courses
            </Button>
          </div>
        </details>
      </div>

      {refined && (
        <ul className="-mt-1 flex flex-wrap items-center gap-2" aria-label="Active filters">
          {university && <ActiveFilter href={coursesHref({ ...filters, uni: undefined, page: 1 })} label={university.short_name} />}
          {level && <ActiveFilter href={coursesHref({ ...filters, level: undefined, page: 1 })} label={level.label} />}
          {filters.price && <ActiveFilter href={coursesHref({ ...filters, price: undefined, page: 1 })} label={filters.price === "free" ? "Free" : "Paid"} />}
        </ul>
      )}
    </form>
  );
}

function FilterField({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-label text-fg-subtle">
        {label}
      </label>
      {children}
    </div>
  );
}

function ActiveFilter({ href, label }: { href: string; label: string }) {
  return (
    <li>
      <Link
        href={href}
        className="inline-flex h-7 items-center gap-1.5 rounded-control border border-line-strong bg-surface pr-1.5 pl-2.5 text-small font-medium text-fg transition-colors duration-150 hover:bg-subtle"
      >
        {label}
        <X className="size-3.5 text-fg-muted" aria-hidden="true" />
        <span className="sr-only">(remove filter)</span>
      </Link>
    </li>
  );
}

// The catalogue's departments. Scrolls sideways when it doesn't fit; the
// right edge fades so it reads as scrollable.
function CategoryIndex({ filters, categories }: { filters: CourseFilters; categories: Category[] }) {
  const items = [{ id: undefined as number | undefined, name: "All" }, ...categories];
  return (
    <nav
      aria-label="Categories"
      className="flex min-w-0 flex-1 gap-1 overflow-x-auto pr-8 [mask-image:linear-gradient(to_right,black_calc(100%-2.5rem),transparent)] [scrollbar-width:none]"
    >
      {items.map((c) => {
        const active = filters.cat === c.id;
        return (
          <Link
            key={c.name}
            href={coursesHref({ ...filters, cat: c.id, page: 1 })}
            aria-current={active ? "page" : undefined}
            className={
              active
                ? "shrink-0 rounded-control bg-fg px-2.5 py-1 text-small font-medium whitespace-nowrap text-canvas"
                : "shrink-0 rounded-control px-2.5 py-1 text-small whitespace-nowrap text-fg-muted transition-colors duration-150 hover:bg-subtle hover:text-fg"
            }
          >
            {c.name}
          </Link>
        );
      })}
    </nav>
  );
}
