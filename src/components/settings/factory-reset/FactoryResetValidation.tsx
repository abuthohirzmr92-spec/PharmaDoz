"use client";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";

interface Props { validation: { valid: boolean; checks: { passed: boolean; rule: string; message: string }[] } | null; isLoading: boolean; onContinue: () => void; onBack: () => void; }

export function FactoryResetValidation({ validation, isLoading, onContinue, onBack }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Validation checks</h3>
      {isLoading && !validation ? (
        <div className="flex items-center gap-2 text-sm text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" /> Running validation...</div>
      ) : (
        <div className="space-y-2">
          {validation?.checks.map((c) => (
            <div key={c.rule} className={`flex items-center gap-2 rounded-lg p-3 text-sm ${c.passed ? "bg-green-50 dark:bg-green-950/20" : "bg-red-50 dark:bg-red-950/20"}`}>
              {c.passed ? <CheckCircle className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-red-600" />}
              <span className={c.passed ? "text-green-700 dark:text-green-400" : "text-red-700 dark:text-red-400"}>{c.message}</span>
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-3 pt-4">
        <button onClick={onBack} className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300">Back</button>
        <button onClick={onContinue} disabled={!validation?.valid} className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50">Continue</button>
      </div>
    </div>
  );
}
