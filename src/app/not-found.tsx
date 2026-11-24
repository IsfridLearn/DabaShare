import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-title">Page not found</h1>
      <p className="text-fg-muted">The page you&apos;re looking for doesn&apos;t exist or was removed.</p>
      <Link href="/" className={buttonClasses()}>
        Go to DabaShare
      </Link>
    </main>
  );
}
