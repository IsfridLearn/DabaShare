import Link from "next/link";
import { FollowButton } from "@/components/feed/follow-button";
import { MessageButton } from "@/components/messages/message-button";
import { Avatar } from "@/components/ui/avatar";
import type { Match } from "@/lib/matching/queries";

// One person in the directory. The reason you match leads, in a sentence,
// with the skills in the brand blue; everything else stays quiet.
export function MatchRow({ match, following }: { match: Match; following: boolean }) {
  const meta = [match.program, match.university_short].filter(Boolean).join(" · ");
  const extras = [
    match.shared_interests.length ? `Also into ${match.shared_interests.join(", ")}` : null,
    match.published_courses > 0 ? `${match.published_courses} course${match.published_courses === 1 ? "" : "s"} on DabaShare` : null,
  ].filter(Boolean);

  return (
    <article aria-labelledby={`match-${match.profile_id}`} className="flex flex-col gap-4 py-5 sm:flex-row sm:items-start sm:gap-5">
      <div className="flex min-w-0 flex-1 gap-4">
        <Link href={`/u/${match.username}`} className="shrink-0 self-start rounded-full" tabIndex={-1} aria-hidden="true">
          <Avatar name={match.display_name} path={match.avatar_path} size={40} />
        </Link>
        <div className="min-w-0 flex-1">
          <h3 id={`match-${match.profile_id}`} className="leading-tight">
            <Link href={`/u/${match.username}`} className="text-[1.0625rem] font-semibold text-fg hover:underline">
              {match.display_name}
            </Link>
          </h3>
          <p className="mt-0.5 truncate text-small text-fg-subtle">{meta || `@${match.username}`}</p>

          {(match.teaches_you.length > 0 || match.learns_from_you.length > 0) && (
            <dl className="mt-3 flex flex-col gap-1">
              {match.teaches_you.length > 0 && <Reason label="Can teach you" items={match.teaches_you} />}
              {match.learns_from_you.length > 0 && <Reason label="Wants to learn from you" items={match.learns_from_you} />}
            </dl>
          )}
          {extras.length > 0 && <p className="mt-2 text-small text-fg-subtle">{extras.join(" · ")}</p>}
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-2 pl-14 sm:pl-0">
        <MessageButton otherId={match.profile_id} variant="secondary" />
        <FollowButton profileId={match.profile_id} following={following} name={match.display_name} quiet />
      </div>
    </article>
  );
}

function Reason({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="flex flex-wrap gap-x-1.5">
      <dt className="text-fg-muted">{label}</dt>
      <dd className="font-medium text-brand-ink">{items.join(", ")}</dd>
    </div>
  );
}
