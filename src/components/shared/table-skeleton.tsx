import { cn } from "@/lib/cn";

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse rounded-xl border border-neutral-200 dark:border-neutral-800">
      {/* Header */}
      <div className="flex gap-4 border-b border-neutral-200 px-6 py-3 dark:border-neutral-800">
        {["w-24", "w-32", "w-20", "w-40"].map((w, i) => (
          <div
            key={i}
            className={`h-4 rounded bg-neutral-200 dark:bg-neutral-800 ${w}`}
          />
        ))}
      </div>
      {/* Rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className={cn(
            "flex gap-4 px-6 py-3",
            i < rows - 1 &&
              "border-b border-neutral-100 dark:border-neutral-800"
          )}
        >
          {["w-28", "w-36", "w-24", "w-44"].map((w, j) => (
            <div
              key={j}
              className={`h-3 rounded bg-neutral-100 dark:bg-neutral-800 ${w}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
