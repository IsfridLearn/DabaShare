import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// Full-height two-pane frame shared by the inbox and a conversation.
// Phones show one pane at a time; from md up the list sits beside the chat.
// Heights: the phone shell has a 57px top bar and a 57px tab bar (plus the
// safe area); on desktop the main column has 2.5rem of padding top and bottom.
export function MessagesFrame({
  title,
  titleAs: Title = "h1",
  notice,
  list,
  children,
  conversationOpen,
}: {
  title: string;
  titleAs?: "h1" | "h2";
  notice?: ReactNode;
  list: ReactNode;
  children: ReactNode;
  conversationOpen: boolean;
}) {
  return (
    <div className="-mx-4 -mt-5 -mb-28 flex h-[calc(100dvh-7.125rem-env(safe-area-inset-bottom))] flex-col sm:-mx-6 lg:m-0 lg:h-[calc(100dvh-5rem)]">
      <div className="grid min-h-0 flex-1 overflow-hidden bg-surface md:grid-cols-[20rem_minmax(0,1fr)] lg:rounded-card lg:border lg:border-line">
        <div className={cn("min-h-0 flex-col md:border-r md:border-line", conversationOpen ? "hidden md:flex" : "flex")}>
          <div className="flex h-14 shrink-0 items-center border-b border-line px-4">
            <Title className="text-[1.375rem] leading-none font-semibold [font-stretch:78%] text-fg">{title}</Title>
          </div>
          {notice && <div className="border-b border-line p-3">{notice}</div>}
          <div className="min-h-0 flex-1 overflow-y-auto">{list}</div>
        </div>
        <div className={cn("min-h-0 flex-col", conversationOpen ? "flex" : "hidden md:flex")}>{children}</div>
      </div>
    </div>
  );
}
