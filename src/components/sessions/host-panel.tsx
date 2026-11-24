"use client";

import Link from "next/link";
import { useActionState } from "react";
import { cancelSession, decideParticipant, inviteToSession } from "@/lib/sessions/actions";
import type { Participant } from "@/lib/sessions/queries";
import { initialFormState } from "@/lib/forms";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/field";
import { errorProps, fieldError, FormMessage } from "@/components/ui/form-message";
import { RowList } from "@/components/ui/primitives";

const emptyBox = "rounded-card border border-dashed border-line-strong px-4 py-4 text-small text-fg-subtle";
const heading = "mb-2 text-small font-semibold text-fg";

function Person({ p }: { p: Participant }) {
  if (!p.person) return <span className="text-small text-fg-subtle">Student unavailable</span>;
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={p.person.display_name} path={p.person.avatar_path} size={28} />
      <Link href={`/u/${p.person.username}`} className="truncate font-medium text-fg hover:underline">
        {p.person.display_name}
      </Link>
      {p.person.university && <span className="shrink-0 text-small text-fg-subtle">{p.person.university.short_name}</span>}
    </span>
  );
}

export function ParticipantList({ sessionId, participants }: { sessionId: string; participants: Participant[] }) {
  const requests = participants.filter((p) => p.status === "requested");
  const going = participants.filter((p) => p.status === "accepted");
  const invited = participants.filter((p) => p.status === "invited");

  return (
    <div className="flex flex-col gap-5">
      <section>
        <h3 className={heading}>Requests ({requests.length})</h3>
        {requests.length ? (
          <RowList>
            {requests.map((p) => (
              <li key={p.profile_id} className="flex flex-wrap items-center gap-2 px-4 py-2.5">
                <Person p={p} />
                <div className="ml-auto flex gap-2">
                  <form action={decideParticipant.bind(null, sessionId, p.profile_id, "accepted")}>
                    <Button type="submit" size="sm">
                      Accept
                    </Button>
                  </form>
                  <form action={decideParticipant.bind(null, sessionId, p.profile_id, "declined")}>
                    <Button type="submit" size="sm" variant="secondary">
                      Decline
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </RowList>
        ) : (
          <p className={emptyBox}>No pending requests.</p>
        )}
      </section>
      <section>
        <h3 className={heading}>Going ({going.length})</h3>
        {going.length ? (
          <RowList>
            {going.map((p) => (
              <li key={p.profile_id} className="flex items-center gap-2 px-4 py-2.5">
                <Person p={p} />
                <form action={decideParticipant.bind(null, sessionId, p.profile_id, "declined")} className="ml-auto">
                  <Button type="submit" size="sm" variant="ghost">
                    Remove
                  </Button>
                </form>
              </li>
            ))}
          </RowList>
        ) : (
          <p className={emptyBox}>Nobody has joined yet.</p>
        )}
      </section>
      {invited.length > 0 && (
        <section>
          <h3 className={heading}>Invited, waiting for an answer ({invited.length})</h3>
          <RowList>
            {invited.map((p) => (
              <li key={p.profile_id} className="px-4 py-2.5">
                <Person p={p} />
              </li>
            ))}
          </RowList>
        </section>
      )}
    </div>
  );
}

export function InviteForm({ sessionId }: { sessionId: string }) {
  const [state, action, pending] = useActionState(inviteToSession.bind(null, sessionId), initialFormState);
  return (
    <form action={action} className="flex flex-col gap-2" noValidate>
      <FormMessage state={state} />
      <label htmlFor="invite-username" className="text-small font-medium text-fg">
        Invite a student by username
      </label>
      <div className="flex gap-2">
        <Input
          id="invite-username"
          name="username"
          placeholder="@username"
          autoCapitalize="none"
          defaultValue={state.status === "error" ? state.values?.username : ""}
          {...errorProps(state, "username")}
          aria-describedby={fieldError(state, "username") ? "username-message" : undefined}
        />
        <Button type="submit" variant="secondary" loading={pending}>
          {pending ? "Inviting…" : "Invite"}
        </Button>
      </div>
      {fieldError(state, "username") && (
        <p id="username-message" className="text-small text-danger-ink">
          {fieldError(state, "username")}
        </p>
      )}
    </form>
  );
}

export function CancelSessionForm({ sessionId }: { sessionId: string }) {
  const [state, action, pending] = useActionState(cancelSession.bind(null, sessionId), initialFormState);
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormMessage state={state} />
      <label className="flex items-start gap-2.5 text-small text-fg-muted">
        <input type="checkbox" name="confirm" className="mt-0.5 size-4 accent-danger" />
        Cancel this session. Everyone who joined, requested or was invited gets a notification.
      </label>
      <div>
        <Button type="submit" variant="danger" size="sm" loading={pending}>
          {pending ? "Cancelling…" : "Cancel session"}
        </Button>
      </div>
    </form>
  );
}
