import { MessagesSquare } from "lucide-react";
import { ConversationList } from "@/components/messages/conversation-list";
import { InboxLive } from "@/components/messages/inbox-live";
import { MessagesFrame } from "@/components/messages/messages-frame";
import { Alert } from "@/components/ui/alert";
import { NoticeToast } from "@/components/ui/toast";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getInbox } from "@/lib/messages/queries";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Messages" };

const NOTICES: Record<string, { tone: "info" | "success" | "error"; text: string }> = {
  blocked: { tone: "success", text: "Student blocked. You can unblock them in Settings." },
  unavailable: { tone: "error", text: "That conversation isn't available." },
  hidden: { tone: "info", text: "Conversation hidden. It comes back if a new message arrives." },
};

export default async function MessagesPage({ searchParams }: PageProps<"/messages">) {
  const me = await requireOnboardedProfile();
  const [items, query] = await Promise.all([getInbox(), searchParams]);
  const notice = typeof query.notice === "string" ? NOTICES[query.notice] : undefined;

  return (
    <>
      <InboxLive />
      {notice && notice.tone !== "error" && <NoticeToast key={notice.text} tone={notice.tone} message={notice.text} />}
      <MessagesFrame
        title="Messages"
        conversationOpen={false}
        notice={notice?.tone === "error" && <Alert tone="error">{notice.text}</Alert>}
        list={<ConversationList items={items} meId={me.id} />}
      >
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <span aria-hidden="true" className="flex size-10 items-center justify-center rounded-full bg-subtle text-fg-muted">
            <MessagesSquare className="size-5" />
          </span>
          <p className="max-w-xs text-small text-fg-muted">
            {items.length ? "Select a conversation to read and reply." : "Your conversations will appear here."}
          </p>
        </div>
      </MessagesFrame>
    </>
  );
}
