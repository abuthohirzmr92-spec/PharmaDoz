"use client";

import { useRef, useState, useCallback } from "react";
import { toast } from "sonner";
import { exportTableToPdf, type PdfMeta } from "@/lib/export-pdf";
import { exportToExcel, type ExcelColumn } from "@/lib/export-excel";

interface UseReportExportOptions {
  title: string;
  meta?: () => PdfMeta;
  getExcelData?: () => Record<string, unknown>[];
  getExcelColumns?: () => ExcelColumn[];
}

export function useReportExport(opts: UseReportExportOptions) {
  const tableRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = useCallback(async (format: "pdf" | "excel") => {
    setIsExporting(true);
    try {
      if (format === "pdf" && tableRef.current) {
        await exportTableToPdf(tableRef.current, opts.title, opts.meta?.());
        toast.success("PDF berhasil diunduh");
      } else if (format === "excel") {
        const data = opts.getExcelData?.() ?? [];
        const cols = opts.getExcelColumns?.() ?? [];
        if (cols.length > 0)
          exportToExcel(data as any, cols, opts.title.replace(/\s+/g, "_"));
        toast.success("Excel berhasil diunduh");
      }
    } catch (err: any) {
      toast.error(err?.message ?? "Gagal mengekspor");
    } finally {
      setIsExporting(false);
    }
  }, [opts.title]);

  return { tableRef, isExporting, handleExport };
}
