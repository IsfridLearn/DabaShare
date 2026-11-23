import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClasses } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { cn } from "@/lib/cn";
import { formatInboxTime } from "@/lib/messages/format";
import { markAllNotificationsRead } from "@/lib/notifications/actions";
import { notificationText } from "@/lib/notifications/format";
import { getNotifications, NOTIFICATIONS_PAGE } from "@/lib/notifications/queries";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Notifications" };

export default async function NotificationsPage({ searchParams }: PageProps<"/notifications">) {
  await requireOnboardedProfile();
  const pageNum = Number((await searchParams).page);
  const page = Number.isInteger(pageNum) && pageNum > 0 ? Math.min(pageNum, 500) : 1;
  const { items, total } = await getNotifications(page);
  const unread = items.some((n) => !n.read_at);
  const pages = Math.ceil(total / NOTIFICATIONS_PAGE);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {unread && (
          <form action={markAllNotificationsRead}>
            <Button type="submit" variant="outline" size="sm">
              Mark all as read
            </Button>
          </form>
        )}
      </div>

      {items.length ? (
        <Card className="p-0">
          <ul className="divide-y divide-gray-100">
            {items.map((n) => (
              <li key={n.id}>
                <Link
                  href={`/notifications/open/${n.id}`}
                  // This GET marks the notification read: never prefetch it.
                  prefetch={false}
                  className={cn("flex items-start gap-3 px-5 py-4 hover:bg-gray-50", !n.read_at && "bg-brand-soft/60")}
                >
                  <Avatar name={n.actor_name ?? "DabaShare"} path={n.actor_avatar} size={40} />
                  <span className="min-w-0 flex-1">
                    <span className={cn("block text-sm", n.read_at ? "text-gray-700" : "font-semibold text-gray-900")}>
                      {notificationText(n)}
                    </span>
                    <span className="mt-0.5 block text-xs text-gray-500">{formatInboxTime(n.created_at)}</span>
                  </span>
                  {!n.read_at && (
                    <span className="mt-1.5 size-2.5 shrink-0 rounded-full bg-brand">
                      <span className="sr-only">Unread</span>
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <EmptyState
          title="You're all caught up"
          description="Messages, enrollment updates and session invitations will show up here."
          action={
            <Link href="/courses" className={buttonClasses({ variant: "outline" })}>
              Browse courses
            </Link>
          }
        />
      )}

      {pages > 1 && (
        <nav aria-label="Pages" className="flex items-center justify-center gap-3">
          {page > 1 && (
            <Link href={`/notifications?page=${page - 1}`} className={buttonClasses({ variant: "outline", size: "sm" })}>
              ← Newer
            </Link>
          )}
          <span className="text-sm text-gray-600">
            Page {page} of {pages}
          </span>
          {page < pages && (
            <Link href={`/notifications?page=${page + 1}`} className={buttonClasses({ variant: "outline", size: "sm" })}>
              Older →
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}
