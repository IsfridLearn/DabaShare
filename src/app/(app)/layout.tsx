import type { ReactNode } from "react";
import { AppHeader } from "@/components/app/app-header";

// Per-user content: navigation waits for the server (loading.tsx shows meanwhile).
export const instant = false;

export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only z-50 rounded-control bg-white px-3 py-2 font-medium text-brand shadow-card focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
      >
        Skip to content
      </a>
      <AppHeader />
      {/* Bottom padding keeps content clear of the mobile tab bar. */}
      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-28 xl:py-8">
        {children}
      </main>
    </>
  );
}
