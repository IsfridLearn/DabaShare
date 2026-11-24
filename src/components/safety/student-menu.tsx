import { Ellipsis } from "lucide-react";
import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
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
  const item = "block rounded-[4px] px-2.5 py-2 text-small text-fg hover:bg-subtle";
  return (
    <Menu
      summaryClassName="flex size-9 items-center justify-center rounded-control text-fg-muted transition-colors duration-150 hover:bg-subtle hover:text-fg"
      panelClassName={`absolute z-30 mt-1 w-64 max-w-[calc(100vw-2rem)] rounded-card border border-line bg-surface p-1 shadow-overlay ${align === "right" ? "right-0" : "left-0"}`}
      summary={
        <>
          <Ellipsis className="size-4" aria-hidden="true" />
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
        <div className="m-1 rounded-control border border-danger/25 bg-danger-soft p-3 text-small text-fg">
          <p>You won&apos;t see each other anymore, they can&apos;t message you, and shared enrollments and sessions are cancelled.</p>
          <form action={blockStudent.bind(null, studentId)} className="mt-2">
            <button type="submit" className={buttonClasses({ variant: "danger", size: "sm", fullWidth: true })}>
              Yes, block
            </button>
          </form>
        </div>
      </details>
    </Menu>
  );
}
