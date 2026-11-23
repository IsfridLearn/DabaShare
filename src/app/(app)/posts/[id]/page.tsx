import Link from "next/link";
import { notFound } from "next/navigation";
import { PostItem } from "@/components/feed/post-item";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { isUuid } from "@/lib/courses/queries";
import { getPost } from "@/lib/feed/queries";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Post" };

export default async function PostPage({ params }: PageProps<"/posts/[id]">) {
  const me = await requireOnboardedProfile();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  // RLS returns nothing for posts you can't see (deleted, blocked, unfinished author).
  const post = await getPost(id, me.id);
  if (!post) notFound();

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link href="/home" className="text-small font-medium text-fg-muted hover:text-fg">
        ← Home
      </Link>
      <h1 className="sr-only">Post by {post.author_name}</h1>
      <div className="rounded-card border border-line bg-surface">
        <PostItem post={post} meId={me.id} />
      </div>
    </div>
  );
}
