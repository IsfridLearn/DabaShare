import type { ReactNode } from "react";
import { AppHeader } from "@/components/app/app-header";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </>
  );
}
