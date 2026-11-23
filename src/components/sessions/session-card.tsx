import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Tag } from "@/components/ui/tag";
import type { SessionListItem } from "@/lib/sessions/queries";
import { formatSessionTime, sessionPhase, typeLabel } from "@/lib/sessions/validation";

const MY_STATUS: Record<string, string> = {
  accepted: "You're going",
  requested: "Request sent",
  invited: "You're invited",
};

export function SessionCard({ session, meId }: { session: SessionListItem; meId: string }) {
  const phase = sessionPhase(session);
  const full = session.accepted_count >= session.capacity;
  const mine = session.host_id === meId;
  const myStatus = session.my_status ? MY_STATUS[session.my_status] : undefined;

  return (
    <Link
      href={`/sessions/${session.id}`}
      className="group flex h-full flex-col gap-3 rounded-card border border-gray-200 bg-white p-5 shadow-card transition hover:-translate-y-0.5 motion-reduce:transform-none hover:border-blue-200 hover:shadow-card-lg focus-visible:outline-2 focus-visible:outline-brand"
    >
      <div className="flex flex-wrap items-center gap-2">
        {phase === "live" ? (
          <Tag className="bg-red-100 font-semibold text-red-700">● Live now</Tag>
        ) : (
          <Tag tone={session.type === "webinar" ? "paid" : "learn"}>{typeLabel(session.type)}</Tag>
        )}
        {phase === "cancelled" && <Tag className="bg-gray-200 text-gray-700">Cancelled</Tag>}
        {phase === "ended" && <Tag>Ended</Tag>}
        {mine && <Tag tone="teach">You&apos;re hosting</Tag>}
        {!mine && myStatus && <Tag tone="teach">{myStatus}</Tag>}
        {!mine && !myStatus && full && phase !== "cancelled" && <Tag>Full</Tag>}
      </div>
      <h2 className="text-base leading-snug font-semibold group-hover:text-brand">{session.title}</h2>
      <p className="text-sm text-gray-600">🗓 {formatSessionTime(session.starts_at, session.ends_at)}</p>
      {session.description && <p className="line-clamp-2 text-sm text-gray-600">{session.description}</p>}
      <div className="mt-auto flex items-center gap-2 border-t border-gray-100 pt-3 text-sm">
        <Avatar name={session.host_name} path={session.host_avatar} size={24} />
        <span className="truncate text-gray-700">{session.host_name}</span>
        <span className="ml-auto shrink-0 text-gray-500">
          {session.accepted_count}/{session.capacity} joined
        </span>
      </div>
    </Link>
  );
}
