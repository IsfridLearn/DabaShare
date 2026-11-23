import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Alert } from "@/components/ui/alert";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Status" };

// Development-only health check: confirms env vars, Supabase connectivity,
// that the migrations ran, and that RLS behaves as expected for this visitor.
export default function StatusPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto w-full max-w-xl flex-1 px-4 py-12">
      <h1 className="mb-6 text-2xl font-bold">Development status</h1>
      <Suspense fallback={<p className="text-gray-500">Checking Supabase…</p>}>
        <SupabaseStatus />
      </Suspense>
    </main>
  );
}

const checks = [
  { table: "universities", membersOnly: false },
  { table: "categories", membersOnly: false },
  { table: "skills", membersOnly: true },
] as const;

async function SupabaseStatus() {
  let supabase;
  try {
    supabase = await createClient();
  } catch (error) {
    return <Alert tone="error">{error instanceof Error ? error.message : String(error)}</Alert>;
  }

  const { data: claims } = await supabase.auth.getClaims();
  const signedIn = Boolean(claims);

  const results = await Promise.all(
    checks.map(async ({ table, membersOnly }) => {
      const { count, error } = await supabase
        .from(table)
        .select("*", { count: "exact", head: true });
      const readable = !error && count !== null;
      const expectedReadable = signedIn || !membersOnly;
      return {
        table,
        ok: readable === expectedReadable,
        label: readable
          ? `${count} rows`
          : `not readable${membersOnly && !signedIn ? " (members only)" : ""}${error?.message ? `: ${error.message}` : ""}`,
      };
    }),
  );

  return (
    <Card className="flex flex-col gap-3">
      <p className="text-sm text-gray-500">{signedIn ? "Signed in" : "Signed out"}</p>
      {results.map(({ table, ok, label }) => (
        <div key={table} className="flex items-center justify-between gap-4">
          <span className="font-medium">{table}</span>
          <span className={ok ? "text-sm text-success-ink" : "text-sm text-danger-ink"}>
            {ok ? "✓ " : "✗ "}
            {label}
          </span>
        </div>
      ))}
    </Card>
  );
}
