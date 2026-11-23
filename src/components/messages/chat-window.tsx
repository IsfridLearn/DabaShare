"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { loadOlderMessages, markConversationRead, sendMessage, type SendState } from "@/lib/messages/actions";
import { dayKey, formatClock, formatDayLabel, MESSAGE_MAX } from "@/lib/messages/format";
import type { ChatMessage } from "@/lib/messages/queries";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/button";
import { FormMessage } from "@/components/ui/form-message";

const initialSend: SendState = { status: "idle" };
const NEAR_BOTTOM_PX = 80;

function mergeSorted(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const byId = new Map(current.map((m) => [m.id, m]));
  for (const m of incoming) byId.set(m.id, m);
  return [...byId.values()].sort((a, b) => a.created_at.localeCompare(b.created_at));
}

export function ChatWindow({
  conversationId,
  meId,
  otherName,
  initialMessages,
  initialHasMore,
  canSend,
}: {
  conversationId: string;
  meId: string;
  otherName: string;
  initialMessages: ChatMessage[];
  initialHasMore: boolean;
  canSend: boolean;
}) {
  const [messages, setMessages] = useState(initialMessages);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [unseen, setUnseen] = useState(0);
  const [loadingOlder, startLoadingOlder] = useTransition();
  const [state, action, pending] = useActionState(sendMessage.bind(null, conversationId), initialSend);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollerRef = useRef<HTMLDivElement>(null);
  const nearBottom = useRef(true);
  const prependFrom = useRef<number | null>(null);

  const markRead = useCallback(() => {
    if (document.visibilityState === "visible") void markConversationRead(conversationId);
  }, [conversationId]);

  const scrollToBottom = useCallback(() => {
    const el = scrollerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
    setUnseen(0);
  }, []);

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
          if (m.sender_id !== meId) {
            markRead();
            if (!nearBottom.current) setUnseen((n) => n + 1);
          }
        },
      )
      .subscribe();
    document.addEventListener("visibilitychange", markRead);
    return () => {
      document.removeEventListener("visibilitychange", markRead);
      supabase.removeChannel(channel);
    };
  }, [conversationId, meId, markRead]);

  // Our own sent message shows straight away (realtime de-duplicates it), and
  // the composer keeps focus so the phone keyboard stays open.
  const sent = state.sent;
  useEffect(() => {
    if (!sent) return;
    nearBottom.current = true;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMessages((current) => mergeSorted(current, [sent]));
    inputRef.current?.focus();
  }, [sent]);

  // Keep the reader's place: stick to the bottom only if they were already
  // there, and keep the same messages in view after loading older ones.
  useLayoutEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    if (prependFrom.current !== null) {
      el.scrollTop += el.scrollHeight - prependFrom.current;
      prependFrom.current = null;
    } else if (nearBottom.current) {
      el.scrollTop = el.scrollHeight;
    }
  }, [messages]);

  function onScroll() {
    const el = scrollerRef.current;
    if (!el) return;
    nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
    if (nearBottom.current && unseen) setUnseen(0);
  }

  function loadOlder() {
    const oldest = messages[0];
    if (!oldest) return;
    startLoadingOlder(async () => {
      const older = await loadOlderMessages(conversationId, oldest.created_at);
      prependFrom.current = scrollerRef.current?.scrollHeight ?? null;
      setMessages((current) => mergeSorted(current, older.messages));
      setHasMore(older.hasMore);
    });
  }

  return (
    <div className="relative flex min-h-0 flex-1 flex-col">
      <div
        ref={scrollerRef}
        onScroll={onScroll}
        role="log"
        aria-label={`Messages with ${otherName}`}
        aria-relevant="additions"
        aria-busy={loadingOlder}
        tabIndex={0}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-4 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand sm:px-4"
      >
        {hasMore && (
          <div className="mb-4 text-center">
            <Button variant="ghost" size="sm" onClick={loadOlder} disabled={loadingOlder}>
              {loadingOlder ? "Loading…" : "Load earlier messages"}
            </Button>
          </div>
        )}
        {!messages.length && (
          <p className="py-10 text-center text-sm text-gray-600">No messages yet. Say hello to {otherName}!</p>
        )}
        <ol className="flex flex-col gap-2">
          {messages.map((m, i) => {
            const mine = m.sender_id === meId;
            const newDay = i === 0 || dayKey(new Date(messages[i - 1].created_at)) !== dayKey(new Date(m.created_at));
            return (
              <li key={m.id} className="flex flex-col">
                {newDay && (
                  <span className="my-3 self-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600">
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
                    <span className="sr-only">{mine ? "You" : otherName}: </span>
                    {m.body}
                  </p>
                  <span className="mt-0.5 flex items-center gap-1 px-1 text-xs text-gray-600">
                    <time dateTime={m.created_at}>{formatClock(m.created_at)}</time>
                    {!mine && (
                      <Link
                        href={`/report?type=message&id=${m.id}`}
                        className="rounded px-1.5 py-1 opacity-0 group-hover:opacity-100 hover:text-danger focus:opacity-100 [@media(hover:none)]:opacity-100"
                        aria-label={`Report message from ${otherName}`}
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
      </div>

      {unseen > 0 && (
        <button
          type="button"
          onClick={scrollToBottom}
          className="absolute bottom-28 left-1/2 -translate-x-1/2 rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white shadow-card-lg"
        >
          {unseen === 1 ? "1 new message" : `${unseen} new messages`} ↓
        </button>
      )}

      {canSend ? (
        <form ref={formRef} action={action} className="flex flex-col gap-2 border-t border-gray-200 bg-white p-3" noValidate>
          {state.status === "error" && <FormMessage state={state} />}
          <div className="flex items-end gap-2">
            <label htmlFor="body" className="sr-only">
              Message to {otherName}
            </label>
            <textarea
              ref={inputRef}
              id="body"
              name="body"
              rows={1}
              maxLength={MESSAGE_MAX}
              placeholder="Type a message…"
              defaultValue={state.status === "error" ? state.values?.body : ""}
              onKeyDown={(e) => {
                // Enter sends only with a physical keyboard; on phones Enter is a new line.
                const physicalKeyboard = window.matchMedia("(pointer: fine)").matches;
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && physicalKeyboard) {
                  e.preventDefault();
                  if (!pending) formRef.current?.requestSubmit();
                }
              }}
              className="field-sizing-content max-h-40 min-h-11 flex-1 resize-none rounded-control border-[1.5px] border-gray-200 px-3.5 py-2.5 text-base focus:border-brand focus:ring-3 focus:ring-brand/15 focus:outline-none md:text-[0.95rem]"
            />
            <Button
              type="submit"
              disabled={pending}
              className="min-w-22"
              // Keep focus (and the phone keyboard) in the composer.
              onMouseDown={(e) => e.preventDefault()}
            >
              {pending ? "Sending…" : "Send"}
            </Button>
          </div>
          <p className="hidden text-xs text-gray-600 [@media(pointer:fine)]:block">Enter to send · Shift+Enter for a new line</p>
        </form>
      ) : (
        <p className="border-t border-gray-200 p-4 text-center text-sm text-gray-600">
          Messaging isn&apos;t available in this conversation because one of you blocked the other.
        </p>
      )}
    </div>
  );
}
