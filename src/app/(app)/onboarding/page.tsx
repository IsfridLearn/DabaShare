import { redirect } from "next/navigation";
import { ProfileForm } from "@/components/profile/profile-form";
import { Card } from "@/components/ui/card";
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
    <div className="mx-auto max-w-2xl">
      <h1 className="text-2xl font-bold">Set up your profile</h1>
      <p className="mt-1.5 mb-6 text-gray-600">
        Pick a username so other students can find you. You can add your skills on the next page.
      </p>
      <Card>
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
      </Card>
    </div>
  );
}
