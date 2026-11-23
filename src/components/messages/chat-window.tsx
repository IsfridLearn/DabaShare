"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState, useTransition } from "react";
import { loadOlderMessages, markConversationRead, sendMessage, type SendState } from "@/lib/messages/actions";
import { dayKey, formatClock, formatDayLabel, MESSAGE_MAX } from "@/lib/messages/format";
import type { ChatMessage } from "@/lib/messages/queries";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";

const initialSend: SendState = { status: "idle" };

function mergeSorted(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function ChatWindow({
  conversationId,
  meId,
  initialMessages,
  initialHasMore,
  canSend,
}: {
  conversationId: string;
  meId: string;
  initialMessages: ChatMessage[];
  initialHasMore: boolean;
  canSend: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [loadingOlder, startLoadingOlder] = useTransition();
  const [state, action, pending] = useActionState(sendMessage.bind(null, conversationId), initialSend);
  const formRef = useRef<HTMLFormElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  const markRead = useCallback(() => {
    if (document.visibilityState === "visible") void markConversationRead(conversationId);
  }, [conversationId]);

  // Realtime: new messages in this conversation (RLS-filtered by Supabase).
  useEffect(() => {
    markRead();
    const supabase = createClient();
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const m = payload.new as ChatMessage & { conversation_id: string };
          setMessages((current) => mergeSorted(current, [m]));
          if (m.sender_id !== meId) markRead();
        },
      )
      .subscribe();
    document.addEventListener("visibilitychange", markRead);
    return () => {
      document.removeEventListener("visibilitychange", markRead);
      supabase.removeChannel(channel);
    };
  }, [conversationId, meId, markRead]);

  // Show our own message straight away (realtime will de-duplicate it).
  // This syncs local state from the action result: setState in an effect is
  // the intended pattern here, not a cascading render.
  const sent = state.sent;
  useEffect(() => {
    if (sent) {
      stickToBottom.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMessages((current) => mergeSorted(current, [sent]));
    }
  }, [sent]);

  useEffect(() => {
    if (stickToBottom.current) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  function loadOlder() {
    const oldest = messages[0];
    if (!oldest) return;
    stickToBottom.current = false;
    startLoadingOlder(async () => {
      const older = await loadOlderMessages(conversationId, oldest.created_at);
      setMessages((current) => mergeSorted(current, older.messages));
      setHasMore(older.hasMore);
    });
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4" aria-live="polite" aria-label="Messages">
        {hasMore && (
          <div className="mb-4 text-center">
            <Button variant="ghost" size="sm" onClick={loadOlder} disabled={loadingOlder}>
              {loadingOlder ? "Loading…" : "Load earlier messages"}
            </Button>
          </div>
        )}
        {!messages.length && (
          <p className="py-10 text-center text-sm text-gray-500">No messages yet. Say hello!</p>
        )}
        <ol className="flex flex-col gap-2">
          {messages.map((m, i) => {
            const mine = m.sender_id === meId;
            const newDay = i === 0 || dayKey(new Date(messages[i - 1].created_at)) !== dayKey(new Date(m.created_at));
            return (
              <li key={m.id} className="flex flex-col">
                {newDay && (
                  <span className="my-3 self-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-500">
                    {formatDayLabel(m.created_at)}
                  </span>
                )}
                <div className={cn("group flex max-w-[85%] flex-col sm:max-w-[70%]", mine ? "items-end self-end" : "items-start self-start")}>
                  <p
                    className={cn(
                      "rounded-2xl px-4 py-2 text-[0.95rem] leading-relaxed break-words whitespace-pre-wrap",
                      mine ? "rounded-br-md bg-brand text-white" : "rounded-bl-md bg-gray-100 text-gray-800",
                    )}
                  >
                    {m.body}
                  </p>
                  <span className="mt-1 flex gap-2 px-1 text-xs text-gray-400">
                    <time dateTime={m.created_at}>{formatClock(m.created_at)}</time>
                    {!mine && (
                      <Link
                        href={`/report?type=message&id=${m.id}`}
                        className="opacity-0 group-hover:opacity-100 hover:text-danger focus:opacity-100 [@media(hover:none)]:opacity-100"
                      >
                        Report
                      </Link>
                    )}
                  </span>
                </div>
              </li>
            );
          })}
        </ol>
        <div ref={bottomRef} />
      </div>

      {canSend ? (
        <form ref={formRef} action={action} className="flex flex-col gap-2 border-t border-gray-200 p-3" noValidate>
          {state.status === "error" && <FormMessage state={state} />}
          <div className="flex items-end gap-2">
            <label htmlFor="body" className="sr-only">
              Message
            </label>
            <textarea
              id="body"
              name="body"
              rows={1}
              maxLength={MESSAGE_MAX}
              placeholder="Type a message…"
              defaultValue={state.status === "error" ? state.values?.body : ""}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault();
                  formRef.current?.requestSubmit();
                }
              }}
              className="max-h-40 min-h-11 flex-1 resize-none rounded-control border-[1.5px] border-gray-200 px-3.5 py-2.5 text-[0.95rem] focus:border-brand focus:ring-3 focus:ring-brand/15 focus:outline-none"
            />
            <Button type="submit" disabled={pending} aria-label="Send message">
              {pending ? "Sending…" : "Send"}
            </Button>
          </div>
          <p className="text-xs text-gray-400">Enter to send · Shift+Enter for a new line</p>
        </form>
      ) : (
        <p className="border-t border-gray-200 p-4 text-center text-sm text-gray-500">
          You can&apos;t send messages in this conversation.
        </p>
      )}
    </div>
  );
}
