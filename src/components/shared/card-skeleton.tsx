import { cn } from "@/lib/cn";

export function CardSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-neutral-200 dark:bg-neutral-800" />
        <div className="space-y-1.5">
          <div className="h-3 w-20 rounded bg-neutral-200 dark:bg-neutral-800" />
          <div className="h-5 w-14 rounded bg-neutral-200 dark:bg-neutral-800" />
        </div>
      </div>
    </div>
  );
}
