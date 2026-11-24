import Link from "next/link";
import type { ReactNode } from "react";
import { Alert } from "@/components/ui/alert";
import { Logo } from "@/components/ui/logo";

export const metadata = { title: "Privacy notice" };

// Plain-language notice written against the Philippine Data Privacy Act of
// 2012 (RA 10173). It must be reviewed by a qualified person, and the contact
// details filled in, before a public launch (see docs/SECURITY.md).
export default function PrivacyPage() {
  return (
    <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-10">
      <Link href="/" className="text-brand-ink" aria-label="DabaShare home">
        <Logo />
      </Link>
      <h1 className="mt-10 text-display">Privacy notice</h1>
      <p className="mt-2 text-small text-fg-subtle">Last updated 23 November 2026</p>

      <div className="mt-6">
        <Alert tone="info">
          DabaShare is in early development. This notice describes how the app works today and will be
          reviewed before the public launch.
        </Alert>
      </div>

      <div className="mt-10 flex flex-col gap-8 leading-7 text-fg">
        <Section title="What we collect">
          <ul className="list-disc space-y-1 pl-5">
            <li>Account details: your email address and a securely hashed password.</li>
            <li>
              Profile details you choose to add: name, username, university, course or program, bio,
              profile photo, skills you can teach or want to learn, and learning interests.
            </li>
            <li>
              Things you create: course listings, enrollment requests, messages, study sessions, reports
              and blocks.
            </li>
            <li>Basic technical data needed to keep you signed in (session cookies).</li>
          </ul>
        </Section>

        <Section title="Why we use it">
          <p>
            To run DabaShare: create your account, show your profile to other signed-in students, suggest
            learning partners, deliver messages and notifications, and keep the community safe. We do not
            sell your data or show you ads.
          </p>
        </Section>

        <Section title="Who can see it">
          <ul className="list-disc space-y-1 pl-5">
            <li>
              Your profile, courses and study sessions are visible only to signed-in DabaShare members,
              never to the public or search engines.
            </li>
            <li>Your email address is never shown to other students.</li>
            <li>Messages are visible only to the people in the conversation.</li>
            <li>
              People you block can&apos;t see your profile, courses or sessions, and can&apos;t message
              you.
            </li>
            <li>
              If you are reported, moderators see a copy of the reported content so they can review it.
            </li>
          </ul>
        </Section>

        <Section title="Where it is stored">
          <p>
            Data is stored with our hosting providers, Supabase (database, files and sign-in, in a
            Singapore data centre) and Vercel (website hosting), under their security and confidentiality
            obligations.
          </p>
        </Section>

        <Section title="How long we keep it">
          <p>
            We keep your data while your account is active. When you delete your account in Settings,
            your profile, photo, skills, courses, enrollments, messages and sessions are permanently
            deleted. Reports you filed are kept without your name so moderators can finish reviewing them.
          </p>
        </Section>

        <Section title="Your rights">
          <p>
            Under the Data Privacy Act you can ask to access, correct, or delete your personal data, and you
            can object to its processing. You can edit your profile at any time, hide yourself from matches
            in Settings, and delete your account yourself.
          </p>
        </Section>

        <Section title="Age requirement">
          <p>You must be at least 18 years old to create a DabaShare account.</p>
        </Section>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h2 className="mb-2 text-heading">{title}</h2>
      {children}
    </section>
  );
}
