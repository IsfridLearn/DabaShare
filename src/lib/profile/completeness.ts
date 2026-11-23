// What a profile still needs to be useful for matching (unit-tested).
export type CompletenessInput = {
  avatar_path: string | null;
  program: string | null;
  bio: string | null;
  teaches: unknown[];
  learns: unknown[];
  interestIds: unknown[];
};

export type CompletenessItem = { key: string; label: string; done: boolean; href: string };

export function profileCompleteness(p: CompletenessInput) {
  const items: CompletenessItem[] = [
    { key: "teach", label: "Add a skill you can teach", done: p.teaches.length > 0, href: "#skills" },
    { key: "learn", label: "Add a skill you want to learn", done: p.learns.length > 0, href: "#skills" },
    { key: "interests", label: "Pick your learning interests", done: p.interestIds.length > 0, href: "#interests" },
    { key: "photo", label: "Add a profile photo", done: Boolean(p.avatar_path), href: "#about" },
    { key: "program", label: "Add your course or program", done: Boolean(p.program?.trim()), href: "#about" },
    { key: "bio", label: "Write a short bio", done: Boolean(p.bio?.trim()), href: "#about" },
  ];
  const done = items.filter((i) => i.done).length;
  return { items, done, total: items.length, percent: Math.round((done / items.length) * 100) };
}
