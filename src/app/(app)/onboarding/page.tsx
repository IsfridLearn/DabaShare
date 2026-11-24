import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/profile-form";
import { PageHeader } from "@/components/ui/primitives";
import { getMyProfile, requireUser } from "@/lib/auth/session";
import { completeOnboarding } from "@/lib/profile/actions";
import { getUniversities } from "@/lib/reference";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Set up your profile" };

export default async function OnboardingPage() {
  await requireUser();
  const [profile, universities] = await Promise.all([getMyProfile(), getUniversities()]);
  if (!profile) redirect("/auth/signout");
  if (profile.onboarded_at) redirect("/profile");

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <PageHeader
        eyebrow="Step 1 of 2"
        title="Set up your profile"
        description="Pick a username so other students can find you. You can add your skills on the next page."
      />
        <ProfileForm
          action={completeOnboarding}
          universities={universities}
          submitLabel="Continue"
          defaults={{
            username: "",
            displayName: profile.display_name,
            universityId: profile.university_id ? String(profile.university_id) : "",
            program: profile.program ?? "",
            bio: profile.bio ?? "",
          }}
        />
    </div>
  );
}
