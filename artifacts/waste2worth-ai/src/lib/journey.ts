import { z } from "zod";
import { inferMaterial, materialLabel, parseSupply, type Supply } from "./biomass";
import { emptyOffer, type DemoTransaction, type OfferDraft, type Result } from "./transactions";

export const assessmentSchema = z.object({
  wasteType: z.string().max(1000), confidence: z.enum(["low", "medium", "high"]),
  visibleClues: z.array(z.string().max(2000)).max(30),
  possibleUses: z.array(z.string().max(2000)).max(30),
  limitationNote: z.string().max(4000),
  visibleQualityIndicators: z.array(z.string().max(2000)).max(30).default([]),
  possibleContamination: z.array(z.string().max(2000)).max(30).default([]),
});
export type Assessment = z.infer<typeof assessmentSchema>;
export interface ShortOffer {
  quantityTonnes: string; askingPricePerTonneIdr: string;
  province: string; city: string; logistics: OfferDraft["logistics"]; notes: string;
}
export interface MaterialRecord {
  id: string; source: "photo" | "manual"; scan: Assessment; createdAt: string;
  offer: { supply: Supply; terms: OfferDraft; notes: string; submittedAt: string } | null;
  report: { generatedAt: string; sourceVersion: string; text: string } | null;
}
export const emptyShortOffer: ShortOffer = {
  quantityTonnes: "", askingPricePerTonneIdr: "", province: "", city: "",
  logistics: "to-be-agreed", notes: "",
};
export function prepareConnectedOffer(scan: Assessment, draft: ShortOffer, now: string): Result<NonNullable<MaterialRecord["offer"]>> {
  const qualityNotes = [
    `Photo estimate: ${scan.wasteType} (${scan.confidence} confidence).`,
    ...scan.visibleClues, ...scan.visibleQualityIndicators, ...scan.possibleContamination,
    draft.notes ? `Supplier note: ${draft.notes}` : "",
  ].filter(Boolean).join(" ").slice(0, 1000);
  const parsed = parseSupply({
    material: inferMaterial(scan.wasteType) || "other", quantityTonnes: draft.quantityTonnes,
    region: draft.province, location: draft.city, quality: "unknown", moisturePercent: "", qualityNotes,
  });
  const errors: Record<string, string> = parsed.ok ? {} : { ...parsed.errors };
  const price = draft.askingPricePerTonneIdr.trim() ? Number(draft.askingPricePerTonneIdr) : NaN;
  if (!Number.isFinite(price) || price < 0 || price > 1e12) errors.askingPricePerTonneIdr = "Enter an asking price in IDR per tonne (0 means free).";
  if (!["buyer-pickup", "supplier-delivery", "third-party", "to-be-agreed"].includes(draft.logistics)) errors.logistics = "Choose a logistics option.";
  if (draft.notes.length > 500) errors.notes = "Use at most 500 characters.";
  if (!parsed.ok || Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: {
    supply: parsed.value, notes: draft.notes.trim(), submittedAt: now,
    terms: { ...emptyOffer, logistics: draft.logistics, askingPricePerTonneIdr: String(price) },
  } };
}
export function relatedTransactions(record: MaterialRecord, transactions: DemoTransaction[]) {
  return transactions.filter(tx => tx.offerId === record.id);
}
export function reportVersion(record: MaterialRecord, transactions: DemoTransaction[]): string {
  return [record.offer?.submittedAt || "", ...relatedTransactions(record, transactions).map(tx => `${tx.id}:${tx.updatedAt}`)].join("|");
}
export function connectedReportText(record: MaterialRecord, transactions: DemoTransaction[], now: string): string {
  if (!record.offer) throw new Error("Submit this offer before creating a report.");
  const { supply, terms, notes } = record.offer;
  const linked = relatedTransactions(record, transactions);
  const receipts = linked.filter(tx => tx.history.some(h => h.status === "received"));
  const hasReuse = receipts.some(tx => tx.draft.actualReusedTonnes.trim() !== "");
  const lines = [
    `Waste2Worth AI — ${hasReuse ? "USER-REPORTED ACTUAL IMPACT" : "PRELIMINARY OFFER SUMMARY"}`,
    "UNVERIFIED • FICTIONAL DEMO • Not certified or proof of compliance",
    `Material / offer record: ${record.id}`, `Generated: ${now}`,
    `Original ${record.source === "photo" ? "photo classification" : "manual identification"}: ${record.scan.wasteType}`,
    `Confidence: ${record.scan.confidence} (visual estimate, not laboratory certainty)`,
    `Visible clues: ${record.scan.visibleClues.join("; ") || "Unknown"}`,
    `Visible quality indicators: ${record.scan.visibleQualityIndicators.join("; ") || "Not separately assessed"}`,
    `Possible contamination: ${record.scan.possibleContamination.join("; ") || "Unknown; absence cannot be confirmed from a photo"}`,
    `Possible uses to investigate: ${record.scan.possibleUses.join("; ") || "Unknown"}`,
    record.scan.limitationNote,
    "A photo cannot confirm moisture, quality, or energy value. Lab testing may still be needed.",
    `Matching category: ${materialLabel(supply.material)}`,
    `Offer date: ${record.offer.submittedAt}`,
    `Origin area: ${supply.location}, ${supply.region}`,
    `Quantity OFFERED: ${supply.quantityTonnes} tonnes — not counted as collected, received or reused`,
    `Asking price: IDR ${terms.askingPricePerTonneIdr} per tonne (transport excluded)`,
    `Preferred logistics: ${terms.logistics === "to-be-agreed" ? "To be agreed" : terms.logistics.replace(/-/g, " ")}`,
    `Supplier notes: ${notes || "Not provided"}`,
  ];
  if (!receipts.length) lines.push(
    "Actual collected quantity: UNKNOWN", "Actual received weight: UNKNOWN", "Actual reused quantity: UNKNOWN",
    "Destination use: UNKNOWN — potential uses above are not confirmed reuse",
    "Actual transport details / cost: UNKNOWN",
  );
  for (const tx of linked) {
    lines.push(`Demo transaction: ${tx.id} — ${tx.status}`);
    if (!tx.history.some(h => h.status === "received")) {
      lines.push("No recorded receipt. Draft receipt quantities are NOT counted as actual impact.");
      continue;
    }
    const d = tx.draft;
    lines.push(
      `Receipt date: ${d.receivedDate}`, `Actual received weight: ${d.receivedTonnes} tonnes (user-reported)`,
      `Actual collected quantity: ${d.actualCollectedTonnes.trim() ? `${d.actualCollectedTonnes} tonnes (user-reported)` : "UNKNOWN"}`,
      `Actual reused quantity: ${d.actualReusedTonnes.trim() ? `${d.actualReusedTonnes} tonnes (user-reported)` : "UNKNOWN"}`,
      `Destination use: ${d.destinationUse} (user-reported; not independently verified)`,
      `Quality check: ${d.qualityCheck} (user-reported)`,
      `Transport: ${d.logistics}; pays: ${d.transportPayer}; scheduled: ${d.scheduledDate || "UNKNOWN"}`,
      `Estimated transport cost: ${d.estimatedTransportCostIdr.trim() ? `IDR ${d.estimatedTransportCostIdr} per trip` : "UNKNOWN"}`,
      `Actual transport cost: ${d.actualTransportCostIdr.trim() ? `IDR ${d.actualTransportCostIdr} per trip` : "UNKNOWN"}`,
      `Handling: loading ${d.loadingNeeds || "UNKNOWN"}; unloading ${d.unloadingNeeds || "UNKNOWN"}`,
      `Evidence: ${tx.evidence.map(e => `${e.category}: ${e.name}`).join("; ") || "None attached"} — unverified`,
      ...(tx.status === "cancelled" ? ["Cancelled demo transaction: receipt entries retained as user reports, NOT a completed sale or verified reuse."] : []),
    );
  }
  lines.push(
    "Missing evidence / assumptions: mass basis UNKNOWN; moisture, quality and energy value are not laboratory verified.",
    "Offer quantity is availability only. Interest, agreement, receipt and completion do not by themselves prove reuse.",
    "Quantities are entered by the user, are not independently verified, and are not added across transactions. Confirm batch scope and avoid double counting.",
    "Check material suitability, contamination, moisture, ash, buyer specifications and local permits before use.",
    "Emissions savings: NOT CALCULATED or verified. Required baseline, processing, transport and emissions factors are missing.",
    "No carbon credits, certification, compliance claim or proof of a real sale.",
    "Records are stored only in this browser. No real buyer was contacted. Private address and coordinates are excluded.",
  );
  return lines.join("\n");
}
