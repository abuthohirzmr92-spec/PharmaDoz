/* ------------------------------------------------------------------ */
/*  PDF Export — html2canvas snapshot → jsPDF document                 */
/* ------------------------------------------------------------------ */

import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportTableToPdf(
  element: HTMLElement,
  title: string,
): Promise<void> {
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");
  const imgWidth = 277; // A4 landscape usable width in mm
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  const pdf = new jsPDF("l", "mm", "a4");
  pdf.setFontSize(12);
  pdf.text(title, 14, 14);

  // Add image below title
  const pageHeight = 190; // A4 landscape usable height
  let heightLeft = imgHeight;
  let position = 22; // start Y after title

  pdf.addImage(imgData, "PNG", 14, position, imgWidth, imgHeight);
  heightLeft -= pageHeight - 22;

  // Add extra pages if content overflows
  while (heightLeft > 0) {
    position = heightLeft - imgHeight + 22;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 14, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  const filename = `${title.replace(/\s+/g, "_")}.pdf`;
  pdf.save(filename);
}
