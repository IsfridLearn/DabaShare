// Joins class names, skipping falsy values. Tailwind conflicts are resolved by
// writing components so callers only add classes, never override them.
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(" ");
}
