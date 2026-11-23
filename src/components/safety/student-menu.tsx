import Link from "next/link";
import { Menu } from "@/components/ui/menu";
import { blockStudent } from "@/lib/safety/actions";

// "More" menu for another student: view profile, report, block.
// Blocking needs a second, explicit confirmation (nested <details>).
export function StudentMenu({
  studentId,
  username,
  align = "right",
}: {
  studentId: string;
  username?: string | null;
  align?: "left" | "right";
}) {
  const item = "block rounded-md px-3 py-2.5 text-sm text-gray-700 hover:bg-gray-100";
  return (
    <Menu
      summaryClassName="flex size-11 items-center justify-center rounded-control text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      panelClassName={`absolute z-30 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-control border border-gray-200 bg-surface p-1 shadow-card-lg ${align === "right" ? "right-0" : "left-0"}`}
      summary={
        <>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="5" cy="12" r="2" />
            <circle cx="12" cy="12" r="2" />
            <circle cx="19" cy="12" r="2" />
          </svg>
          <span className="sr-only">More options</span>
        </>
      }
    >
      {username && (
        <Link href={`/u/${username}`} className={item}>
          View profile
        </Link>
      )}
      <Link href={`/report?type=profile&id=${studentId}`} className={item}>
        Report this student
      </Link>
      <details className="group">
        <summary className={`${item} cursor-pointer list-none text-danger-ink [&::-webkit-details-marker]:hidden`}>
          Block this student…
        </summary>
        <div className="m-1 rounded-md bg-danger-soft p-3 text-sm text-red-900">
          <p>You won&apos;t see each other anymore, they can&apos;t message you, and shared enrollments and sessions are cancelled.</p>
          <form action={blockStudent.bind(null, studentId)} className="mt-2">
            <button type="submit" className="w-full rounded-control bg-danger px-3 py-2 font-semibold text-white hover:bg-red-700">
              Yes, block
            </button>
          </form>
        </div>
      </details>
    </Menu>
  );
}
