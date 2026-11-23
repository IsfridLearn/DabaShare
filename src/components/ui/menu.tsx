"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

// Dropdown built on <details>, so it opens without JavaScript. With JS it also
// closes on outside click, on Escape (returning focus) and after navigation.
export function Menu({
  summary,
  summaryClassName,
  panelClassName,
  children,
}: {
  summary: ReactNode;
  summaryClassName: string;
  panelClassName: string;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    ref.current?.removeAttribute("open");
  }, [pathname]);

  useEffect(() => {
    const onPointer = (e: MouseEvent) => {
      if (ref.current?.open && !ref.current.contains(e.target as Node)) ref.current.open = false;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && ref.current?.open) {
        ref.current.open = false;
        ref.current.querySelector("summary")?.focus();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  return (
    <details ref={ref} className="relative">
      <summary className={`${summaryClassName} cursor-pointer list-none focus-visible:outline-2 focus-visible:outline-brand [&::-webkit-details-marker]:hidden`}>
        {summary}
      </summary>
      <div className={panelClassName}>{children}</div>
    </details>
  );
}
