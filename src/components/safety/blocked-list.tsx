import { unblockStudent } from "@/lib/safety/actions";
import { Button } from "@/components/ui/button";
import { RowList } from "@/components/ui/primitives";

export type BlockedStudent = { blocked_id: string; display_name: string; username: string | null };

export function BlockedList({ blocked }: { blocked: BlockedStudent[] }) {
  if (!blocked.length) return <p className="text-small text-fg-subtle">You haven&apos;t blocked anyone.</p>;
  return (
    <RowList label="Blocked students">
      {blocked.map((b) => (
        <li key={b.blocked_id} className="flex items-center justify-between gap-3 px-4 py-2.5">
          <span className="min-w-0 truncate text-small">
            <span className="font-medium text-fg">{b.display_name}</span>
            {b.username && <span className="ml-2 text-fg-subtle">@{b.username}</span>}
          </span>
          <form action={unblockStudent.bind(null, b.blocked_id)}>
            <Button type="submit" variant="secondary" size="sm">
              Unblock
            </Button>
          </form>
        </li>
      ))}
    </RowList>
  );
}
