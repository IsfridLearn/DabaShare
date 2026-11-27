import type { ReactNode } from "react";
import { Skeleton } from "./primitives";

// Loading placeholders shaped like the real pages, so the layout doesn't jump
// when the content arrives. Each route's loading.tsx picks one.

function Loading({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">Loading…</span>
      <div aria-hidden="true" className="contents">
        {children}
      </div>
    </div>
  );
}

function HeaderSkeleton({ action = true, description = true }: { action?: boolean; description?: boolean }) {
  return (
    <div className="flex items-end justify-between gap-4 border-b border-line pb-6">
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-44" />
        {description && <Skeleton className="h-4 w-72 max-w-[70vw]" />}
      </div>
      {action && <Skeleton className="hidden h-9 w-32 sm:block" />}
    </div>
  );
}

function Rows({ count = 6, avatar = true, tall = false }: { count?: number; avatar?: boolean; tall?: boolean }) {
  return (
    <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="flex items-start gap-3 px-4 py-4 sm:px-5">
          {avatar && <Skeleton className="size-10 shrink-0 rounded-full" />}
          <div className="flex flex-1 flex-col gap-2 pt-0.5">
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-3 w-3/5" />
            {tall && <Skeleton className="h-3 w-1/2" />}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ListPageSkeleton({ avatar = true, width = "max-w-4xl" }: { avatar?: boolean; width?: string }) {
  return (
    <Loading className={`mx-auto flex w-full ${width} flex-col gap-6`}>
      <HeaderSkeleton />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-24" />
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-8 w-32" />
      </div>
      <Rows avatar={avatar} tall />
    </Loading>
  );
}

export function FeedSkeleton() {
  return (
    <Loading className="mx-auto flex w-full max-w-2xl flex-col gap-5 xl:mr-[calc(18rem+2.5rem)]">
      <Skeleton className="h-9 w-28" />
      <Skeleton className="h-28 rounded-card" />
      <div className="flex gap-5 border-b border-line pb-2.5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Rows count={4} tall />
    </Loading>
  );
}

export function CourseGridSkeleton() {
  return (
    <Loading className="flex flex-col gap-6">
      <HeaderSkeleton />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">
        <Skeleton className="col-span-2 h-9 sm:col-span-4 lg:col-span-1" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9" />
        <Skeleton className="h-9 sm:w-20" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="flex h-52 flex-col gap-3 rounded-card border border-line bg-surface p-5">
            <Skeleton className="h-3 w-1/2" />
            <Skeleton className="h-5 w-4/5" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-3/4" />
            <div className="mt-auto flex items-center gap-2">
              <Skeleton className="size-5 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </Loading>
  );
}

export function DetailSkeleton() {
  return (
    <Loading className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <Skeleton className="h-6 w-28" />
      {/* Same order as the real page: on phones the action panel follows the title. */}
      <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[minmax(0,1fr)_19rem] lg:gap-10">
        <div className="contents lg:flex lg:flex-col lg:gap-4">
          <div className="order-1 flex flex-col gap-4 lg:order-none">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-10 w-4/5" />
            <Skeleton className="h-4 w-56" />
          </div>
          <div className="order-3 flex flex-col gap-3 border-t border-line pt-8 lg:order-none lg:mt-6">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-11/12" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
        <div className="contents lg:flex lg:flex-col lg:gap-6">
          <div className="order-2 flex flex-col gap-4 rounded-card border border-line bg-surface p-5 lg:order-none">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-11" />
          </div>
          <div className="order-4 flex flex-col gap-3 px-1 lg:order-none">
            <Skeleton className="h-4" />
            <Skeleton className="h-4" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        </div>
      </div>
    </Loading>
  );
}

export function AgendaSkeleton() {
  return (
    <Loading className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <HeaderSkeleton />
      <div className="flex gap-5 border-b border-line pb-2.5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-24" />
      </div>
      {[2, 1].map((count, g) => (
        <div key={g} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-40" />
          <div className="divide-y divide-line overflow-hidden rounded-card border border-line bg-surface">
            {Array.from({ length: count }, (_, i) => (
              <div key={i} className="flex gap-4 px-4 py-4 sm:px-5">
                <Skeleton className="h-14 w-12 shrink-0" />
                <div className="flex flex-1 flex-col gap-2 pt-1">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-1/3" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </Loading>
  );
}

export function SectionsSkeleton({ sections = 3 }: { sections?: number }) {
  return (
    <Loading className="mx-auto flex w-full max-w-4xl flex-col gap-4">
      <HeaderSkeleton description={false} />
      {Array.from({ length: sections }, (_, i) => (
        <div key={i} className="grid gap-4 border-t border-line py-8 first-of-type:border-t-0 md:grid-cols-[15rem_minmax(0,1fr)] md:gap-10">
          <div className="flex flex-col gap-2">
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
          <div className="flex flex-col gap-3">
            <Skeleton className="h-9 max-w-md" />
            <Skeleton className="h-9 max-w-md" />
            <Skeleton className="h-9 w-28" />
          </div>
        </div>
      ))}
    </Loading>
  );
}

export function FormSkeleton() {
  return (
    <Loading className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <HeaderSkeleton action={false} />
      {Array.from({ length: 4 }, (_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className={i === 1 ? "h-28" : "h-9"} />
        </div>
      ))}
      <Skeleton className="h-11 w-36" />
    </Loading>
  );
}

export function ProfileSkeleton() {
  return (
    <Loading className="mx-auto flex w-full max-w-5xl flex-col gap-10">
      <div className="flex flex-col gap-5 border-b border-line pb-8 sm:flex-row sm:items-end">
        <Skeleton className="size-22 shrink-0 rounded-full" />
        <div className="flex flex-1 flex-col gap-3">
          <Skeleton className="h-8 w-56" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-64 max-w-full" />
        </div>
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <Rows count={3} tall />
        <div className="hidden flex-col gap-4 lg:flex">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-16" />
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-16" />
        </div>
      </div>
    </Loading>
  );
}

export function MessagesSkeleton({ conversation = false }: { conversation?: boolean }) {
  return (
    <Loading className="-mx-4 -mt-5 -mb-28 flex h-[calc(100dvh-7.125rem-env(safe-area-inset-bottom))] flex-col sm:-mx-6 lg:m-0 lg:h-[calc(100dvh-5rem)]">
      <div className="grid min-h-0 flex-1 overflow-hidden bg-surface md:grid-cols-[20rem_minmax(0,1fr)] lg:rounded-card lg:border lg:border-line">
        <div className={`${conversation ? "hidden md:flex" : "flex"} flex-col border-line md:border-r`}>
          <div className="flex h-14 items-center border-b border-line px-4">
            <Skeleton className="h-6 w-28" />
          </div>
          <div className="flex flex-col gap-1 p-1.5">
            {Array.from({ length: 6 }, (_, i) => (
              <div key={i} className="flex items-center gap-3 px-2.5 py-2.5">
                <Skeleton className="size-10 shrink-0 rounded-full" />
                <div className="flex flex-1 flex-col gap-2">
                  <Skeleton className="h-3.5 w-2/5" />
                  <Skeleton className="h-3 w-4/5" />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className={`${conversation ? "flex" : "hidden md:flex"} flex-col`}>
          {conversation && (
            <>
              <div className="flex h-14 items-center gap-3 border-b border-line px-4">
                <Skeleton className="size-8 rounded-full" />
                <Skeleton className="h-4 w-36" />
              </div>
              <div className="flex flex-1 flex-col justify-end gap-2 p-4">
                <Skeleton className="h-9 w-2/5 rounded-[14px]" />
                <Skeleton className="h-9 w-1/3 self-end rounded-[14px]" />
                <Skeleton className="h-14 w-1/2 rounded-[14px]" />
                <Skeleton className="h-9 w-1/4 self-end rounded-[14px]" />
              </div>
              <div className="border-t border-line p-3">
                <Skeleton className="h-10" />
              </div>
            </>
          )}
        </div>
      </div>
    </Loading>
  );
}
