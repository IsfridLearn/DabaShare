import Link from "next/link";
import { MatchCard } from "@/components/matching/match-card";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { MATCH_MODES, MATCH_PAGE_SIZE, matchesHref, parseMatchFilters } from "@/lib/matching/filters";
import { getMatches, getMyMatchingInputs } from "@/lib/matching/queries";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Your matches" };

const pill = (selected: boolean) =>
  cn(
    "rounded-full border px-3.5 py-1 text-sm font-medium transition",
    selected ? "border-brand bg-brand text-white" : "border-gray-200 bg-surface text-gray-600 hover:border-brand hover:text-brand-ink",
  );

export default async function MatchesPage({ searchParams }: PageProps<"/matches">) {
  const me = await requireOnboardedProfile();
  const filters = parseMatchFilters(await searchParams);
  const [{ matches, total }, inputs] = await Promise.all([getMatches(filters), getMyMatchingInputs(me.id)]);
  const pages = Math.ceil(total / MATCH_PAGE_SIZE);
  const noInputs = inputs.teach + inputs.learn + inputs.interests === 0;
  const filtered = Boolean(filters.mode || filters.sameUni);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Your matches</h1>
        <p className="mt-1.5 max-w-2xl text-gray-600">
          Students who can teach what you want to learn, and want to learn what you can teach. Skill swaps, where you
          can help each other, come first.
        </p>
      </div>

      {!noInputs && (inputs.teach === 0 || inputs.learn === 0) && (
        <Alert tone="info">
          Add {inputs.teach === 0 ? "skills you can teach" : "skills you want to learn"} to{" "}
          <Link href="/profile" className="font-semibold underline">
            your profile
          </Link>{" "}
          to find skill swaps.
        </Alert>
      )}

      <nav aria-label="Filter matches" className="flex flex-wrap items-center gap-2">
        {MATCH_MODES.map((m) => (
          <Link
            key={m.label}
            href={matchesHref({ ...filters, mode: m.value, page: 1 })}
            aria-current={filters.mode === m.value ? "true" : undefined}
            className={pill(filters.mode === m.value)}
          >
            {m.label}
          </Link>
        ))}
        <Link
          href={matchesHref({ ...filters, sameUni: !filters.sameUni, page: 1 })}
          aria-pressed={filters.sameUni}
          className={pill(filters.sameUni)}
        >
          {filters.sameUni ? "✓ " : ""}My university only
        </Link>
      </nav>

      {noInputs ? (
        <EmptyState
          title="Tell us what you know and what you want to learn"
          description="Matches are based on your skills and interests. Add a few to your profile and come back."
          action={
            <Link href="/profile" className={buttonClasses()}>
              Add skills
            </Link>
          }
        />
      ) : matches.length ? (
        <>
          <p className="text-sm text-gray-600" aria-live="polite">
            {total === 1 ? "1 match" : `${total} matches`}
          </p>
          <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((match) => (
              <li key={match.profile_id}>
                <MatchCard match={match} />
              </li>
            ))}
          </ul>
        </>
      ) : filtered ? (
        <EmptyState
          title="No matches with these filters"
          action={
            <Link href="/matches" className={buttonClasses({ variant: "outline" })}>
              Show all matches
            </Link>
          }
        />
      ) : (
        <EmptyState
          title="No matches yet"
          description="As more students join and add skills, matches will show up here. Adding more skills and interests helps."
          action={
            <Link href="/profile" className={buttonClasses({ variant: "outline" })}>
              Edit your skills
            </Link>
          }
        />
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-center gap-3">
          {filters.page > 1 && (
            <Link href={matchesHref({ ...filters, page: filters.page - 1 })} className={buttonClasses({ variant: "outline", size: "sm" })}>
              ← Previous
            </Link>
          )}
          <span className="text-sm text-gray-600">
            Page {filters.page} of {pages}
          </span>
          {filters.page < pages && (
            <Link href={matchesHref({ ...filters, page: filters.page + 1 })} className={buttonClasses({ variant: "outline", size: "sm" })}>
              Next →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
