import {
  Bell,
  BookOpen,
  CalendarDays,
  House,
  Library,
  MessageSquare,
  Settings,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Logo } from "@/components/ui/logo";
import { Menu } from "@/components/ui/menu";
import { signOut } from "@/lib/auth/actions";
import { SIGNED_IN_HOME } from "@/lib/auth/routes";
import { getMyProfile } from "@/lib/auth/session";
import { getUnreadCount } from "@/lib/messages/queries";
import { getUnreadNotificationCount } from "@/lib/notifications/queries";
import { NavLink } from "./nav-link";

type Badge = "messages" | "notifications";
type Item = { href: string; label: string; icon: LucideIcon; badge?: Badge; exclude?: string[]; exact?: boolean };

const MAIN: Item[] = [
  { href: "/home", label: "Home", icon: House },
  { href: "/courses", label: "Courses", icon: BookOpen, exclude: ["/courses/mine"] },
  { href: "/sessions", label: "Sessions", icon: CalendarDays },
  { href: "/matches", label: "People", icon: UsersRound },
  { href: "/messages", label: "Messages", icon: MessageSquare, badge: "messages" },
  { href: "/notifications", label: "Notifications", icon: Bell, badge: "notifications" },
];

const YOU: Item[] = [
  { href: "/courses/mine", label: "My courses", icon: Library },
  { href: "/profile", label: "Profile", icon: UserRound, exact: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

// Phones: the five most used places, thumb-reachable.
const TABS = MAIN.filter((i) => i.href !== "/notifications");

const sideLink =
  "group flex h-8 items-center gap-2.5 rounded-control px-2.5 text-[0.875rem] font-medium text-fg-muted transition-colors duration-150 hover:bg-subtle hover:text-fg";
const sideActive = "bg-subtle text-fg";

// Desktop (lg+): a quiet left sidebar, Linear-style. Smaller screens: a slim
// top bar (logo, alerts, account) and a bottom tab bar.
export function AppShell({ children }: { children: ReactNode }) {
  return (
    <>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 flex-col border-r border-line bg-canvas lg:flex">
        <div className="flex h-14 items-center px-4">
          <Link href={SIGNED_IN_HOME} className="flex items-center gap-2 text-brand-ink" aria-label="DabaShare home">
            <Logo size={26} />
          </Link>
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-6 overflow-y-auto px-3 py-2">
          <ul className="flex flex-col gap-0.5">
            {MAIN.map((item) => (
              <li key={item.href}>
                <SideLink item={item} />
              </li>
            ))}
          </ul>
          <div>
            <p className="mb-1 px-2.5 text-caption font-medium text-fg-subtle">You</p>
            <ul className="flex flex-col gap-0.5">
              {YOU.map((item) => (
                <li key={item.href}>
                  <SideLink item={item} />
                </li>
              ))}
            </ul>
          </div>
        </nav>
        <div className="border-t border-line p-3">
          <Suspense fallback={<div className="h-10 rounded-control bg-subtle" />}>
            <AccountMenu placement="sidebar" />
          </Suspense>
        </div>
      </aside>

      <header className="sticky top-0 z-20 border-b border-line bg-canvas/95 backdrop-blur lg:hidden">
        <div className="flex h-14 items-center gap-2 px-4">
          <Link href={SIGNED_IN_HOME} className="text-brand-ink" aria-label="DabaShare home">
            <Logo size={26} />
          </Link>
          <div className="ml-auto flex items-center gap-1">
            <NavLink
              href="/notifications"
              className="relative flex size-10 items-center justify-center rounded-control text-fg-muted hover:bg-subtle hover:text-fg"
              activeClassName="text-fg"
            >
              <Bell className="size-5" aria-hidden="true" />
              <span className="sr-only">Notifications</span>
              <span className="absolute top-1 right-0.5">
                <Suspense fallback={null}>
                  <CountBadge kind="notifications" />
                </Suspense>
              </span>
            </NavLink>
            <Suspense fallback={<span className="block size-8 rounded-full bg-subtle" />}>
              <AccountMenu placement="topbar" />
            </Suspense>
          </div>
        </div>
      </header>

      <div className="lg:pl-60">{children}</div>

      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-5">
          {TABS.map((item) => (
            <li key={item.href}>
              <NavLink
                href={item.href}
                exclude={item.exclude}
                exact={item.exact}
                className="relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 text-[0.6875rem] font-medium text-fg-subtle"
                activeClassName="text-fg"
              >
                <item.icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
                <span>{item.label}</span>
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

function SideLink({ item }: { item: Item }) {
  return (
    <NavLink href={item.href} exclude={item.exclude} exact={item.exact} className={sideLink} activeClassName={sideActive}>
      <item.icon className="size-4 shrink-0" strokeWidth={1.75} aria-hidden="true" />
      <span className="flex-1 truncate">{item.label}</span>
      {item.badge && (
        <Suspense fallback={null}>
          <CountBadge kind={item.badge} />
        </Suspense>
      )}
    </NavLink>
  );
}

async function CountBadge({ kind }: { kind: Badge }) {
  const count = kind === "messages" ? await getUnreadCount() : await getUnreadNotificationCount();
  if (!count) return null;
  return (
    <span className="inline-flex min-w-4.5 items-center justify-center rounded-full bg-brand px-1 py-0.5 text-[0.6875rem] leading-none font-semibold text-white tabular-nums">
      <span className="sr-only">, unread {kind === "messages" ? "conversations" : "notifications"}: </span>
      {count > 99 ? "99+" : count}
    </span>
  );
}

// Account menu: avatar + name in the sidebar, avatar only on the top bar.
async function AccountMenu({ placement }: { placement: "sidebar" | "topbar" }) {
  const profile = await getMyProfile();
  if (!profile) return null;
  const item = "block w-full rounded-[4px] px-3 py-2 text-left text-small text-fg hover:bg-subtle";
  const sidebar = placement === "sidebar";
  return (
    <Menu
      summaryClassName={
        sidebar
          ? "flex w-full items-center gap-2.5 rounded-control p-1.5 hover:bg-subtle"
          : "flex items-center rounded-full p-1 hover:bg-subtle"
      }
      panelClassName={
        sidebar
          ? "absolute bottom-full left-0 z-40 mb-2 w-full rounded-control border border-line bg-surface p-1 shadow-overlay"
          : "absolute right-0 z-40 mt-2 w-56 rounded-control border border-line bg-surface p-1 shadow-overlay"
      }
      summary={
        <>
          <Avatar name={profile.display_name} path={profile.avatar_path} size={sidebar ? 28 : 30} />
          {sidebar && (
            <span className="min-w-0 flex-1 text-left leading-tight">
              <span className="block truncate text-small font-medium text-fg">{profile.display_name}</span>
              {profile.username && <span className="block truncate text-caption text-fg-subtle">@{profile.username}</span>}
            </span>
          )}
          <span className="sr-only">Account menu</span>
        </>
      }
    >
      {profile.username && (
        <Link href={`/u/${profile.username}`} className={item}>
          View public profile
        </Link>
      )}
      <Link href="/profile" className={item}>
        Edit profile
      </Link>
      <Link href="/courses/mine" className={item}>
        My courses
      </Link>
      <Link href="/settings" className={item}>
        Settings
      </Link>
      <div className="my-1 border-t border-line" />
      <form action={signOut}>
        <button type="submit" className={item}>
          Log out
        </button>
      </form>
    </Menu>
  );
}
