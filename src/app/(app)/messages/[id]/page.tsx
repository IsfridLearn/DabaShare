import { ChevronLeft, EyeOff } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChatWindow } from "@/components/messages/chat-window";
import { ConversationList } from "@/components/messages/conversation-list";
import { InboxLive } from "@/components/messages/inbox-live";
import { MessagesFrame } from "@/components/messages/messages-frame";
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
    <>
      <InboxLive />
      <h1 className="sr-only">Conversation with {name}</h1>
      <MessagesFrame title="Messages" titleAs="h2" conversationOpen list={<ConversationList items={inbox} activeId={id} meId={me.id} />}>
        <section className="flex min-h-0 flex-1 flex-col" aria-label={`Conversation with ${name}`}>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-2 sm:px-4">
            <Link
              href="/messages"
              className="flex size-10 shrink-0 items-center justify-center rounded-control text-fg-muted hover:bg-subtle hover:text-fg md:hidden"
              aria-label="Back to all messages"
            >
              <ChevronLeft className="size-5" aria-hidden="true" />
            </Link>
            <Avatar name={name} path={conversation.other_avatar} size={32} />
            <div className="min-w-0 flex-1 leading-tight">
              {conversation.other_username ? (
                <Link href={`/u/${conversation.other_username}`} className="block truncate font-semibold text-fg hover:underline">
                  {name}
                </Link>
              ) : (
                <span className="block truncate font-semibold text-fg">{name}</span>
              )}
              {conversation.other_username && <span className="block truncate text-caption text-fg-subtle">@{conversation.other_username}</span>}
            </div>
            <form action={hideConversation.bind(null, id)}>
              <button
                type="submit"
                className="inline-flex h-9 items-center gap-1.5 rounded-control px-2.5 text-small font-medium text-fg-muted transition-colors duration-150 hover:bg-subtle hover:text-fg"
                title="Hide this conversation until a new message arrives"
              >
                <EyeOff className="size-4" aria-hidden="true" />
                <span className="max-sm:sr-only">Hide</span>
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
      </MessagesFrame>
    </>
  );
}
