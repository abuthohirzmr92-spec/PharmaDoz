/* ------------------------------------------------------------------ */
/*  PDF Export — html2canvas snapshot → jsPDF document                 */
/* ------------------------------------------------------------------ */

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export interface PdfMeta {
  pharmacyName: string;
  reportTitle: string;
  period?: string;
  exportedBy?: string;
}

export async function exportTableToPdf(
  element: HTMLElement,
  title: string,
  meta?: PdfMeta,
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const pdf = new jsPDF("l", "mm", "a4");

  // Header metadata
  let y = 10;
  pdf.setFontSize(14);
  pdf.setTextColor(40, 40, 40);
  if (meta?.pharmacyName) {
    pdf.setFontSize(11);
    pdf.text(meta.pharmacyName, 14, y); y += 6;
  }
  pdf.setFontSize(12);
  pdf.text(title, 14, y); y += 6;

  if (meta?.period) {
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(`Periode: ${meta.period}`, 14, y); y += 4;
  }
  const now = new Date().toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
  pdf.setFontSize(8);
  pdf.text(`Diekspor: ${now}${meta?.exportedBy ? ` oleh ${meta.exportedBy}` : ""}`, 14, y); y += 2;

  // Add image below header
  const imgWidth = 277;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;
  const pageHeight = 190;
  let heightLeft = imgHeight;
  let position = y + 4;

  pdf.addImage(imgData, "PNG", 14, position, imgWidth, imgHeight);
  heightLeft -= pageHeight - position;

  while (heightLeft > 0) {
    position = heightLeft - imgHeight + position;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 14, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const today = new Date().toISOString().slice(0, 10);
  const filename = `${title.replace(/\s+/g, "_")}_${today}.pdf`;
  pdf.save(filename);
}
