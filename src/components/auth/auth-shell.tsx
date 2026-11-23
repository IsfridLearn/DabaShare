import Link from "next/link";
import type { ReactNode } from "react";
import { Logo } from "@/components/ui/logo";

// Prototype look for the sign-in pages: soft gradient, blurred blobs, centred card.
export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-linear-135 from-[#f0f4ff] via-[#fafbff] to-[#f5f0ff]">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 size-[500px] rounded-full bg-blue-200 opacity-30 blur-[80px]" />
        <div className="absolute right-24 -bottom-20 size-[400px] rounded-full bg-violet-200 opacity-30 blur-[80px]" />
      </div>
      <header className="relative px-4 py-6 sm:px-12">
        <Link href="/" className="text-brand" aria-label="DabaShare home">
          <Logo />
        </Link>
      </header>
      <main className="relative flex flex-1 items-start justify-center px-4 pt-4 pb-16 sm:pt-10">
        <div className="w-full max-w-md rounded-card border border-gray-200 bg-white p-6 shadow-card-lg sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}

export function AuthHeading({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-bold">{title}</h1>
      {subtitle && <p className="mt-1.5 text-gray-600">{subtitle}</p>}
    </div>
  );
}
