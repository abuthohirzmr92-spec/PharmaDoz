"use client";
import { Loader2 } from "lucide-react";

interface Props { progress: { currentStep: string | null; completedSteps: string[]; percentage: number; status: string } | null; onCancel: () => void; }

export function FactoryResetProgress({ progress, onCancel }: Props) {
  const pct = progress?.percentage ?? 0;
  const current = progress?.currentStep ?? "Initializing...";
  const completed = progress?.completedSteps?.length ?? 0;

  return (
    <div className="space-y-6 py-4">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
        <span className="text-sm font-medium text-neutral-700 dark:text-neutral-300">Factory Reset in progress...</span>
      </div>

      {/* Progress bar */}
      <div className="w-full rounded-full bg-neutral-200 dark:bg-neutral-700 h-3">
        <div className="h-3 rounded-full bg-brand-600 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>

      <div className="text-center">
        <p className="text-2xl font-bold text-brand-600">{pct}%</p>
        <p className="text-xs text-neutral-500 mt-1">{completed} steps completed</p>
      </div>

      <div className="rounded-lg bg-neutral-50 p-3 dark:bg-neutral-800">
        <p className="text-xs text-neutral-500">Current operation:</p>
        <p className="text-sm font-mono text-neutral-700 dark:text-neutral-300 mt-1">{current}</p>
      </div>

      <button onClick={onCancel} className="w-full rounded-lg border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400">Cancel Reset</button>
    </div>
  );
}
