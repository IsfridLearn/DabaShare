"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function ErrorBoundary({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    // Error monitoring is wired up in Phase 10; until then log to the console.
    console.error(error);
  }, [error]);

  return (
    <main className="mx-auto flex max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-16 text-center">
      <h1 className="text-2xl font-bold">Something went wrong</h1>
      <p className="text-gray-600">
        We couldn&apos;t load this page. Check your connection and try again.
      </p>
      <Button onClick={() => retry()}>Try again</Button>
    </main>
  );
}
