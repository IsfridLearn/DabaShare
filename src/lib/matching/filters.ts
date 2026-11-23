// Pure helpers for the matches page (unit-tested).

export type MatchMode = "teaches_me" | "learns_from_me";
export type MatchFilters = { mode?: MatchMode; sameUni: boolean; page: number };

export const MATCH_PAGE_SIZE = 20;

export const MATCH_MODES: { value: MatchMode | undefined; label: string }[] = [
  { value: undefined, label: "All matches" },
  { value: "teaches_me", label: "Can teach me" },
  { value: "learns_from_me", label: "Want to learn from me" },
];

export function parseMatchFilters(params: Record<string, string | string[] | undefined>): MatchFilters {
  const one = (key: string) => (typeof params[key] === "string" ? (params[key] as string) : undefined);
  const mode = one("mode");
  const page = Number(one("page"));
  return {
    mode: mode === "teaches_me" || mode === "learns_from_me" ? mode : undefined,
    sameUni: one("uni") === "same",
    page: Number.isInteger(page) && page > 0 ? Math.min(page, 500) : 1,
  };
}

export function matchesHref(filters: Partial<MatchFilters>): string {
  const params = new URLSearchParams();
  if (filters.mode) params.set("mode", filters.mode);
  if (filters.sameUni) params.set("uni", "same");
  if (filters.page && filters.page > 1) params.set("page", String(filters.page));
  const query = params.toString();
  return query ? `/matches?${query}` : "/matches";
}

export type MatchReasonInput = {
  teaches_you: string[];
  learns_from_you: string[];
  shared_interests: string[];
  course_categories: string[];
  same_university: boolean;
  university_short: string | null;
};

export type MatchReason = { tone: "teach" | "learn" | "neutral"; label: string; items: string[] };

// Turns the database's reason arrays into the sentences shown on a match card.
export function matchReasons(match: MatchReasonInput): MatchReason[] {
  const reasons: MatchReason[] = [];
  if (match.teaches_you.length) {
    reasons.push({ tone: "teach", label: "Can teach you", items: match.teaches_you });
  }
  if (match.learns_from_you.length) {
    reasons.push({ tone: "learn", label: "Wants to learn from you", items: match.learns_from_you });
  }
  if (match.shared_interests.length) {
    reasons.push({ tone: "neutral", label: "Shared interests", items: match.shared_interests });
  }
  if (match.course_categories.length) {
    reasons.push({ tone: "neutral", label: "Offers courses in", items: match.course_categories });
  }
  if (match.same_university) {
    reasons.push({ tone: "neutral", label: "Also studies at", items: [match.university_short ?? "your university"] });
  }
  return reasons;
}

export function isSkillSwap(match: Pick<MatchReasonInput, "teaches_you" | "learns_from_you">): boolean {
  return match.teaches_you.length > 0 && match.learns_from_you.length > 0;
}
