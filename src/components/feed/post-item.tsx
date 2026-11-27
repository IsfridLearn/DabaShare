"use client";

import { ArrowUpRight, Ellipsis } from "lucide-react";
import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Avatar } from "@/components/ui/avatar";
import { Menu } from "@/components/ui/menu";
import { deletePost } from "@/lib/feed/actions";
import type { FeedPost } from "@/lib/feed/queries";
import { formatWhen, relativeTime } from "@/lib/feed/validation";
import { formatPrice } from "@/lib/courses/validation";
import { typeLabel } from "@/lib/sessions/validation";
import { LikeButton } from "./like-button";

// One post: author line, text, optional session/course card, like and menu.
export function PostItem({ post, meId }: { post: FeedPost; meId: string }) {
  const [deleted, deleteAction] = useActionState(deletePost, { deleted: false });
  const mine = post.author_id === meId;
  const profileHref = post.author_username ? `/u/${post.author_username}` : null;
  const meta = [post.author_program, post.author_university].filter(Boolean).join(" · ");

  if (deleted.deleted) {
    return (
      <p role="status" className="py-5 text-small text-fg-subtle">
        Post deleted.
      </p>
    );
  }

  return (
    <article aria-labelledby={`post-${post.id}-author`} className="flex gap-3 py-5">
      {profileHref ? (
        <Link href={profileHref} className="shrink-0 self-start rounded-full" tabIndex={-1} aria-hidden="true">
          <Avatar name={post.author_name} path={post.author_avatar} size={36} />
        </Link>
      ) : (
        <Avatar name={post.author_name} path={post.author_avatar} size={36} />
      )}
      <div className="min-w-0 flex-1">
        <header className="flex items-start gap-2">
          <div className="min-w-0 flex-1 leading-tight">
            <p className="flex flex-wrap items-baseline gap-x-1.5">
              {profileHref ? (
                <Link id={`post-${post.id}-author`} href={profileHref} className="font-semibold text-fg hover:underline">
                  {post.author_name}
                </Link>
              ) : (
                <span id={`post-${post.id}-author`} className="font-semibold text-fg">
                  {post.author_name}
                </span>
              )}
              <span aria-hidden="true" className="text-fg-subtle">·</span>
              <Link href={`/posts/${post.id}`} className="text-small text-fg-subtle hover:underline">
                <time dateTime={post.created_at} title={formatWhen(post.created_at)} suppressHydrationWarning>
                  {relativeTime(post.created_at)}
                </time>
                {post.edited_at && <span> · edited</span>}
              </Link>
            </p>
            {meta && <p className="mt-0.5 truncate text-small text-fg-muted">{meta}</p>}
          </div>
          <PostMenu post={post} mine={mine} deleteAction={deleteAction} error={deleted.error} />
        </header>

        <p className="mt-2 break-words whitespace-pre-line text-fg">{post.body}</p>

        {/* Attachments read like a catalogue reference, not a box in a box. */}
        {post.session_id && (
          <Attachment
            href={`/sessions/${post.session_id}`}
            label={`${typeLabel(post.session_type)} · ${formatWhen(post.session_starts_at)}`}
            title={post.session_title}
          />
        )}
        {post.course_id && (
          <Attachment href={`/courses/${post.course_id}`} label={`Course · ${formatPrice(post.course_price)}`} title={post.course_title} />
        )}

        <div className="-ml-2 mt-2 flex items-center">
          <LikeButton postId={post.id} liked={post.liked_by_me} count={post.like_count} />
        </div>
      </div>
    </article>
  );
}

function Attachment({ href, label, title }: { href: string; label: string; title: string | null }) {
  return (
    <Link
      href={href}
      className="group mt-3 flex items-start gap-3 border-l-2 border-brand py-0.5 pl-3 transition-colors duration-150"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-label text-brand-ink">{label}</span>
        <span className="mt-1 block truncate font-medium text-fg decoration-line-strong underline-offset-4 group-hover:underline">{title}</span>
      </span>
      <ArrowUpRight className="mt-1 size-4 shrink-0 text-fg-subtle transition-colors group-hover:text-fg" aria-hidden="true" />
    </Link>
  );
}

function PostMenu({
  post,
  mine,
  deleteAction,
  error,
}: {
  post: FeedPost;
  mine: boolean;
  deleteAction: (formData: FormData) => void;
  error?: string;
}) {
  const item = "block w-full rounded-[4px] px-3 py-2 text-left text-small text-fg hover:bg-subtle";

  return (
    <Menu
      summaryClassName="-mt-1 -mr-1 flex size-8 items-center justify-center rounded-control text-fg-subtle hover:bg-subtle hover:text-fg"
      panelClassName="absolute right-0 z-30 mt-1 w-56 rounded-control border border-line bg-surface p-1 shadow-overlay"
      summary={
        <>
          <Ellipsis className="size-4" aria-hidden="true" />
          <span className="sr-only">Post options</span>
        </>
      }
    >
      <Link href={`/posts/${post.id}`} className={item}>
        Open post
      </Link>
      {mine ? (
        <details>
          <summary className={`${item} cursor-pointer list-none text-danger-ink [&::-webkit-details-marker]:hidden`}>
            Delete post…
          </summary>
          <div className="m-1 rounded-[4px] bg-danger-soft p-3 text-small text-fg">
            <p>This removes the post and its likes for everyone.</p>
            <form action={deleteAction}>
              <input type="hidden" name="postId" value={post.id} />
              <DeleteSubmit />
            </form>
            {error && (
              <p role="alert" className="mt-2 text-danger-ink">
                {error}
              </p>
            )}
          </div>
        </details>
      ) : (
        <>
          {post.author_username && (
            <Link href={`/u/${post.author_username}`} className={item}>
              View {post.author_name}&apos;s profile
            </Link>
          )}
          <Link href={`/report?type=post&id=${post.id}`} className={item}>
            Report post
          </Link>
        </>
      )}
    </Menu>
  );
}

function DeleteSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="mt-2 w-full rounded-control bg-danger px-3 py-1.5 font-medium text-white hover:bg-danger-dark disabled:opacity-55"
    >
      {pending ? "Deleting…" : "Yes, delete"}
    </button>
  );
}
