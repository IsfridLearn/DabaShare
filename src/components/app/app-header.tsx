import Link from "next/link";
import { Suspense } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { signOut } from "@/lib/auth/actions";
import { getMyProfile } from "@/lib/auth/session";

// Only links to features that exist; later phases add Matches, Sessions and
// Messages here.
const NAV = [
  { href: "/courses", label: "Courses" },
  { href: "/courses/mine", label: "My courses" },
  { href: "/profile", label: "My profile" },
  { href: "/settings", label: "Settings" },
];

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-4 px-4">
        <Link href="/courses" className="text-brand" aria-label="DabaShare">
          <Logo size={28} />
        </Link>
        <nav aria-label="Main" className="ml-2 hidden gap-1 sm:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-control px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <Suspense fallback={<span className="size-8 rounded-full bg-gray-100" />}>
            <UserChip />
          </Suspense>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-control px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
      <nav aria-label="Main" className="flex gap-1 border-t border-gray-100 px-2 py-1 sm:hidden">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-control px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}

async function UserChip() {
  const profile = await getMyProfile();
  if (!profile) return null;
  return (
    <span className="flex items-center gap-2">
      <Avatar name={profile.display_name} path={profile.avatar_path} size={32} />
      <span className="hidden max-w-40 truncate text-sm font-medium text-gray-800 md:inline">
        {profile.display_name}
      </span>
    </span>
  );
}
