"use client";

import { FileText, Table2 } from "lucide-react";
import { cn } from "@/lib/cn";
import { usePermission } from "@/hooks/use-auth";
import type { ExportFormat } from "@/types/report";

interface ExportBarProps {
  onExport: (format: ExportFormat) => void;
  isExporting?: boolean;
}

export function ExportBar({ onExport, isExporting }: ExportBarProps) {
  const canExportReports = usePermission("reports.sales.view");

  if (!canExportReports) return null;

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onExport("pdf")}
        disabled={isExporting}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800",
        )}
      >
        <FileText className="h-3.5 w-3.5" />
        PDF
      </button>
      <button
        onClick={() => onExport("excel")}
        disabled={isExporting}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-[11px] font-medium text-neutral-600 hover:bg-neutral-50 disabled:opacity-50 dark:border-neutral-700 dark:text-neutral-400 dark:hover:bg-neutral-800",
        )}
      >
        <Table2 className="h-3.5 w-3.5" />
        Excel
      </button>
    </div>
  );
}
