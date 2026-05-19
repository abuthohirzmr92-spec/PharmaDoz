/* ------------------------------------------------------------------ */
/*  Excel Export — xlsx (SheetJS)                                      */
/* ------------------------------------------------------------------ */

import * as XLSX from "xlsx";

export interface ExcelColumn {
  key: string;
  label: string;
}

export function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  columns: ExcelColumn[],
  filename: string,
): void {
  // Map data to label-keyed rows
  const rows = data.map((item) => {
    const row: Record<string, unknown> = {};
    for (const col of columns) {
      row[col.label] = item[col.key];
    }
    return row;
  });

  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-fit column widths
  const colWidths = columns.map((col) => {
    const maxLen = Math.max(
      col.label.length,
      ...rows.map((r) => String(r[col.label] ?? "").length),
    );
    return { wch: Math.min(maxLen + 2, 30) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
