import { Check, Users } from "lucide-react";
import Link from "next/link";
import { MatchRow } from "@/components/matching/match-card";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { GroupHeader, PageHeader, Pagination, Segmented } from "@/components/ui/primitives";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { getFollowingIds } from "@/lib/feed/queries";
import { isSkillSwap, MATCH_MODES, MATCH_PAGE_SIZE, matchesHref, parseMatchFilters } from "@/lib/matching/filters";
import { getMatches, getMyMatchingInputs, type Match } from "@/lib/matching/queries";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "People" };

const SHORT: Record<string, string> = {
  "All matches": "All",
  "Can teach me": "Teach me",
  "Want to learn from me": "Learn from me",
};

// The directory: who can teach you and who wants to learn from you. Skill
// swaps (both at once) are grouped first, because they're the best matches.
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
  const swaps = matches.filter(isSkillSwap);
  const others = matches.filter((m) => !isSkillSwap(m));

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <PageHeader title="People" count={noInputs ? undefined : total} />

      {!noInputs && (inputs.teach === 0 || inputs.learn === 0) && (
        <Alert tone="info">
          Add {inputs.teach === 0 ? "skills you can teach" : "skills you want to learn"} to{" "}
          <Link href="/profile#skills" className="font-medium underline underline-offset-2">
            your profile
          </Link>{" "}
          to find skill swaps.
        </Alert>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <Segmented
          label="Filter matches"
          items={MATCH_MODES.map((m) => ({
            href: matchesHref({ ...filters, mode: m.value, page: 1 }),
            // Shorter labels on phones so all three fit.
            label: (
              <>
                <span className="sm:hidden">{SHORT[m.label] ?? m.label}</span>
                <span className="hidden sm:inline">{m.label}</span>
              </>
            ),
            active: filters.mode === m.value,
          }))}
        />
        <Link
          href={matchesHref({ ...filters, sameUni: !filters.sameUni, page: 1 })}
          aria-pressed={filters.sameUni}
          className="inline-flex h-8 items-center gap-2 rounded-control px-2 text-small font-medium text-fg-muted transition-colors duration-150 hover:bg-subtle hover:text-fg"
        >
          <span
            aria-hidden="true"
            className={cn(
              "flex size-4 items-center justify-center rounded-[3px] border",
              filters.sameUni ? "border-brand bg-brand text-white" : "border-line-strong bg-surface",
            )}
          >
            {filters.sameUni && <Check className="size-3" strokeWidth={3} />}
          </span>
          My university only
        </Link>
      </div>

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
        <div className="flex flex-col gap-8">
          {swaps.length > 0 && <Group id="swaps" title="Skill swaps" note="You can help each other" people={swaps} following={following} />}
          {others.length > 0 && (
            <Group id="others" title={swaps.length ? "More matches" : "Matches"} people={others} following={following} />
          )}
        </div>
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

function Group({
  id,
  title,
  note,
  people,
  following,
}: {
  id: string;
  title: string;
  note?: string;
  people: Match[];
  following: Set<string>;
}) {
  return (
    <section aria-labelledby={`${id}-title`}>
      <div className="flex items-baseline justify-between gap-3 border-b border-line pb-2">
        <GroupHeader id={`${id}-title`} count={people.length}>
          {title}
        </GroupHeader>
        {note && <span className="text-caption text-fg-subtle">{note}</span>}
      </div>
      <ul className="divide-y divide-line">
        {people.map((match) => (
          <li key={match.profile_id}>
            <MatchRow match={match} following={following.has(match.profile_id)} />
          </li>
        ))}
      </ul>
    </section>
  );
}
