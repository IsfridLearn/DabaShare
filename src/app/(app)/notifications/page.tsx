import { Bell, CheckCheck } from "lucide-react";
import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClasses } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader, Pagination, RowList } from "@/components/ui/primitives";
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

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <PageHeader
        title="Notifications"
        actions={
          unread && (
            <form action={markAllNotificationsRead}>
              <Button type="submit" variant="secondary" size="sm" icon={<CheckCheck className="size-4" aria-hidden="true" />}>
                Mark all as read
              </Button>
            </form>
          )
        }
      />

      {items.length ? (
        <RowList label="Notifications">
          {items.map((n) => (
            <li key={n.id}>
              <Link
                href={`/notifications/open/${n.id}`}
                // This GET marks the notification read: never prefetch it.
                prefetch={false}
                className="flex items-start gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-subtle sm:px-5"
              >
                <Avatar name={n.actor_name ?? "DabaShare"} path={n.actor_avatar} size={36} />
                <span className="min-w-0 flex-1">
                  <span className={cn("block text-small", n.read_at ? "text-fg-muted" : "font-medium text-fg")}>{notificationText(n)}</span>
                  <span className="mt-0.5 block text-caption text-fg-subtle">{formatInboxTime(n.created_at)}</span>
                </span>
                {!n.read_at && (
                  <span className="mt-1.5 size-2 shrink-0 rounded-full bg-brand">
                    <span className="sr-only">Unread</span>
                  </span>
                )}
              </Link>
            </li>
          ))}
        </RowList>
      ) : (
        <EmptyState
          icon={<Bell className="size-5" />}
          title="You're all caught up"
          description="Messages, follows, likes, enrollment updates and session invitations show up here."
          action={
            <Link href="/home" className={buttonClasses({ variant: "secondary" })}>
              Go to home
            </Link>
          }
        />
      )}

      <Pagination
        page={page}
        pages={Math.ceil(total / NOTIFICATIONS_PAGE)}
        hrefFor={(p) => `/notifications?page=${p}`}
        previousLabel="Newer"
        nextLabel="Older"
      />
    </div>
  );
}
