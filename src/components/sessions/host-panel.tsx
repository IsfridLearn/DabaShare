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

function Person({ p }: { p: Participant }) {
  if (!p.person) return <span className="text-sm text-gray-500">Student unavailable</span>;
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={p.person.display_name} path={p.person.avatar_path} size={32} />
      <Link href={`/u/${p.person.username}`} className="truncate font-medium text-gray-900 hover:text-brand">
        {p.person.display_name}
      </Link>
      {p.person.university && <span className="shrink-0 text-sm text-gray-500">{p.person.university.short_name}</span>}
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
        <h3 className="mb-2 text-base font-semibold">Requests ({requests.length})</h3>
        {requests.length ? (
          <ul className="divide-y divide-gray-100">
            {requests.map((p) => (
              <li key={p.profile_id} className="flex flex-wrap items-center gap-2 py-2.5">
                <Person p={p} />
                <div className="ml-auto flex gap-2">
                  <form action={decideParticipant.bind(null, sessionId, p.profile_id, "accepted")}>
                    <Button type="submit" size="sm">
                      Accept
                    </Button>
                  </form>
                  <form action={decideParticipant.bind(null, sessionId, p.profile_id, "declined")}>
                    <Button type="submit" size="sm" variant="outline">
                      Decline
                    </Button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">No pending requests.</p>
        )}
      </section>
      <section>
        <h3 className="mb-2 text-base font-semibold">Going ({going.length})</h3>
        {going.length ? (
          <ul className="divide-y divide-gray-100">
            {going.map((p) => (
              <li key={p.profile_id} className="flex items-center gap-2 py-2.5">
                <Person p={p} />
                <form action={decideParticipant.bind(null, sessionId, p.profile_id, "declined")} className="ml-auto">
                  <Button type="submit" size="sm" variant="ghost">
                    Remove
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-gray-500">Nobody has joined yet.</p>
        )}
      </section>
      {invited.length > 0 && (
        <section>
          <h3 className="mb-2 text-base font-semibold">Invited, waiting for an answer ({invited.length})</h3>
          <ul className="divide-y divide-gray-100">
            {invited.map((p) => (
              <li key={p.profile_id} className="py-2.5">
                <Person p={p} />
              </li>
            ))}
          </ul>
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
      <label htmlFor="invite-username" className="text-sm font-medium text-gray-700">
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
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Inviting…" : "Invite"}
        </Button>
      </div>
      {fieldError(state, "username") && (
        <p id="username-message" className="text-sm text-danger">
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
      <label className="flex items-start gap-2.5 text-sm text-gray-700">
        <input type="checkbox" name="confirm" className="mt-0.5 size-4 accent-danger" />
        Cancel this session. Everyone who joined, requested or was invited gets a notification.
      </label>
      <div>
        <Button type="submit" variant="danger" size="sm" disabled={pending}>
          {pending ? "Cancelling…" : "Cancel session"}
        </Button>
      </div>
    </form>
  );
}
