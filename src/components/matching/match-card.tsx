import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { Tag } from "@/components/ui/tag";
import { isSkillSwap, matchReasons } from "@/lib/matching/filters";
import type { Match } from "@/lib/matching/queries";

export function MatchCard({ match }: { match: Match }) {
  const reasons = matchReasons(match);
  const swap = isSkillSwap(match);

  return (
    <article className="flex h-full flex-col gap-4 rounded-card border border-gray-200 bg-white p-5 shadow-card">
      <header className="flex items-start gap-3">
        <Avatar name={match.display_name} path={match.avatar_path} size={52} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-semibold">
            <Link href={`/u/${match.username}`} className="hover:text-brand">
              {match.display_name}
            </Link>
          </h3>
          <p className="truncate text-sm text-gray-500">
            {[match.program, match.university_short].filter(Boolean).join(" · ") || `@${match.username}`}
          </p>
        </div>
        {swap && (
          <Tag tone="paid" className="shrink-0 text-xs font-semibold">
            Skill swap
          </Tag>
        )}
      </header>

      <dl className="flex flex-col gap-3">
        {reasons.map((reason) => (
          <div key={reason.label}>
            <dt className="mb-1.5 text-xs font-semibold tracking-wide text-gray-500 uppercase">{reason.label}</dt>
            <dd className="flex flex-wrap gap-1.5">
              {reason.items.map((item) => (
                <Tag key={item} tone={reason.tone} className="px-2.5 py-0.5 text-xs">
                  {item}
                </Tag>
              ))}
            </dd>
          </div>
        ))}
      </dl>

      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-gray-100 pt-3">
        <span className="text-sm text-gray-500">
          {match.published_courses > 0
            ? `${match.published_courses} course${match.published_courses === 1 ? "" : "s"} offered`
            : "No courses yet"}
        </span>
        <Link href={`/u/${match.username}`} className={buttonClasses({ variant: "outline", size: "sm" })}>
          View profile
        </Link>
      </footer>
    </article>
  );
}
