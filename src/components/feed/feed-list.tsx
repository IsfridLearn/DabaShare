"use client";

import { useState, useTransition, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { loadMorePosts } from "@/lib/feed/actions";
import type { FeedPost } from "@/lib/feed/queries";
import type { FeedScope } from "@/lib/feed/validation";
import { PostItem } from "./post-item";

// The server renders the first page; "Load more" appends older posts here.
// Remount this (via `key`) when the first page changes, e.g. after posting.
export function FeedList({
  initial,
  initialHasMore,
  scope,
  meId,
  onlyAuthor,
  empty,
  label,
}: {
  initial: FeedPost[];
  initialHasMore: boolean;
  scope: FeedScope;
  meId: string;
  onlyAuthor?: string;
  empty: ReactNode;
  label: string;
}) {
  const [older, setOlder] = useState<FeedPost[]>([]);
  const [hasMore, setHasMore] = useState(initialHasMore);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const seen = new Set<string>();
  const posts = [...initial, ...older].filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  function loadMore() {
    const last = [...initial, ...older].at(-1);
    if (!last) return;
    setError(null);
    startTransition(async () => {
      try {
        const page = await loadMorePosts(scope, last.created_at, last.id, onlyAuthor);
        setOlder((prev) => [...prev, ...page.posts]);
        setHasMore(page.hasMore);
      } catch {
        setError("We couldn't load more posts. Please try again.");
      }
    });
  }

  if (!posts.length && !hasMore) return <>{empty}</>;

  return (
    <div>
      <ul aria-label={label} className="divide-y divide-line border-y border-line">
        {posts.map((post) => (
          <li key={post.id}>
            <PostItem post={post} meId={meId} />
          </li>
        ))}
      </ul>
      {(hasMore || error) && (
        <div className="mt-4 flex flex-col items-center gap-2">
          {error && (
            <p role="alert" className="text-small text-danger-ink">
              {error}
            </p>
          )}
          {hasMore && (
            <Button variant="secondary" onClick={loadMore} loading={pending}>
              {pending ? "Loading…" : "Load more"}
            </Button>
          )}
        </div>
      )}
      {!hasMore && posts.length > 5 && <p className="mt-4 text-center text-small text-fg-subtle">You&apos;re all caught up.</p>}
    </div>
  );
}
