import { notFound } from "next/navigation";
import { SessionForm } from "@/components/sessions/session-form";
import { BackLink, PageHeader } from "@/components/ui/primitives";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getCategories } from "@/lib/reference";
import { updateSession } from "@/lib/sessions/actions";
import { getMeetingUrl, getSession } from "@/lib/sessions/queries";
import { DURATIONS, isoToManila, sessionPhase } from "@/lib/sessions/validation";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Edit session" };

export default async function EditSessionPage({ params }: PageProps<"/sessions/[id]/edit">) {
  const me = await requireOnboardedProfile();
  const { id } = await params;
  const [session, categories] = await Promise.all([getSession(id), getCategories()]);
  if (!session || session.host_id !== me.id) notFound();
  const phase = sessionPhase(session);
  if (phase === "cancelled" || phase === "ended") notFound();

  const meetingUrl = await getMeetingUrl(session.id);
  const start = isoToManila(session.starts_at);
  const minutes = Math.round((new Date(session.ends_at).getTime() - new Date(session.starts_at).getTime()) / 60000);
  const duration = DURATIONS.reduce((best, d) => (Math.abs(d - minutes) < Math.abs(best - minutes) ? d : best), DURATIONS[0]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <BackLink href={`/sessions/${session.id}`}>Back to session</BackLink>
      <PageHeader title="Edit session" />
        <SessionForm
          action={updateSession.bind(null, session.id)}
          categories={categories}
          submitLabel="Save changes"
          minDate={isoToManila(new Date().toISOString()).date}
          defaults={{
            title: session.title,
            description: session.description,
            type: session.type,
            categoryId: session.category_id ? String(session.category_id) : "",
            date: start.date,
            time: start.time,
            duration: String(duration),
            capacity: String(session.capacity),
            requiresApproval: session.requires_approval,
            meetingUrl: meetingUrl ?? "",
          }}
        />
    </div>
  );
}
