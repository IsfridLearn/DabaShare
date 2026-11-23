export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-4">
      <span className="sr-only">Loading…</span>
      <div className="h-8 w-48 animate-pulse motion-reduce:animate-none rounded-control bg-gray-200" />
      <div className="h-40 animate-pulse motion-reduce:animate-none rounded-card bg-gray-200" />
      <div className="h-40 animate-pulse motion-reduce:animate-none rounded-card bg-gray-200" />
    </div>
  );
}
