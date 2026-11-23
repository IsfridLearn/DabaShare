import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatWindow } from "@/components/messages/chat-window";
import { ConversationList } from "@/components/messages/conversation-list";
import { InboxLive } from "@/components/messages/inbox-live";
import { StudentMenu } from "@/components/safety/student-menu";
import { Avatar } from "@/components/ui/avatar";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { isUuid } from "@/lib/courses/queries";
import { hideConversation } from "@/lib/messages/actions";
import { getInbox, getMessages } from "@/lib/messages/queries";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Conversation" };

export default async function ConversationPage({ params }: PageProps<"/messages/[id]">) {
  const me = await requireOnboardedProfile();
  const { id } = await params;
  if (!isUuid(id)) notFound();

  const inbox = await getInbox(id);
  // Only conversations you belong to are in your inbox (RLS), so this doubles
  // as the membership check.
  const conversation = inbox.find((c) => c.conversation_id === id);
  if (!conversation) notFound();
  const { messages, hasMore } = await getMessages(id);
  const name = conversation.other_name ?? "DabaShare member";

  return (
    // Phones: the chat fills the screen between the top bar and the tab bar.
    <div className="-mx-4 -mt-6 -mb-28 flex h-[calc(100dvh-7.5rem)] flex-col xl:m-0 xl:h-[calc(100dvh-10rem)]">
      <InboxLive />
      <h1 className="sr-only">Conversation with {name}</h1>
      <div className="grid min-h-0 flex-1 overflow-hidden bg-surface md:rounded-card md:border md:border-gray-200 md:shadow-card md:grid-cols-[20rem_minmax(0,1fr)] xl:m-0">
        <div className="hidden overflow-y-auto border-r border-gray-200 md:block">
          <ConversationList items={inbox} activeId={id} meId={me.id} />
        </div>
        <section className="flex min-h-0 flex-col" aria-label={`Conversation with ${name}`}>
          <header className="flex items-center gap-2 border-b border-gray-200 px-2 py-2 sm:px-4">
            <Link
              href="/messages"
              className="flex size-11 shrink-0 items-center justify-center rounded-control text-gray-600 hover:bg-gray-100 md:hidden"
              aria-label="Back to all messages"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </Link>
            <Avatar name={name} path={conversation.other_avatar} size={40} />
            <div className="min-w-0 flex-1">
              {conversation.other_username ? (
                <Link href={`/u/${conversation.other_username}`} className="block truncate font-semibold hover:text-brand-ink">
                  {name}
                </Link>
              ) : (
                <span className="block truncate font-semibold">{name}</span>
              )}
              {conversation.other_username && <span className="block truncate text-xs text-gray-600">@{conversation.other_username}</span>}
            </div>
            <form action={hideConversation.bind(null, id)}>
              <button
                type="submit"
                className="rounded-control px-2.5 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                title="Hide this conversation until a new message arrives"
              >
                Hide
              </button>
            </form>
            {conversation.other_id && conversation.other_username && (
              <StudentMenu studentId={conversation.other_id} username={conversation.other_username} />
            )}
          </header>
          <ChatWindow
            key={id}
            conversationId={id}
            meId={me.id}
            otherName={name}
            initialMessages={messages}
            initialHasMore={hasMore}
            canSend={conversation.can_send}
            unavailableReason={
              conversation.other_id
                ? "Messaging isn't available in this conversation because one of you blocked the other."
                : "This student deleted their account, so you can't reply."
            }
          />
        </section>
      </div>
    </div>
  );
}
