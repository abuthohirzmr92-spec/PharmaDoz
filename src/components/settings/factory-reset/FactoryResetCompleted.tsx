"use client";
import { CheckCircle } from "lucide-react";

interface Props { result: { success: boolean; deletedRows: number; durationMs: number; newLifecycleState: string; error?: string } | null; onClose: () => void; }

export function FactoryResetCompleted({ result, onClose }: Props) {
  if (!result) return null;
  const durationSec = Math.round(result.durationMs / 1000);

  return (
    <div className="space-y-4 text-center py-6">
      <CheckCircle className="mx-auto h-12 w-12 text-green-600" />
      <h3 className="text-lg font-semibold text-neutral-800 dark:text-neutral-100">Factory Reset Complete</h3>

      <div className="grid grid-cols-2 gap-3 text-left">
        <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800"><p className="text-xs text-neutral-500">Rows Deleted</p><p className="text-lg font-bold tabular-nums text-neutral-800 dark:text-neutral-100">{result.deletedRows.toLocaleString()}</p></div>
        <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800"><p className="text-xs text-neutral-500">Duration</p><p className="text-lg font-bold tabular-nums text-neutral-800 dark:text-neutral-100">{durationSec}s</p></div>
        <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800 col-span-2"><p className="text-xs text-neutral-500">Tenant State</p><p className="text-sm font-mono font-medium text-green-700 dark:text-green-400">{result.newLifecycleState}</p></div>
      </div>

      <p className="text-xs text-neutral-500 mt-2">Next step: Run Initial Count & Opening Balance (IC&OB)</p>

      <button onClick={onClose} className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 mt-4">Close</button>
    </div>
  );
}
