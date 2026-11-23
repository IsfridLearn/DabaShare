import Link from "next/link";
import { Suspense } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { signOut } from "@/lib/auth/actions";
import { getMyProfile } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/messages/queries";
import { getUnreadNotificationCount } from "@/lib/notifications/queries";

type Badge = "messages" | "notifications";

const NAV: { href: string; label: string; badge?: Badge }[] = [
  { href: "/courses", label: "Courses" },
  { href: "/courses/mine", label: "My courses" },
  { href: "/matches", label: "Matches" },
  { href: "/sessions", label: "Sessions" },
  { href: "/messages", label: "Messages", badge: "messages" },
  { href: "/notifications", label: "Notifications", badge: "notifications" },
];

function NavLinks({ className }: { className: string }) {
  return NAV.map((item) => (
    <Link key={item.href} href={item.href} className={className}>
      {item.label}
      {item.badge && (
        <Suspense fallback={null}>
          <CountBadge kind={item.badge} />
        </Suspense>
      )}
    </Link>
  ));
}

const linkClass =
  "inline-flex shrink-0 items-center gap-1.5 rounded-control px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900";

export function AppHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-gray-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4">
        <Link href="/courses" className="text-brand" aria-label="DabaShare">
          <Logo size={28} />
        </Link>
        <nav aria-label="Main" className="ml-2 hidden gap-0.5 xl:flex">
          <NavLinks className={linkClass} />
        </nav>
        <div className="ml-auto flex items-center gap-1">
          <Suspense fallback={<span className="size-8 rounded-full bg-gray-100" />}>
            <UserChip />
          </Suspense>
          <Link href="/settings" className={linkClass}>
            Settings
          </Link>
          <form action={signOut}>
            <button type="submit" className={linkClass}>
              Log out
            </button>
          </form>
        </div>
      </div>
      <nav aria-label="Main" className="flex gap-1 overflow-x-auto border-t border-gray-100 px-2 py-1 xl:hidden">
        <NavLinks className={linkClass} />
      </nav>
    </header>
  );
}

async function CountBadge({ kind }: { kind: Badge }) {
  const count = kind === "messages" ? await getUnreadCount() : await getUnreadNotificationCount();
  if (!count) return null;
  return (
    <span className="rounded-full bg-brand px-1.5 py-0.5 text-[0.7rem] leading-none font-bold text-white">
      <span className="sr-only">, unread {kind === "messages" ? "conversations" : "notifications"}: </span>
      {count > 99 ? "99+" : count}
    </span>
  );
}

async function UserChip() {
  const profile = await getMyProfile();
  if (!profile) return null;
  return (
    <Link href="/profile" className="mr-1 flex items-center gap-2 rounded-control px-1.5 py-1 hover:bg-gray-100" aria-label="My profile">
      <Avatar name={profile.display_name} path={profile.avatar_path} size={32} />
      <span className="hidden max-w-36 truncate text-sm font-medium text-gray-800 md:inline">{profile.display_name}</span>
    </Link>
  );
}
