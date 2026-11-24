"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Button, buttonClasses } from "@/components/ui/button";

// Errors inside the app keep the header and tab bar, so students can still
// navigate away instead of being stuck on a blank error page.
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div role="alert" className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-title">Something went wrong</h1>
      <p className="text-fg-muted">This page couldn&apos;t load. Check your connection and try again.</p>
      <div className="flex flex-wrap justify-center gap-3">
        <Button onClick={() => retry()}>Try again</Button>
        <Link href="/home" className={buttonClasses({ variant: "secondary" })}>
          Go to home
        </Link>
      </div>
    </div>
  );
}
