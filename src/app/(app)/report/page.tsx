import { notFound } from "next/navigation";
import { ReportForm } from "@/components/safety/report-form";
import { Card } from "@/components/ui/card";
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
  if (type === "course") {
    const { data } = await supabase.from("courses").select("title").eq("id", id).maybeSingle();
    return data?.title ?? null;
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
      <div>
        <h1 className="text-2xl font-bold">Report a {TARGET_LABEL[target]}</h1>
        <p className="mt-1.5 text-gray-600">
          Reports are private. The student isn&apos;t told who reported them. Our team reviews every report.
        </p>
      </div>
      <Card className="flex flex-col gap-5">
        <blockquote className="rounded-control border-l-4 border-gray-300 bg-gray-50 px-4 py-3 text-sm whitespace-pre-line text-gray-700">
          {summary.length > 300 ? `${summary.slice(0, 299)}…` : summary}
        </blockquote>
        <ReportForm targetType={target} targetId={id} />
      </Card>
    </div>
  );
}
