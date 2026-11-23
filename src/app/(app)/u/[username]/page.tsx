import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageButton } from "@/components/messages/message-button";
import { StudentMenu } from "@/components/safety/student-menu";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getProfileDetailsByUsername, type SkillRef } from "@/lib/profile/queries";
import { getCategories } from "@/lib/reference";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Student profile" };

export default async function PublicProfilePage({ params }: PageProps<"/u/[username]">) {
  const me = await requireOnboardedProfile();
  const { username } = await params;
  const [profile, categories] = await Promise.all([getProfileDetailsByUsername(username), getCategories()]);
  // RLS hides unfinished profiles and anyone in a block relationship.
  if (!profile) notFound();

  const isMe = profile.id === me.id;
  const interests = categories.filter((c) => profile.interestIds.includes(c.id));

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <Card className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <Avatar name={profile.display_name} path={profile.avatar_path} size={96} />
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl font-bold break-words">{profile.display_name}</h1>
          <p className="text-gray-500">@{profile.username}</p>
          <p className="mt-2 text-gray-700">
            {[profile.program, profile.university?.name].filter(Boolean).join(" · ")}
          </p>
        </div>
        {isMe ? (
          <Link href="/profile" className={buttonClasses({ variant: "outline", size: "sm" })}>
            Edit profile
          </Link>
        ) : (
          <div className="flex items-center gap-2">
            <MessageButton otherId={profile.id} size="md" />
            <StudentMenu studentId={profile.id} />
          </div>
        )}
      </Card>

      {profile.bio && (
        <Card>
          <h2 className="mb-2 text-lg font-semibold">About</h2>
          <p className="whitespace-pre-line text-gray-700">{profile.bio}</p>
        </Card>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <SkillList title="Can teach" skills={profile.teaches} tone="teach" />
        <SkillList title="Wants to learn" skills={profile.learns} tone="learn" />
      </div>

      {interests.length > 0 && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Interests</h2>
          <ul className="flex flex-wrap gap-2">
            {interests.map((c) => (
              <li key={c.id}>
                <Tag>{c.name}</Tag>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function SkillList({ title, skills, tone }: { title: string; skills: SkillRef[]; tone: "teach" | "learn" }) {
  return (
    <Card>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {skills.length ? (
        <ul className="flex flex-wrap gap-2">
          {skills.map((s) => (
            <li key={s.id}>
              <Tag tone={tone}>{s.name}</Tag>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500">Nothing listed yet.</p>
      )}
    </Card>
  );
}
