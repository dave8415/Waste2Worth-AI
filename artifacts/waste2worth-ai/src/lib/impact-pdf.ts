import { REPORT_LIMITATIONS, type ImpactEstimationReport } from "./impact-estimation";

export async function buildImpactPdf(report: ImpactEstimationReport, photo?: string): Promise<Uint8Array> {
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const margin = 20, width = 170;
  let y = 0;
  const header = () => {
    doc.setFillColor(31, 80, 55); doc.rect(0, 0, 210, 35, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(21);
    doc.text("Impact Estimation", margin, 20);
    doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.text("Waste2Worth AI", margin, 28);
    doc.setTextColor(32, 45, 37); y = 47;
  };
  const room = (height: number) => { if (y + height > 270) { doc.addPage(); header(); } };
  const text = (content: string, bold = false, size = 10) => {
    doc.setFontSize(size); doc.setFont("helvetica", bold ? "bold" : "normal");
    const lines: string[] = doc.splitTextToSize(content.replace(/[\u0000-\u001f]/g, " "), width);
    for (const line of lines) { room(7); doc.text(line, margin, y); y += 5.3; }
    y += 2;
  };
  const section = (title: string) => { room(17); y += 4; doc.setTextColor(31, 80, 55); text(title, true, 13); doc.setTextColor(32, 45, 37); };
  const qty = (n: number | null) => n === null ? "Unknown" : `${n} tonnes (user-reported)`;
  header();
  text(`Generated: ${new Date(report.generatedAt).toLocaleString("en-GB")}`);
  text(`Status: ${report.status}`);
  section("Material and planned use");
  text(`Material: ${report.material}`, true);
  text(`Intended use / processing: ${report.method}`);
  text(`Location: ${report.city}, ${report.province}`);
  text(`Offered quantity: ${report.offeredTonnes} tonnes`, true);
  text("Availability only. Not counted as collected, received or reused.");
  if (photo) {
    room(67);
    const props = doc.getImageProperties(photo);
    const h = Math.min(55, width * props.height / props.width);
    const w = Math.min(width, h * props.width / props.height);
    doc.addImage(photo, "JPEG", margin, y, w, h); y += h + 7;
  }
  section("Recorded quantities");
  text(`Actually collected: ${qty(report.collectedTonnes)}`);
  text(`Actually received: ${qty(report.receivedTonnes)}`);
  text(`Actually reused: ${qty(report.reusedTonnes)}`);
  section("Scan findings");
  text(`Identification: ${report.source === "photo" ? "Photo estimate" : "Manual entry"}; confidence: ${report.confidence}`);
  text(`Visible clues: ${report.visibleClues.join("; ") || "Unknown"}`);
  text(`Visible condition: ${report.qualityIndicators.join("; ") || "Unknown"}`);
  text(`Possible contamination: ${report.contamination.join("; ") || "Unknown - inspection needed"}`);
  text(`Potential uses to check: ${report.potentialUses.join("; ") || "Not assessed"}`);
  section("Environmental estimation");
  text(`Emissions savings: ${report.emissionsStatus}`, true);
  text("No emissions or financial environmental benefits have been estimated.");
  section("Important limitations");
  REPORT_LIMITATIONS.forEach(line => text(line));
  text(`Material reference: ${report.recordId}`, false, 8);
  text(`Report reference: ${report.id}`, false, 8);
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p); doc.setFontSize(8); doc.setTextColor(95, 110, 98);
    doc.text(`Waste2Worth AI | Unverified estimate | ${p} / ${pages}`, margin, 285);
  }
  return new Uint8Array(doc.output("arraybuffer"));
}
export async function downloadImpactPdf(report: ImpactEstimationReport, photo?: string): Promise<void> {
  const bytes = await buildImpactPdf(report, photo);
  const blob = new Blob([new Uint8Array(bytes)], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `waste2worth-impact-${report.generatedAt.slice(0, 10)}-${report.id.slice(0, 8)}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
