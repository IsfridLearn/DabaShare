import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageButton } from "@/components/messages/message-button";
import { CancelSessionForm, InviteForm, ParticipantList } from "@/components/sessions/host-panel";
import { ParticipationPanel } from "@/components/sessions/participation-panel";
import { Alert } from "@/components/ui/alert";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getMeetingUrl, getMyParticipation, getParticipants, getSession } from "@/lib/sessions/queries";
import { durationLabel, formatSessionTime, sessionPhase, typeLabel } from "@/lib/sessions/validation";

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

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <Link href="/sessions" className="text-sm font-medium text-brand hover:underline">
        ← All sessions
      </Link>
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card className="flex flex-col gap-5">
          <div className="flex flex-wrap items-center gap-2">
            {phase === "live" && <Tag className="bg-red-100 font-semibold text-red-700">● Live now</Tag>}
            {phase === "cancelled" && <Tag className="bg-gray-200 text-gray-700">Cancelled</Tag>}
            {phase === "ended" && <Tag>Ended</Tag>}
            <Tag tone={session.type === "webinar" ? "paid" : "learn"}>{typeLabel(session.type)}</Tag>
            {session.category && <Tag>{session.category.name}</Tag>}
          </div>
          <h1 className="text-2xl font-bold break-words sm:text-3xl">{session.title}</h1>
          <dl className="grid gap-3 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-gray-500">When (PH time)</dt>
              <dd className="font-medium text-gray-900">{formatSessionTime(session.starts_at, session.ends_at)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Duration</dt>
              <dd className="font-medium text-gray-900">{durationLabel(minutes)}</dd>
            </div>
            <div>
              <dt className="text-gray-500">Seats</dt>
              <dd className="font-medium text-gray-900">
                {session.accepted_count}/{session.capacity} joined{full ? " · full" : ""}
              </dd>
            </div>
          </dl>
          {session.description && <p className="leading-relaxed break-words whitespace-pre-line text-gray-700">{session.description}</p>}
        </Card>

        <div className="flex flex-col gap-6">
          {session.host && (
            <Card className="flex flex-col gap-3">
              <h2 className="text-sm font-semibold text-gray-500">Host</h2>
              <Link href={`/u/${session.host.username}`} className="flex items-center gap-3 hover:text-brand">
                <Avatar name={session.host.display_name} path={session.host.avatar_path} size={44} />
                <span className="font-semibold">{session.host.display_name}</span>
              </Link>
              {!isHost && (
                <div className="flex flex-wrap items-center gap-2">
                  <MessageButton otherId={session.host.id} variant="outline" />
                  <Link href={`/report?type=session&id=${session.id}`} className="text-sm text-gray-500 hover:text-danger">
                    Report session
                  </Link>
                </div>
              )}
            </Card>
          )}

          <Card className="order-first flex flex-col gap-4 lg:order-none">
            {isHost ? (
              <>
                <h2 className="text-lg font-semibold">Your session</h2>
                {meetingUrl ? (
                  <a href={meetingUrl} target="_blank" rel="noopener noreferrer" className="block truncate text-sm font-medium text-brand hover:underline">
                    {meetingUrl} ↗
                  </a>
                ) : (
                  <p className="text-sm text-gray-500">No meeting link yet. Participants see it once you add one.</p>
                )}
                {editable && (
                  <Link href={`/sessions/${session.id}/edit`} className={buttonClasses({ variant: "outline", fullWidth: true })}>
                    Edit session
                  </Link>
                )}
              </>
            ) : (
              <>
                <h2 className="text-lg font-semibold">{phase === "live" ? "Happening now" : "Join"}</h2>
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
          </Card>
        </div>
      </div>

      {isHost && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Card>
            <h2 className="mb-4 text-lg font-semibold">Participants</h2>
            <ParticipantList sessionId={session.id} participants={participants} />
          </Card>
          {editable && (
            <div className="flex flex-col gap-6">
              <Card>
                <InviteForm sessionId={session.id} />
              </Card>
              <Card className="border-red-200">
                <h2 className="mb-3 text-lg font-semibold text-danger">Cancel session</h2>
                <CancelSessionForm sessionId={session.id} />
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
