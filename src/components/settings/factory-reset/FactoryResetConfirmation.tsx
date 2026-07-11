"use client";

interface Props { text: string; onChange: (v: string) => void; onExecute: () => void; onBack: () => void; }

export function FactoryResetConfirmation({ text, onChange, onExecute, onBack }: Props) {
  const canExecute = text === "RESET";

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950/30">
        <p className="font-semibold text-red-700 dark:text-red-400">Final confirmation</p>
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">All operational data will be permanently deleted. This action cannot be undone.</p>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 dark:text-neutral-300">Type <strong className="font-mono text-red-600">RESET</strong> to confirm:</label>
        <input
          type="text"
          value={text}
          onChange={(e) => onChange(e.target.value)}
          placeholder="RESET"
          className="mt-2 w-full rounded-lg border border-neutral-300 px-4 py-2.5 font-mono text-lg tracking-widest focus:border-red-400 focus:outline-none focus:ring-2 focus:ring-red-100 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-50"
          autoFocus
        />
        {text.length > 0 && text !== "RESET" && <p className="mt-1 text-xs text-red-500">You must type exactly: RESET</p>}
      </div>

      <div className="flex gap-3 pt-4">
        <button onClick={onBack} className="flex-1 rounded-lg border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 dark:border-neutral-700 dark:text-neutral-300">Back</button>
        <button onClick={onExecute} disabled={!canExecute} className="flex-1 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50">Execute Factory Reset</button>
      </div>
    </div>
  );
}
