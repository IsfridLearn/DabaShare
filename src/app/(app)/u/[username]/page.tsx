import Link from "next/link";
import { notFound } from "next/navigation";
import { MessageButton } from "@/components/messages/message-button";
import { StudentMenu } from "@/components/safety/student-menu";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tag } from "@/components/ui/tag";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getPublishedCoursesBy } from "@/lib/courses/queries";
import { formatPrice } from "@/lib/courses/validation";
import { skillOverlap } from "@/lib/profile/overlap";
import { getProfileDetailsById, getProfileDetailsByUsername, type SkillRef } from "@/lib/profile/queries";
import { getCategories } from "@/lib/reference";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Student profile" };

export default async function PublicProfilePage({ params }: PageProps<"/u/[username]">) {
  const me = await requireOnboardedProfile();
  const { username } = await params;
  // One round trip for everything that doesn't depend on the other student's id.
  const [profile, categories, mine] = await Promise.all([
    getProfileDetailsByUsername(username),
    getCategories(),
    getProfileDetailsById(me.id),
  ]);
  // RLS hides unfinished profiles and anyone in a block relationship.
  if (!profile) notFound();

  const isMe = profile.id === me.id;
  const interests = categories.filter((c) => profile.interestIds.includes(c.id));
  const courses = await getPublishedCoursesBy(profile.id);
  const overlap = mine && !isMe ? skillOverlap(mine, profile) : null;
  const hasOverlap = Boolean(overlap && (overlap.theyTeachYou.length || overlap.youTeachThem.length));

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
          <div className="flex w-full items-center gap-2 sm:w-auto">
            <div className="flex-1 sm:flex-none">
              <MessageButton otherId={profile.id} size="md" fullWidth />
            </div>
            <StudentMenu studentId={profile.id} />
          </div>
        )}
      </Card>

      {hasOverlap && overlap && (
        <Card className="flex flex-col gap-3 border-violet-200 bg-violet-50/40">
          <h2 className="text-lg font-semibold">Why you two match</h2>
          {overlap.theyTeachYou.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700">{profile.display_name} can teach you</p>
              <ul className="flex flex-wrap gap-2">
                {overlap.theyTeachYou.map((s) => (
                  <li key={s}>
                    <Tag tone="teach">{s}</Tag>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {overlap.youTeachThem.length > 0 && (
            <div>
              <p className="mb-1.5 text-sm font-medium text-gray-700">You can teach {profile.display_name}</p>
              <ul className="flex flex-wrap gap-2">
                {overlap.youTeachThem.map((s) => (
                  <li key={s}>
                    <Tag tone="learn">{s}</Tag>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      {profile.bio && (
        <Card>
          <h2 className="mb-2 text-lg font-semibold">About</h2>
          <p className="break-words whitespace-pre-line text-gray-700">{profile.bio}</p>
        </Card>
      )}

      {courses.length > 0 && (
        <Card>
          <h2 className="mb-3 text-lg font-semibold">Courses by {isMe ? "you" : profile.display_name}</h2>
          <ul className="divide-y divide-gray-100">
            {courses.map((c) => (
              <li key={c.id}>
                <Link href={`/courses/${c.id}`} className="flex items-center justify-between gap-3 py-3 hover:text-brand">
                  <span className="min-w-0 truncate font-medium">{c.title}</span>
                  <Tag tone={c.price_php === 0 ? "free" : "paid"} className="shrink-0">
                    {formatPrice(c.price_php)}
                  </Tag>
                </Link>
              </li>
            ))}
          </ul>
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
