import { Check, Users } from "lucide-react";
import Link from "next/link";
import { MatchRow } from "@/components/matching/match-card";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Chip, PageHeader, Pagination, RowList } from "@/components/ui/primitives";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getFollowingIds } from "@/lib/feed/queries";
import { MATCH_MODES, MATCH_PAGE_SIZE, matchesHref, parseMatchFilters } from "@/lib/matching/filters";
import { getMatches, getMyMatchingInputs } from "@/lib/matching/queries";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "People" };

export default async function MatchesPage({ searchParams }: PageProps<"/matches">) {
  const me = await requireOnboardedProfile();
  const filters = parseMatchFilters(await searchParams);
  const [{ matches, total }, inputs, following] = await Promise.all([
    getMatches(filters),
    getMyMatchingInputs(me.id),
    getFollowingIds(me.id),
  ]);
  const noInputs = inputs.teach + inputs.learn + inputs.interests === 0;
  const filtered = Boolean(filters.mode || filters.sameUni);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader
        title="People"
        description="Students who can teach what you want to learn, and want to learn what you can teach. Skill swaps, where you can help each other, come first."
      />

      {!noInputs && (inputs.teach === 0 || inputs.learn === 0) && (
        <Alert tone="info">
          Add {inputs.teach === 0 ? "skills you can teach" : "skills you want to learn"} to{" "}
          <Link href="/profile#skills" className="font-medium underline underline-offset-2">
            your profile
          </Link>{" "}
          to find skill swaps.
        </Alert>
      )}

      <nav aria-label="Filter matches" className="flex flex-wrap items-center gap-2">
        {MATCH_MODES.map((m) => (
          <Chip key={m.label} href={matchesHref({ ...filters, mode: m.value, page: 1 })} active={filters.mode === m.value}>
            {m.label}
          </Chip>
        ))}
        <span aria-hidden="true" className="mx-1 h-5 w-px bg-line-strong" />
        <Chip href={matchesHref({ ...filters, sameUni: !filters.sameUni, page: 1 })} active={filters.sameUni}>
          {filters.sameUni && <Check className="size-3.5" aria-hidden="true" />}
          My university only
        </Chip>
        {!noInputs && matches.length > 0 && (
          <p className="text-small text-fg-subtle sm:ml-auto" aria-live="polite">
            {total === 1 ? "1 match" : `${total} matches`}
          </p>
        )}
      </nav>

      {noInputs ? (
        <EmptyState
          icon={<Users className="size-5" />}
          title="Tell us what you know and what you want to learn"
          description="Matches are based on your skills and interests. Add a few to your profile and come back."
          action={
            <Link href="/profile#skills" className={buttonClasses()}>
              Add skills
            </Link>
          }
        />
      ) : matches.length ? (
        <RowList label="Matches">
          {matches.map((match) => (
            <li key={match.profile_id}>
              <MatchRow match={match} following={following.has(match.profile_id)} />
            </li>
          ))}
        </RowList>
      ) : filtered ? (
        <EmptyState
          icon={<Users className="size-5" />}
          title="No matches with these filters"
          action={
            <Link href="/matches" className={buttonClasses({ variant: "secondary" })}>
              Show all matches
            </Link>
          }
        />
      ) : (
        <EmptyState
          icon={<Users className="size-5" />}
          title="No matches yet"
          description="As more students join and add skills, matches will show up here. Adding more skills and interests helps."
          action={
            <Link href="/profile#skills" className={buttonClasses({ variant: "secondary" })}>
              Edit your skills
            </Link>
          }
        />
      )}

      <Pagination page={filters.page} pages={Math.ceil(total / MATCH_PAGE_SIZE)} hrefFor={(page) => matchesHref({ ...filters, page })} />
    </div>
  );
}
