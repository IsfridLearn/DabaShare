import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { DeleteAccountForm, DiscoverableForm } from "@/components/profile/settings-forms";
import { Card } from "@/components/ui/card";
import { getSessionUser, requireOnboardedProfile } from "@/lib/auth/session";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await requireOnboardedProfile();
  const user = await getSessionUser();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <Card className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Privacy</h2>
        <DiscoverableForm discoverable={profile.discoverable} />
      </Card>

      <Card className="flex flex-col gap-4">
        <div>
          <h2 className="text-lg font-semibold">Password</h2>
          {user?.email && <p className="mt-1 text-sm text-gray-600">Signed in as {user.email}</p>}
        </div>
        <ChangePasswordForm />
      </Card>

      <Card className="flex flex-col gap-4 border-red-200">
        <h2 className="text-lg font-semibold text-danger">Delete account</h2>
        <DeleteAccountForm />
      </Card>
    </div>
  );
}
