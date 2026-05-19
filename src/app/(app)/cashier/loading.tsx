/* ------------------------------------------------------------------ */
/*  Cashier loading skeleton                                           */
/* ------------------------------------------------------------------ */

export default function CashierLoading() {
  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] animate-pulse flex-col gap-6 p-4 sm:p-6 lg:p-8">
      {/* Top bar skeleton */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-5 w-44 rounded-md bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-6 w-20 rounded-full bg-neutral-200 dark:bg-neutral-800" />
        </div>
        <div className="hidden gap-2 md:flex">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-7 w-16 rounded-md bg-neutral-200 dark:bg-neutral-800"
            />
          ))}
        </div>
      </div>

      {/* Two-column skeleton */}
      <div className="flex flex-1 gap-6">
        {/* Left panel (products) */}
        <div className="flex flex-1 flex-col gap-4">
          {/* Search bar */}
          <div className="h-10 w-full rounded-lg bg-neutral-200 dark:bg-neutral-800" />
          {/* Product grid */}
          <div className="grid flex-1 grid-cols-2 gap-3 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900"
              >
                <div className="mb-3 h-4 w-3/4 rounded bg-neutral-200 dark:bg-neutral-800" />
                <div className="mb-2 h-3 w-1/2 rounded bg-neutral-100 dark:bg-neutral-800" />
                <div className="h-3 w-1/3 rounded bg-neutral-100 dark:bg-neutral-800" />
              </div>
            ))}
          </div>
        </div>

        {/* Right panel (cart) — hidden on mobile */}
        <div className="hidden w-80 shrink-0 flex-col gap-4 md:flex">
          <div className="h-6 w-28 rounded-md bg-neutral-200 dark:bg-neutral-800" />
          <div className="flex-1 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="h-3 w-24 rounded bg-neutral-200 dark:bg-neutral-800" />
                    <div className="h-3 w-16 rounded bg-neutral-100 dark:bg-neutral-800" />
                  </div>
                  <div className="h-8 w-20 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <div className="h-10 w-full rounded-lg bg-neutral-200 dark:bg-neutral-800" />
            <div className="h-10 w-full rounded-lg bg-neutral-200 dark:bg-neutral-800" />
          </div>
        </div>
      </div>
    </div>
  );
}
