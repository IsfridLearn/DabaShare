import Link from "next/link";
import { blockStudent } from "@/lib/safety/actions";

// "More" menu for another student: view profile, report, block.
// Native <details>, so it works without JavaScript.
export function StudentMenu({ studentId, username }: { studentId: string; username?: string | null }) {
  return (
    <details className="relative">
      <summary
        className="flex size-9 cursor-pointer list-none items-center justify-center rounded-control text-gray-500 hover:bg-gray-100 hover:text-gray-800 [&::-webkit-details-marker]:hidden"
        aria-label="More options"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="2" />
          <circle cx="12" cy="12" r="2" />
          <circle cx="19" cy="12" r="2" />
        </svg>
      </summary>
      <div className="absolute right-0 z-30 mt-1 w-64 rounded-control border border-gray-200 bg-white p-1 shadow-card-lg">
        {username && (
          <Link href={`/u/${username}`} className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100">
            View profile
          </Link>
        )}
        <Link
          href={`/report?type=profile&id=${studentId}`}
          className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
        >
          Report this student
        </Link>
        <form action={blockStudent.bind(null, studentId)}>
          <button
            type="submit"
            className="block w-full rounded-md px-3 py-2 text-left text-sm text-danger hover:bg-danger-soft"
          >
            Block this student
            <span className="block text-xs text-gray-500">
              You won&apos;t see each other, and they can&apos;t message you.
            </span>
          </button>
        </form>
      </div>
    </details>
  );
}
