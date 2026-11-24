import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { buttonClasses } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { formatInboxTime, previewText } from "@/lib/messages/format";
import type { InboxItem } from "@/lib/messages/queries";

export function ConversationList({
  items,
  activeId,
  meId,
}: {
  items: InboxItem[];
  activeId?: string;
  meId: string;
}) {
  if (!items.length) {
    return (
      <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
        <p className="font-semibold text-fg">No conversations yet</p>
        <p className="mb-2 text-small text-fg-muted">Find a learning partner and say hello. Their Message button starts a chat.</p>
        <Link href="/matches" className={buttonClasses({ size: "sm" })}>
          Find students to message
        </Link>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-px p-1.5">
      {items.map((c) => {
        const name = c.other_name ?? "DabaShare member";
        const unread = c.unread > 0;
        const preview = c.last_sender === meId ? `You: ${previewText(c.last_body, 50)}` : previewText(c.last_body);
        return (
          <li key={c.conversation_id}>
            <Link
              href={`/messages/${c.conversation_id}`}
              aria-current={c.conversation_id === activeId ? "page" : undefined}
              className={cn(
                "flex min-h-16 items-center gap-3 rounded-control px-2.5 py-2.5 transition-colors duration-150 hover:bg-subtle",
                c.conversation_id === activeId && "bg-subtle",
              )}
            >
              <span className="relative shrink-0">
                <Avatar name={name} path={c.other_avatar} size={40} />
                {unread && <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full border-2 border-surface bg-brand" aria-hidden="true" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn("truncate", unread ? "font-semibold text-fg" : "font-medium text-fg")}>{name}</span>
                  <span className={cn("shrink-0 text-caption", unread ? "font-medium text-brand-ink" : "text-fg-subtle")}>
                    {formatInboxTime(c.last_at)}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-small", unread ? "text-fg" : "text-fg-muted")}>{preview}</span>
                  {unread && (
                    <span className="shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[0.6875rem] leading-none font-semibold text-white">
                      <span className="sr-only">Unread: </span>
                      {c.unread > 99 ? "99+" : c.unread}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
