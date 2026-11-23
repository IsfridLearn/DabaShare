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
      <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
        <p className="font-semibold text-gray-900">No conversations yet</p>
        <p className="text-sm text-gray-600">Find a learning partner and say hello. Their Message button starts a chat.</p>
        <Link href="/matches" className={buttonClasses({ size: "sm" })}>
          Find students to message
        </Link>
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
                "flex min-h-18 items-center gap-3 px-4 py-3 hover:bg-gray-50",
                c.conversation_id === activeId && "bg-brand-soft hover:bg-brand-soft",
              )}
            >
              <span className="relative shrink-0">
                <Avatar name={name} path={c.other_avatar} size={48} />
                {unread && <span className="absolute -top-0.5 -right-0.5 size-3.5 rounded-full border-2 border-surface bg-brand" aria-hidden="true" />}
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className={cn("truncate", unread ? "font-bold text-gray-900" : "font-medium text-gray-800")}>{name}</span>
                  <span className={cn("shrink-0 text-xs", unread ? "font-semibold text-brand-ink" : "text-gray-600")}>
                    {formatInboxTime(c.last_at)}
                  </span>
                </span>
                <span className="flex items-center justify-between gap-2">
                  <span className={cn("truncate text-sm", unread ? "font-medium text-gray-900" : "text-gray-600")}>{preview}</span>
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
