export function PageSkeleton() {
  return (
    <div className="animate-pulse space-y-6 p-4 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="h-7 w-48 rounded-md bg-neutral-200 dark:bg-neutral-800" />
        <div className="h-4 w-64 rounded-md bg-neutral-100 dark:bg-neutral-800" />
      </div>
      {/* Content card */}
      <div className="rounded-xl border border-neutral-200 p-6 dark:border-neutral-800">
        <div className="space-y-4">
          <div className="h-4 w-full rounded bg-neutral-100 dark:bg-neutral-800" />
          <div className="h-4 w-3/4 rounded bg-neutral-100 dark:bg-neutral-800" />
          <div className="h-4 w-1/2 rounded bg-neutral-100 dark:bg-neutral-800" />
        </div>
      </div>
    </div>
  );
}
