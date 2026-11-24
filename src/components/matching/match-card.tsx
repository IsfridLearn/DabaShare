import Link from "next/link";
import { FollowButton } from "@/components/feed/follow-button";
import { MessageButton } from "@/components/messages/message-button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/primitives";
import { isSkillSwap, matchReasons } from "@/lib/matching/filters";
import type { Match } from "@/lib/matching/queries";

// One person in the People list. The reasons read as sentences, so a match
// explains itself without a wall of coloured tags.
export function MatchRow({ match, following }: { match: Match; following: boolean }) {
  const reasons = matchReasons(match);
  const swap = isSkillSwap(match);
  const meta = [match.program, match.university_short].filter(Boolean).join(" · ");

  return (
    <article aria-labelledby={`match-${match.profile_id}`} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:gap-4 sm:px-5">
      <div className="flex min-w-0 flex-1 gap-3">
        <Link href={`/u/${match.username}`} className="shrink-0 self-start rounded-full" tabIndex={-1} aria-hidden="true">
          <Avatar name={match.display_name} path={match.avatar_path} size={44} />
        </Link>
        <div className="min-w-0 flex-1">
          <h2 id={`match-${match.profile_id}`} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body">
            <Link href={`/u/${match.username}`} className="font-semibold text-fg hover:underline">
              {match.display_name}
            </Link>
            {swap && <Badge tone="brand">Skill swap</Badge>}
          </h2>
          <p className="truncate text-small text-fg-subtle">
            {meta || `@${match.username}`}
            {match.published_courses > 0 &&
              ` · ${match.published_courses} course${match.published_courses === 1 ? "" : "s"}`}
          </p>
          {reasons.length > 0 && (
            <dl className="mt-2 flex flex-col gap-0.5 text-small">
              {reasons.map((reason) => (
                <div key={reason.label} className="flex flex-wrap gap-x-1.5">
                  <dt className={reason.tone === "neutral" ? "text-fg-subtle" : "font-medium text-fg"}>{reason.label}</dt>
                  <dd className="text-fg-muted">{reason.items.join(", ")}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </div>
      <div className="flex shrink-0 items-start gap-2 pl-14 sm:pl-0">
        <FollowButton profileId={match.profile_id} following={following} name={match.display_name} />
        <MessageButton otherId={match.profile_id} variant="secondary" />
      </div>
    </article>
  );
}
