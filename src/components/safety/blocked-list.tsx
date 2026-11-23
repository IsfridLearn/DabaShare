import { unblockStudent } from "@/lib/safety/actions";
import { Button } from "@/components/ui/button";

export type BlockedStudent = { blocked_id: string; display_name: string; username: string | null };

export function BlockedList({ blocked }: { blocked: BlockedStudent[] }) {
  if (!blocked.length) return <p className="text-sm text-gray-500">You haven&apos;t blocked anyone.</p>;
  return (
    <ul className="divide-y divide-gray-100">
      {blocked.map((b) => (
        <li key={b.blocked_id} className="flex items-center justify-between gap-3 py-2.5">
          <span className="min-w-0 truncate text-sm">
            <span className="font-medium text-gray-900">{b.display_name}</span>
            {b.username && <span className="ml-2 text-gray-500">@{b.username}</span>}
          </span>
          <form action={unblockStudent.bind(null, b.blocked_id)}>
            <Button type="submit" variant="outline" size="sm">
              Unblock
            </Button>
          </form>
        </li>
      ))}
    </ul>
  );
}
