import { ArrowRight, ExternalLink, Plus } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { InterestsForm } from "@/components/profile/interests-form";
import { ProfileForm } from "@/components/profile/profile-form";
import { SkillsEditor, SkillSuggestions } from "@/components/profile/skills-editor";
import { Alert } from "@/components/ui/alert";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader, PanelSection } from "@/components/ui/primitives";
import { NoticeToast } from "@/components/ui/toast";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { updateProfile } from "@/lib/profile/actions";
import { profileCompleteness } from "@/lib/profile/completeness";
import { getProfileDetailsById, getSkillNames } from "@/lib/profile/queries";
import { getCategories, getUniversities } from "@/lib/reference";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "My profile" };

// The welcome note is guidance, so it stays on the page; the rest are toasts.
const WELCOME = "Welcome to DabaShare! Add what you can teach and what you want to learn, then check People for learning partners.";
const TOASTS: Record<string, string> = {
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
  const welcome = params.notice === "welcome";
  const toast = typeof params.notice === "string" ? TOASTS[params.notice] : undefined;
  const completeness = profileCompleteness(details);
  const missing = completeness.items.filter((i) => !i.done);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <PageHeader
        title="My profile"
        description="This is what other students see about you."
        actions={
          <Link href={`/u/${details.username}`} className={buttonClasses({ variant: "secondary" })}>
            View public profile
            <ExternalLink className="size-4" aria-hidden="true" />
          </Link>
        }
      />

      {welcome && <Alert tone="success">{WELCOME}</Alert>}
      {toast && <NoticeToast key={toast} message={toast} />}

      {missing.length > 0 && (
        <section aria-labelledby="completeness-title" className="flex flex-col gap-3 rounded-card border border-line bg-surface p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 id="completeness-title" className="text-small font-semibold text-fg">
              Profile {completeness.percent}% complete
            </h2>
            <span className="text-caption text-fg-subtle">
              {completeness.done} of {completeness.total}
            </span>
          </div>
          <div
            role="progressbar"
            aria-label="Profile completeness"
            aria-valuenow={completeness.percent}
            aria-valuemin={0}
            aria-valuemax={100}
            className="h-1 overflow-hidden rounded-full bg-subtle"
          >
            <div className="h-full rounded-full bg-success" style={{ width: `${completeness.percent}%` }} />
          </div>
          <ul className="flex flex-wrap gap-1.5">
            {missing.map((item) => (
              <li key={item.key}>
                <a
                  href={item.href}
                  className="inline-flex h-8 items-center gap-1.5 rounded-control border border-line-strong px-2.5 text-small text-fg-muted transition-colors duration-150 hover:bg-subtle hover:text-fg"
                >
                  <Plus className="size-3.5" aria-hidden="true" />
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <div>
        {/* Skills drive matching, so they come first. */}
        <PanelSection
          id="skills"
          title="Skills"
          description="Matching pairs you with students who teach what you want to learn, and want to learn what you teach."
        >
          <div className="flex flex-col gap-6">
            <SkillSuggestions id="skill-suggestions" names={skillNames} />
            <SkillsEditor kind="teach" skills={details.teaches} suggestionsId="skill-suggestions" />
            <SkillsEditor kind="learn" skills={details.learns} suggestionsId="skill-suggestions" />
            <Link href="/matches" className="inline-flex items-center gap-1 self-start text-small font-medium text-brand-ink hover:underline">
              See students who match these skills
              <ArrowRight className="size-3.5" aria-hidden="true" />
            </Link>
          </div>
        </PanelSection>

        <PanelSection id="interests" title="Learning interests" description="Pick the subjects you care about.">
          <InterestsForm categories={categories} selected={details.interestIds} />
        </PanelSection>

        <PanelSection id="about" title="About you" description="Your photo, name, university and a short bio.">
          <div className="flex max-w-xl flex-col gap-6">
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
          </div>
        </PanelSection>
      </div>
    </div>
  );
}
