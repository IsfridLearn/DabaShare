import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { Menu } from "@/components/ui/menu";
import { signOut } from "@/lib/auth/actions";
import { getMyProfile } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/messages/queries";
import { getUnreadNotificationCount } from "@/lib/notifications/queries";
import { NavLink } from "./nav-link";

type Badge = "messages" | "notifications";
type Item = { href: string; label: string; short?: string; badge?: Badge; exclude?: string[]; icon: ReactNode };

const icon = (d: ReactNode) => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);

const ITEMS: Item[] = [
  { href: "/courses", label: "Courses", exclude: ["/courses/mine"], icon: icon(<><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></>) },
  { href: "/matches", label: "Matches", icon: icon(<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>) },
  { href: "/sessions", label: "Sessions", icon: icon(<><polygon points="23 7 16 12 23 17 23 7" /><rect x="1" y="5" width="15" height="14" rx="2" /></>) },
  { href: "/messages", label: "Messages", badge: "messages", icon: icon(<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />) },
  { href: "/notifications", label: "Notifications", short: "Alerts", badge: "notifications", icon: icon(<><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></>) },
];

const desktopLink =
  "inline-flex items-center gap-1.5 rounded-control px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900";

// Desktop: one top bar. Phones/tablets: a slim top bar plus a bottom tab bar
// (thumb-reachable, badges always visible).
export function AppHeader() {
  return (
    <>
      <header className="border-b border-gray-200 bg-white/95 backdrop-blur xl:sticky xl:top-0 xl:z-20">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4 xl:h-16">
          <Link href="/courses" className="text-brand" aria-label="DabaShare home">
            <Logo size={28} />
          </Link>
          <nav aria-label="Main" className="ml-2 hidden gap-0.5 xl:flex">
            {ITEMS.map((item) => (
              <NavLink key={item.href} href={item.href} exclude={item.exclude} className={desktopLink} activeClassName="bg-brand-soft text-brand hover:bg-brand-soft hover:text-brand">
                {item.label}
                {item.badge && (
                  <Suspense fallback={null}>
                    <CountBadge kind={item.badge} />
                  </Suspense>
                )}
              </NavLink>
            ))}
            <NavLink href="/courses/mine" className={desktopLink} activeClassName="bg-brand-soft text-brand hover:bg-brand-soft hover:text-brand">
              My courses
            </NavLink>
          </nav>
          <div className="ml-auto">
            <Suspense fallback={<span className="block size-9 rounded-full bg-gray-100" />}>
              <AccountMenu />
            </Suspense>
          </div>
        </div>
      </header>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-gray-200 bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur xl:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {ITEMS.map((item) => (
            <li key={item.href}>
              <NavLink
                href={item.href}
                exclude={item.exclude}
                className="relative flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[0.7rem] font-medium text-gray-600"
                activeClassName="text-brand"
              >
                {item.icon}
                <span>{item.short ?? item.label}</span>
                {item.badge && (
                  <span className="absolute top-1.5 left-1/2 ml-1.5">
                    <Suspense fallback={null}>
                      <CountBadge kind={item.badge} />
                    </Suspense>
                  </span>
                )}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </>
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

// Avatar opens a small account menu (native <details>: works without JS).
async function AccountMenu() {
  const profile = await getMyProfile();
  if (!profile) return null;
  const item = "block rounded-md px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100";
  return (
    <Menu
      summaryClassName="flex items-center gap-2 rounded-full p-1 hover:bg-gray-100 md:pr-3"
      panelClassName="absolute right-0 z-40 mt-2 w-56 rounded-control border border-gray-200 bg-white p-1 shadow-card-lg"
      summary={
        <>
          <Avatar name={profile.display_name} path={profile.avatar_path} size={32} />
          <span className="hidden max-w-36 truncate text-sm font-medium text-gray-800 md:inline">{profile.display_name}</span>
          <span className="sr-only">Account menu</span>
        </>
      }
    >
        <Link href="/profile" className={item}>
          My profile
        </Link>
        <Link href="/courses/mine" className={item}>
          My courses
        </Link>
        <Link href="/settings" className={item}>
          Settings
        </Link>
        <form action={signOut}>
          <button type="submit" className={`${item} w-full text-left`}>
            Log out
          </button>
        </form>
    </Menu>
  );
}
