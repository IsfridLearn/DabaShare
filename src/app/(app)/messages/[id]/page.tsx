import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatWindow } from "@/components/messages/chat-window";
import { ConversationList } from "@/components/messages/conversation-list";
import { InboxLive } from "@/components/messages/inbox-live";
import { StudentMenu } from "@/components/safety/student-menu";
import { Avatar } from "@/components/ui/avatar";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { isUuid } from "@/lib/courses/queries";
import { getInbox, getMessages } from "@/lib/messages/queries";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const me = await requireOnboardedProfile();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const inbox = await getInbox();
  // Only conversations you belong to are in your inbox (RLS), so this doubles
  // as the membership check.
  const conversation = inbox.find((c) => c.conversation_id === id);
  if (!conversation) notFound();
  const { messages, hasMore } = await getMessages(id);
  const name = conversation.other_name ?? "DabaShare member";

  return (
    <div className="flex flex-col gap-4">
      <InboxLive />
      <h1 className="sr-only">Conversation with {name}</h1>
      <Link href="/messages" className="text-sm font-medium text-brand hover:underline md:hidden">
        ← All messages
      </Link>
      <div className="grid h-[calc(100dvh-13rem)] overflow-hidden rounded-card border border-gray-200 bg-white shadow-card md:h-[calc(100dvh-14rem)] md:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="hidden overflow-y-auto border-r border-gray-200 md:block">
          <ConversationList items={inbox} activeId={id} meId={me.id} />
        </div>
        <section className="flex min-h-0 flex-col" aria-label={`Conversation with ${name}`}>
          <header className="flex items-center gap-3 border-b border-gray-200 px-4 py-3">
            <Avatar name={name} path={conversation.other_avatar} size={40} />
            <div className="min-w-0 flex-1">
              {conversation.other_username ? (
                <Link href={`/u/${conversation.other_username}`} className="block truncate font-semibold hover:text-brand">
                  {name}
                </Link>
              ) : (
                <span className="block truncate font-semibold">{name}</span>
              )}
              {!conversation.can_send && <span className="text-xs text-gray-500">Messaging is turned off</span>}
            </div>
            {conversation.other_id && conversation.other_username && (
              <StudentMenu studentId={conversation.other_id} username={conversation.other_username} />
            )}
          </header>
          <ChatWindow
            key={id}
            conversationId={id}
            meId={me.id}
            initialMessages={messages}
            initialHasMore={hasMore}
            canSend={conversation.can_send}
          />
        </section>
      </div>
    </div>
  );
}
