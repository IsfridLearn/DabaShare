import { emptySession, SessionForm } from "@/components/sessions/session-form";
import { Card } from "@/components/ui/card";
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
      <div>
        <h1 className="text-2xl font-bold">Host a webinar or study group</h1>
        <p className="mt-1.5 text-gray-600">Times are in Philippine time. You can add or change the meeting link later.</p>
      </div>
      <Card>
        <SessionForm action={createSession} defaults={emptySession} categories={categories} submitLabel="Schedule session" minDate={today} />
      </Card>
    </div>
  );
}
