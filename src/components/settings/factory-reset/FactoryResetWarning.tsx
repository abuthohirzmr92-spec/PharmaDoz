"use client";
import { AlertTriangle } from "lucide-react";

interface Props { onContinue: () => void; onCancel: () => void; }

export function FactoryResetWarning({ onContinue, onCancel }: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
        <AlertTriangle className="h-6 w-6 text-red-600" />
        <div>
          <p className="font-semibold text-red-700 dark:text-red-400">This action permanently deletes operational data.</p>
          <p className="text-sm text-red-600 dark:text-red-400 mt-1">All sales, purchases, inventory movements, and financial transactions will be removed. Master data (products, suppliers, users) will be preserved.</p>
        </div>
      </div>
      <div className="text-sm text-neutral-600 dark:text-neutral-400 space-y-2">
        <p><strong>Will be deleted:</strong> Transactions, payments, stock movements, batches, purchase orders, opname records, wallet transactions.</p>
        <p><strong>Will be preserved:</strong> Products, categories, units, suppliers, users, branches, storage areas, settings.</p>
      </div>
      <div className="flex gap-3 pt-4">
        <button onClick={onCancel} className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300">Cancel</button>
        <button onClick={onContinue} className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-700">Continue</button>
      </div>
    </div>
  );
}
