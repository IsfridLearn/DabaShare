import { ConversationList } from "@/components/messages/conversation-list";
import { InboxLive } from "@/components/messages/inbox-live";
import { Alert } from "@/components/ui/alert";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { getInbox } from "@/lib/messages/queries";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Messages" };

const NOTICES: Record<string, { tone: "info" | "success" | "error"; text: string }> = {
  blocked: { tone: "success", text: "Student blocked. You can unblock them in Settings." },
  unavailable: { tone: "error", text: "That conversation isn't available." },
};

export default async function MessagesPage({ searchParams }: PageProps<"/messages">) {
  const me = await requireOnboardedProfile();
  const [items, query] = await Promise.all([getInbox(), searchParams]);
  const notice = typeof query.notice === "string" ? NOTICES[query.notice] : undefined;

  return (
    <div className="flex flex-col gap-4">
      <InboxLive />
      <h1 className="text-2xl font-bold">Messages</h1>
      {notice && <Alert tone={notice.tone}>{notice.text}</Alert>}
      <div className="grid overflow-hidden rounded-card border border-gray-200 bg-white shadow-card md:h-[calc(100dvh-14rem)] md:grid-cols-[20rem_minmax(0,1fr)]">
        <div className="overflow-y-auto md:border-r md:border-gray-200">
          <ConversationList items={items} meId={me.id} />
        </div>
        <div className="hidden items-center justify-center p-8 text-center text-gray-500 md:flex">
          {items.length ? "Select a conversation to read and reply." : "Your conversations will appear here."}
        </div>
      </div>
    </div>
  );
}
