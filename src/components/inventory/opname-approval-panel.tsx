"use client";

import { useState } from "react";
import { CheckCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

export interface OpnameApprovalPanelProps {
  onApprove: (notes: string) => void;
  onReject: (notes: string) => void;
  isLoading?: boolean;
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export function OpnameApprovalPanel({
  onApprove,
  onReject,
  isLoading = false,
}: OpnameApprovalPanelProps) {
  const [notes, setNotes] = useState("");

  const handleApprove = () => {
    onApprove(notes);
  };

  const handleReject = () => {
    onReject(notes);
  };

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
          Approval Opname
        </h3>
        <p className="mt-0.5 text-xs text-neutral-500">
          Setujui atau tolak hasil stock opname. Berikan catatan sebagai
          referensi.
        </p>
      </div>

      {/* Notes textarea */}
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Catatan (opsional) — alasan approval atau penolakan..."
        rows={3}
        disabled={isLoading}
        className="w-full resize-none rounded-lg border border-neutral-200 bg-white p-3 text-xs text-neutral-700 placeholder-neutral-400 focus:border-brand-400 focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-neutral-700 dark:bg-neutral-800 dark:text-neutral-300 dark:placeholder-neutral-500"
      />

      {/* Action buttons */}
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={handleApprove}
          disabled={isLoading}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors",
            "bg-green-600 text-white hover:bg-green-700",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "dark:bg-green-700 dark:hover:bg-green-600",
          )}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <CheckCircle className="h-3.5 w-3.5" />
          )}
          Setujui
        </button>
        <button
          onClick={handleReject}
          disabled={isLoading}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-xs font-semibold transition-colors",
            "bg-red-600 text-white hover:bg-red-700",
            "disabled:cursor-not-allowed disabled:opacity-50",
            "dark:bg-red-700 dark:hover:bg-red-600",
          )}
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <XCircle className="h-3.5 w-3.5" />
          )}
          Tolak
        </button>
      </div>
    </div>
  );
}
