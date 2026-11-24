import { emptySession, SessionForm } from "@/components/sessions/session-form";
import { PageHeader } from "@/components/ui/primitives";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getCategories } from "@/lib/reference";
import { createSession } from "@/lib/sessions/actions";
import { isoToManila } from "@/lib/sessions/validation";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Host a session" };

export default async function NewSessionPage() {
  await requireOnboardedProfile();
  const categories = await getCategories();
  const today = isoToManila(new Date().toISOString()).date;

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader
        title="Host a session"
        description="A webinar or study group. Times are in Philippine time, and you can add or change the meeting link later."
      />
        <SessionForm action={createSession} defaults={emptySession} categories={categories} submitLabel="Schedule session" minDate={today} />
    </div>
  );
}
