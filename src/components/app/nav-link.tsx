"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

// /courses is active for /courses/123 but not for /courses/mine (its own tab).
export function isActive(pathname: string, href: string, exact = false): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function NavLink({
  href,
  exact,
  exclude,
  className,
  activeClassName,
  children,
}: {
  href: string;
  exact?: boolean;
  exclude?: string[];
  className: string;
  activeClassName: string;
  children: ReactNode;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, href, exact) && !exclude?.some((p) => isActive(pathname, p));
  return (
    <Link href={href} aria-current={active ? "page" : undefined} className={cn(className, active && activeClassName)}>
      {children}
    </Link>
  );
}
