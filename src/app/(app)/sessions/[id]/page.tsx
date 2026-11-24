import { ExternalLink, Flag, Pencil } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageButton } from "@/components/messages/message-button";
import { CancelSessionForm, InviteForm, ParticipantList } from "@/components/sessions/host-panel";
import { ParticipationPanel } from "@/components/sessions/participation-panel";
import { LiveDot } from "@/components/sessions/session-card";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { BackLink, Badge, PanelSection, Properties } from "@/components/ui/primitives";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getMeetingUrl, getMyParticipation, getParticipants, getSession } from "@/lib/sessions/queries";
import { clockRange, durationLabel, sessionDay, sessionPhase, typeLabel } from "@/lib/sessions/validation";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Session" };

const NOTICES: Record<string, { tone: "success" | "error" | "info"; text: string }> = {
  created: { tone: "success", text: "Your session is scheduled." },
  updated: { tone: "success", text: "Changes saved. If the time changed, participants were notified." },
  cancelled: { tone: "info", text: "The session was cancelled and participants were notified." },
  "link-failed": { tone: "error", text: "The session was saved, but the meeting link wasn't. Edit the session to add it." },
};

export default async function SessionPage({ params, searchParams }: PageProps<"/sessions/[id]">) {
  const me = await requireOnboardedProfile();
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const session = await getSession(id);
  if (!session) notFound();

  const isHost = session.host_id === me.id;
  const phase = sessionPhase(session);
  // The link is only useful (and only sent to the browser) while the session can still happen.
  const active = phase === "upcoming" || phase === "live";
  const [participation, meetingUrl, participants] = await Promise.all([
    isHost ? null : getMyParticipation(session.id, me.id),
    active ? getMeetingUrl(session.id) : null,
    isHost ? getParticipants(session.id) : [],
  ]);
  const minutes = Math.round((new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 60000);
  const full = session.accepted_count >= session.capacity;
  const notice = typeof query.notice === "string" ? NOTICES[query.notice] : undefined;
  const editable = isHost && (phase === "upcoming" || phase === "live");
  const day = sessionDay(session.starts_at);
  const time = clockRange(session.starts_at, session.ends_at);

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <BackLink href="/sessions">All sessions</BackLink>
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <article className="flex min-w-0 flex-col">
          <p className="flex flex-wrap items-center gap-2 text-small text-fg-subtle">
            {phase === "live" && (
              <Badge tone="danger">
                <LiveDot />
                Live now
              </Badge>
            )}
            {phase === "cancelled" && <Badge>Cancelled</Badge>}
            {phase === "ended" && <Badge>Ended</Badge>}
            <span>
              {typeLabel(session.type)}
              {session.category && ` · ${session.category.name}`}
            </span>
          </p>
          <h1 className="mt-2 text-title break-words sm:text-display">{session.title}</h1>
          <p className="mt-3 text-fg-muted">
            {day.label} · {time} <span className="text-fg-subtle">(PH time)</span>
          </p>

          {session.description && (
            <div className="mt-8 border-t border-line pt-8">
              <h2 className="sr-only">About this session</h2>
              <p className="max-w-[68ch] text-[1rem] leading-7 break-words whitespace-pre-line text-fg">{session.description}</p>
            </div>
          )}
        </article>

        <aside className="flex flex-col gap-6 lg:sticky lg:top-10 lg:self-start" aria-label="Session details">
          <section className="flex flex-col gap-4 rounded-card border border-line bg-surface p-5">
            {isHost ? (
              <>
                <h2 className="text-heading">Your session</h2>
                {meetingUrl ? (
                  <a
                    href={meetingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-w-0 items-center gap-1.5 text-small font-medium text-brand-ink hover:underline"
                  >
                    <span className="truncate">{meetingUrl}</span>
                    <ExternalLink className="size-3.5 shrink-0" aria-hidden="true" />
                  </a>
                ) : (
                  <p className="text-small text-fg-muted">No meeting link yet. Participants see it once you add one.</p>
                )}
                {editable && (
                  <Link href={`/sessions/${session.id}/edit`} className={buttonClasses({ variant: "secondary", fullWidth: true })}>
                    <Pencil className="size-4" aria-hidden="true" />
                    Edit session
                  </Link>
                )}
              </>
            ) : (
              <>
                <h2 className="text-heading">{phase === "live" ? "Happening now" : "Join"}</h2>
                <ParticipationPanel
                  sessionId={session.id}
                  phase={phase}
                  status={participation?.status ?? null}
                  invitedBy={participation?.invited_by ?? null}
                  full={full}
                  requiresApproval={session.requires_approval}
                  meetingUrl={meetingUrl}
                />
              </>
            )}
          </section>

          <Properties
            className="px-1"
            items={[
              { label: "When", value: `${day.weekday}, ${day.month} ${day.day}` },
              { label: "Time", value: time },
              { label: "Duration", value: durationLabel(minutes) },
              { label: "Seats", value: `${session.accepted_count}/${session.capacity} joined${full ? " · full" : ""}` },
              { label: "Joining", value: session.requires_approval ? "Host approves" : "Open" },
            ]}
          />

          {session.host && (
            <section className="flex flex-col gap-3 border-t border-line px-1 pt-6">
              <h2 className="text-small font-semibold text-fg">Host</h2>
              <Link href={`/u/${session.host.username}`} className="group flex items-center gap-3">
                <Avatar name={session.host.display_name} path={session.host.avatar_path} size={40} />
                <span className="truncate font-medium text-fg group-hover:underline">{session.host.display_name}</span>
              </Link>
              {!isHost && (
                <div className="flex flex-wrap items-center gap-3">
                  <MessageButton otherId={session.host.id} variant="secondary" size="sm" />
                  <Link
                    href={`/report?type=session&id=${session.id}`}
                    className="inline-flex items-center gap-1.5 text-small text-fg-subtle hover:text-danger-ink"
                  >
                    <Flag className="size-3.5" aria-hidden="true" />
                    Report session
                  </Link>
                </div>
              )}
            </section>
          )}
        </aside>
      </div>

      {isHost && (
        <div className="mt-4 border-t border-line">
          <PanelSection title="Participants" description="Accept requests, remove people, and see who you invited.">
            <ParticipantList sessionId={session.id} participants={participants} />
          </PanelSection>
          {editable && (
            <>
              <PanelSection title="Invite" description="Invited students get a notification and can accept or decline.">
                <InviteForm sessionId={session.id} />
              </PanelSection>
              <PanelSection title="Cancel session" tone="danger" description="This can't be undone.">
                <CancelSessionForm sessionId={session.id} />
              </PanelSection>
            </>
          )}
        </div>
      )}
    </div>
  );
}
