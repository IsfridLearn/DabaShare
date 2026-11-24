"use client";

import { ExternalLink } from "lucide-react";
import { useActionState } from "react";
import { joinSession, respondToSession } from "@/lib/sessions/actions";
import type { ParticipantStatus, SessionPhase } from "@/lib/sessions/validation";
import { initialFormState } from "@/lib/forms";
import { Alert } from "@/components/ui/alert";
import { Button, buttonClasses } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";

export function ParticipationPanel({
  sessionId,
  phase,
  status,
  invitedBy,
  full,
  requiresApproval,
  meetingUrl,
}: {
  sessionId: string;
  phase: SessionPhase;
  status: ParticipantStatus | null;
  invitedBy: string | null;
  full: boolean;
  requiresApproval: boolean;
  meetingUrl: string | null;
}) {
  const [state, join, pending] = useActionState(joinSession.bind(null, sessionId), initialFormState);

  if (phase === "cancelled") return <Alert tone="info">This session was cancelled by the host.</Alert>;
  if (phase === "ended") return <Alert tone="info">This session has ended.</Alert>;

  if (status === "accepted") {
    return (
      <div className="flex flex-col gap-3">
        <Alert tone="success">You&apos;re going{phase === "live" ? ", and it's happening now" : ""}.</Alert>
        {meetingUrl ? (
          <a
            href={meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ size: "lg", fullWidth: true })}
          >
            {phase === "live" ? "Join the meeting now" : "Open meeting link"}
            <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        ) : (
          <p className="text-small text-fg-muted">The host hasn&apos;t added a meeting link yet.</p>
        )}
        <form action={respondToSession.bind(null, sessionId, "cancelled")}>
          <Button type="submit" variant="ghost" size="sm">
            I can&apos;t make it (leave)
          </Button>
        </form>
      </div>
    );
  }

  if (status === "invited") {
    return (
      <div className="flex flex-col gap-3">
        <Alert tone="info">You&apos;ve been invited to this session.</Alert>
        <div className="flex gap-2">
          <form action={respondToSession.bind(null, sessionId, "accepted")}>
            <Button type="submit" disabled={full}>
              Accept invitation
            </Button>
          </form>
          <form action={respondToSession.bind(null, sessionId, "declined")}>
            <Button type="submit" variant="secondary">
              Decline
            </Button>
          </form>
        </div>
        {full && <p className="text-small text-fg-subtle">The session is full right now.</p>}
      </div>
    );
  }

  if (status === "requested") {
    return (
      <div className="flex flex-col gap-3">
        <Alert tone="info">Request sent. The host will accept or decline it, and you&apos;ll get a notification.</Alert>
        <form action={respondToSession.bind(null, sessionId, "cancelled")}>
          <Button type="submit" variant="ghost" size="sm">
            Cancel request
          </Button>
        </form>
      </div>
    );
  }

  // Host declined you (an invitation you declined can still be accepted later).
  if (status === "declined" && !invitedBy) {
    return <Alert tone="info">The host declined your request for this session.</Alert>;
  }

  if (full && !requiresApproval) return <Alert tone="info">This session is full.</Alert>;

  return (
    <form action={join} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <Button type="submit" size="lg" fullWidth loading={pending}>
        {pending ? "Joining…" : requiresApproval ? "Request to join" : "Join session"}
      </Button>
      {requiresApproval && <p className="text-small text-fg-subtle">The host approves who joins.</p>}
    </form>
  );
}
