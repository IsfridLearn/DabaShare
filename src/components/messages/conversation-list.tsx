import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
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
      <div className="px-4 py-10 text-center text-sm text-gray-500">
        No conversations yet. Use the <strong>Message</strong> button on a match, profile or course to start one.
      </div>
    );
  }

  return (
    <ul className="divide-y divide-gray-100">
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
                "flex items-center gap-3 px-4 py-3 hover:bg-gray-50",
                c.conversation_id === activeId && "bg-brand-soft hover:bg-brand-soft",
              )}
            >
              <Avatar name={name} path={c.other_avatar} size={44} />
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn("truncate text-sm", unread ? "font-bold text-gray-900" : "font-medium text-gray-800")}>
                    {name}
                  </span>
                  <span className="shrink-0 text-xs text-gray-400">{formatInboxTime(c.last_at)}</span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-sm", unread ? "font-medium text-gray-800" : "text-gray-500")}>
                    {preview}
                  </span>
                  {unread && (
                    <span className="shrink-0 rounded-full bg-brand px-1.5 py-0.5 text-[0.7rem] leading-none font-bold text-white">
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
