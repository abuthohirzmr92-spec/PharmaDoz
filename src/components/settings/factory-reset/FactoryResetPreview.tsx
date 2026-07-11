"use client";

interface Props { preview: { table: string; count: number }[] | null; isLoading: boolean; onContinue: () => void; onBack: () => void; }

export function FactoryResetPreview({ preview, isLoading, onContinue, onBack }: Props) {
  const total = preview?.reduce((s, r) => s + r.count, 0) ?? 0;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Data to be deleted</h3>
      {isLoading ? (
        <div className="space-y-2">{Array.from({ length: 5 }).map((_, i) => (<div key={i} className="h-6 animate-pulse rounded bg-neutral-100 dark:bg-neutral-800" />))}</div>
      ) : (
        <table className="w-full text-sm">
          <thead><tr className="border-b text-left text-xs text-neutral-500"><th className="py-2">Table</th><th className="py-2 text-right">Records</th></tr></thead>
          <tbody className="divide-y">{preview?.map((r) => (<tr key={r.table}><td className="py-2 text-neutral-700 dark:text-neutral-300">{r.table}</td><td className="py-2 text-right tabular-nums font-medium">{r.count.toLocaleString()}</td></tr>))}</tbody>
          <tfoot><tr className="border-t font-semibold"><td className="py-2 text-neutral-700 dark:text-neutral-300">Total</td><td className="py-2 text-right tabular-nums">{total.toLocaleString()}</td></tr></tfoot>
        </table>
      )}
      <div className="flex gap-3 pt-4">
        <button onClick={onBack} className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300">Back</button>
        <button onClick={onContinue} disabled={isLoading} className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">Continue</button>
      </div>
    </div>
  );
}
