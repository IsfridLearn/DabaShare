import type { Enums } from "@/lib/supabase/database.types";

export const REPORT_TARGETS = ["profile", "course", "message", "session", "post"] as const satisfies readonly Enums<"report_target">[];
export type ReportTarget = (typeof REPORT_TARGETS)[number];

export const REPORT_REASONS: { value: Enums<"report_reason">; label: string }[] = [
  { value: "harassment", label: "Harassment or bullying" },
  { value: "inappropriate", label: "Inappropriate or offensive content" },
  { value: "scam", label: "Scam, fraud or asking for money unfairly" },
  { value: "spam", label: "Spam or advertising" },
  { value: "other", label: "Something else" },
];

export const TARGET_LABEL: Record<ReportTarget, string> = {
  profile: "profile",
  course: "course",
  message: "message",
  session: "study session",
  post: "post",
};
