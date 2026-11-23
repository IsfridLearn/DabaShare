import type { ReactNode } from "react";
import { AppShell } from "@/components/app/app-shell";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-surface px-3 py-2 font-medium text-brand-ink shadow-overlay focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <AppShell>
        {/* Bottom padding keeps content clear of the mobile tab bar. */}
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:py-10">
          {children}
        </main>
      </AppShell>
    </>
  );
}
