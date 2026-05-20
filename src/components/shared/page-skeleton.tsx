export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-5 p-2 sm:p-3 lg:p-4">
      {/* Header */}
      <div className="space-y-1.5">
        <div className="h-6 w-48 rounded-md bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-3.5 w-64 rounded-md bg-neutral-100 dark:bg-neutral-800" />
      </div>
      {/* Content card */}
      <div className="rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="space-y-3">
          <div className="h-3.5 w-full rounded bg-neutral-100 dark:bg-neutral-800" />
          <div className="h-3.5 w-3/4 rounded bg-neutral-100 dark:bg-neutral-800" />
          <div className="h-3.5 w-1/2 rounded bg-neutral-100 dark:bg-neutral-800" />
          <div className="h-3.5 w-5/6 rounded bg-neutral-100 dark:bg-neutral-800" />
        </div>
      </div>
    </div>
  );
}
