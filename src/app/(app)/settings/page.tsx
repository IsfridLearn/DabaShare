import { ThemePicker } from "@/components/app/theme-picker";
import { ChangePasswordForm } from "@/components/auth/change-password-form";
import { DeleteAccountForm, DiscoverableForm } from "@/components/profile/settings-forms";
import { BlockedList } from "@/components/safety/blocked-list";
import { PageHeader, PanelSection } from "@/components/ui/primitives";
import { getSessionUser, requireOnboardedProfile } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const profile = await requireOnboardedProfile();
  const user = await getSessionUser();
  const supabase = await createClient();
  const { data: blocked } = await supabase.rpc("my_blocks");

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <PageHeader title="Settings" />

      <div>
        <PanelSection id="appearance" title="Appearance" description="Choose light or dark mode, or follow your device.">
          <ThemePicker />
        </PanelSection>

        <PanelSection id="privacy" title="Privacy" description="Control whether other students find you in matches.">
          <DiscoverableForm discoverable={profile.discoverable} />
        </PanelSection>

        <PanelSection
          id="blocked"
          title="Blocked students"
          description="Unblocking lets you see each other again. Enrollments and session places cancelled by the block aren't restored."
        >
          <BlockedList blocked={blocked ?? []} />
        </PanelSection>

        <PanelSection id="password" title="Password" description={user?.email ? `Signed in as ${user.email}` : undefined}>
          <div className="max-w-md">
            <ChangePasswordForm />
          </div>
        </PanelSection>

        <PanelSection id="delete" title="Delete account" tone="danger">
          <DeleteAccountForm />
        </PanelSection>
      </div>
    </div>
  );
}
