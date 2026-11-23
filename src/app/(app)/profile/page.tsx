import Link from "next/link";
import { notFound } from "next/navigation";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { InterestsForm } from "@/components/profile/interests-form";
import { ProfileForm } from "@/components/profile/profile-form";
import { SkillsEditor, SkillSuggestions } from "@/components/profile/skills-editor";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { updateProfile } from "@/lib/profile/actions";
import { profileCompleteness } from "@/lib/profile/completeness";
import { getProfileDetailsById, getSkillNames } from "@/lib/profile/queries";
import { getCategories, getUniversities } from "@/lib/reference";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "My profile" };

const NOTICES: Record<string, string> = {
  welcome:
    "Welcome to DabaShare! Add what you can teach and what you want to learn, then check Matches for learning partners.",
  "password-updated": "Your password has been updated.",
};

export default async function MyProfilePage({ searchParams }: PageProps<"/profile">) {
  const me = await requireOnboardedProfile();
  const [details, universities, categories, skillNames, params] = await Promise.all([
    getProfileDetailsById(me.id),
    getUniversities(),
    getCategories(),
    getSkillNames(),
    searchParams,
  ]);
  if (!details) notFound();
  const notice = typeof params.notice === "string" ? NOTICES[params.notice] : undefined;
  const completeness = profileCompleteness(details);
  const missing = completeness.items.filter((i) => !i.done);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">My profile</h1>
          <p className="mt-1 text-gray-600">This is what other students see about you.</p>
        </div>
        <Link href={`/u/${details.username}`} className={buttonClasses({ variant: "outline", size: "sm" })}>
          View public profile
        </Link>
      </div>

      {notice && <Alert tone="success">{notice}</Alert>}

      {missing.length > 0 && (
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Profile {completeness.percent}% complete</h2>
            <span className="text-sm text-gray-600">
              {completeness.done} of {completeness.total}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Profile completeness"
            aria-valuenow={completeness.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-2 overflow-hidden rounded-full bg-gray-100"
          >
            <div className="h-full rounded-full bg-success" style={{ width: `${completeness.percent}%` }} />
          </div>
          <ul className="flex flex-wrap gap-2">
            {missing.map((item) => (
              <li key={item.key}>
                <a
                  href={item.href}
                  className="inline-flex min-h-9 items-center rounded-full border border-gray-200 px-3 text-sm text-gray-700 hover:border-brand hover:text-brand"
                >
                  + {item.label}
                </a>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Skills drive matching, so on phones they come first. */}
        <Card id="about" className="order-2 flex scroll-mt-20 flex-col gap-6 lg:order-none">
          <h2 className="text-lg font-semibold">About you</h2>
          <AvatarUploader userId={details.id} name={details.display_name} path={details.avatar_path} />
          <ProfileForm
            action={updateProfile}
            universities={universities}
            submitLabel="Save profile"
            defaults={{
              username: details.username ?? "",
              displayName: details.display_name,
              universityId: details.university_id ? String(details.university_id) : "",
              program: details.program ?? "",
              bio: details.bio ?? "",
            }}
          />
        </Card>

        <div className="order-1 flex flex-col gap-6 lg:order-none">
          <Card id="skills" className="flex scroll-mt-20 flex-col gap-6">
            <div>
              <h2 className="text-lg font-semibold">Skills</h2>
              <p className="mt-1 text-sm text-gray-600">
                Matching pairs you with students who teach what you want to learn, and want to learn what
                you teach.
              </p>
            </div>
            <SkillSuggestions id="skill-suggestions" names={skillNames} />
            <SkillsEditor kind="teach" skills={details.teaches} suggestionsId="skill-suggestions" />
            <SkillsEditor kind="learn" skills={details.learns} suggestionsId="skill-suggestions" />
            <Link href="/matches" className="text-sm font-medium text-brand hover:underline">
              See students who match these skills →
            </Link>
          </Card>

          <Card id="interests" className="flex scroll-mt-20 flex-col gap-4">
            <div>
              <h2 className="text-lg font-semibold">Learning interests</h2>
              <p className="mt-1 text-sm text-gray-600">Pick the subjects you care about.</p>
            </div>
            <InterestsForm categories={categories} selected={details.interestIds} />
          </Card>
        </div>
      </div>
    </div>
  );
}
