import { notFound } from "next/navigation";
import { ReportForm } from "@/components/safety/report-form";
import { PageHeader } from "@/components/ui/primitives";
import { requireOnboardedProfile } from "@/lib/auth/session";
import { isUuid } from "@/lib/courses/queries";
import { REPORT_TARGETS, TARGET_LABEL, type ReportTarget } from "@/lib/safety/options";
import { createClient } from "@/lib/supabase/server";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export const metadata = { title: "Report" };

// A short preview of what is being reported, if the reporter can see it (RLS).
async function preview(type: ReportTarget, id: string): Promise<string | null> {
  const supabase = await createClient();
  if (type === "message") {
    const { data } = await supabase.from("messages").select("body").eq("id", id).maybeSingle();
    return data?.body ?? null;
  }
  if (type === "profile") {
    const { data } = await supabase.from("profiles").select("display_name").eq("id", id).maybeSingle();
    return data?.display_name ?? null;
  }
  if (type === "post") {
    const { data } = await supabase.from("posts").select("body").eq("id", id).maybeSingle();
    return data?.body ?? null;
  }
  if (type === "course") {
    const { data } = await supabase.from("courses").select("title").eq("id", id).maybeSingle();
    return data?.title ?? null;
  }
  if (type === "review") {
    const { data } = await supabase.from("course_reviews").select("rating, body").eq("id", id).maybeSingle();
    if (!data) return null;
    return `${data.rating} out of 5${data.body ? `: ${data.body}` : ""}`;
  }
  const { data } = await supabase.from("study_sessions").select("title").eq("id", id).maybeSingle();
  return data?.title ?? null;
}

export default async function ReportPage({ searchParams }: PageProps<"/report">) {
  await requireOnboardedProfile();
  const { type, id } = await searchParams;
  if (typeof type !== "string" || typeof id !== "string" || !isUuid(id)) notFound();
  if (!(REPORT_TARGETS as readonly string[]).includes(type)) notFound();
  const target = type as ReportTarget;
  const summary = await preview(target, id);
  if (summary === null) notFound();

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <PageHeader
        title={`Report a ${TARGET_LABEL[target]}`}
        description="Reports are private. The student isn't told who reported them. Our team reviews every report."
      />
      <div className="flex flex-col gap-6">
        <blockquote className="border-l-2 border-line-strong py-1 pl-4 text-small break-words whitespace-pre-line text-fg-muted">
          {summary.length > 300 ? `${summary.slice(0, 299)}…` : summary}
        </blockquote>
        <ReportForm targetType={target} targetId={id} />
      </div>
    </div>
  );
}
