"use client";

/** Shared pagination for subscription management tables. */
export function Pagination({
  page,
  totalPages,
  totalResults,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  totalResults: number;
  onPageChange: (p: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="mt-3 flex items-center justify-between border-t border-neutral-100 pt-3 dark:border-neutral-800">
      <span className="text-xs text-neutral-400">
        Halaman {page + 1} dari {totalPages} ({totalResults} hasil)
      </span>
      <div className="flex gap-1">
        <button
          disabled={page === 0}
          onClick={() => onPageChange(page - 1)}
          className="rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-30 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          ← Prev
        </button>
        <button
          disabled={page >= totalPages - 1}
          onClick={() => onPageChange(page + 1)}
          className="rounded-lg border border-neutral-200 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-30 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
