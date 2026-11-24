import { Users } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/primitives";
import type { SessionListItem } from "@/lib/sessions/queries";
import { clockRange, sessionDay, sessionPhase, typeLabel } from "@/lib/sessions/validation";

const MY_STATUS: Record<string, string> = {
  accepted: "You're going",
  requested: "Request sent",
  invited: "You're invited",
};

export function LiveDot() {
  return (
    <span aria-hidden="true" className="relative flex size-2">
      <span className="absolute inset-0 animate-ping rounded-full bg-danger opacity-60 motion-reduce:hidden" />
      <span className="relative size-2 rounded-full bg-danger" />
    </span>
  );
}

// One agenda row: a date tile, what and when, who hosts, how full.
export function SessionRow({ session, meId }: { session: SessionListItem; meId: string }) {
  const phase = sessionPhase(session);
  const full = session.accepted_count >= session.capacity;
  const mine = session.host_id === meId;
  const myStatus = session.my_status ? MY_STATUS[session.my_status] : undefined;
  const day = sessionDay(session.starts_at);

  return (
    <Link
      href={`/sessions/${session.id}`}
      className="group flex gap-4 px-4 py-4 transition-colors duration-150 hover:bg-subtle sm:px-5"
    >
      <span
        aria-hidden="true"
        className="flex w-12 shrink-0 flex-col items-center rounded-control border border-line bg-canvas py-1.5 leading-none"
      >
        <span className="text-[0.625rem] font-semibold tracking-wide text-fg-subtle uppercase">{day.month}</span>
        <span className="mt-1 font-serif text-[1.375rem] font-medium text-fg">{day.day}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          {phase === "live" && (
            <Badge tone="danger">
              <LiveDot />
              Live now
            </Badge>
          )}
          {phase === "cancelled" && <Badge>Cancelled</Badge>}
          {phase === "ended" && <Badge>Ended</Badge>}
          {mine && <Badge tone="brand">You&apos;re hosting</Badge>}
          {!mine && myStatus && <Badge tone="success">{myStatus}</Badge>}
          {!mine && !myStatus && full && phase !== "cancelled" && <Badge>Full</Badge>}
        </span>
        <span className="mt-1 block font-medium text-fg decoration-line-strong underline-offset-4 group-hover:underline">{session.title}</span>
        <span className="mt-0.5 block text-small text-fg-muted">
          {typeLabel(session.type)} · {day.weekday} {clockRange(session.starts_at, session.ends_at)}
        </span>
        <span className="mt-2 flex items-center gap-2 text-small text-fg-subtle">
          <Avatar name={session.host_name} path={session.host_avatar} size={18} />
          <span className="truncate">{session.host_name}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex shrink-0 items-center gap-1">
            <Users className="size-3.5" aria-hidden="true" />
            {session.accepted_count}/{session.capacity} joined
          </span>
        </span>
      </span>
    </Link>
  );
}
