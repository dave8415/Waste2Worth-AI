import { z } from "zod";
import { USES, type IntendedUse } from "./biomass";
import type { MaterialRecord } from "./journey";
import type { Result } from "./transactions";
import type { DemoTransaction } from "./transactions";
import { emptyQuality, massBasisSchema, materialQualitySchema } from "./material-quality";
import { emissionsInputsSchema, estimateEmissions } from "./emissions";

export const actualQuantitiesSchema = z.object({
  collected: z.number().min(0).max(1_000_000).nullable(),
  received: z.number().min(0).max(1_000_000).nullable(),
  reused: z.number().min(0).max(1_000_000).nullable(),
  updatedAt: z.string().datetime(),
  massBasis: massBasisSchema.optional(),
  sourceTransactionId: z.string().optional(),
});
export type ActualQuantities = z.infer<typeof actualQuantitiesSchema>;
export type ActualQuantityDraft = { collected: string; received: string; reused: string; massBasis?: "unknown" | "wet" | "dry"; sourceTransactionId?: string };
export const impactReportSchema = z.object({
  id: z.string(), recordId: z.string(), generatedAt: z.string().datetime(), sourceVersion: z.string().max(10000),
  material: z.string().max(1000), method: z.string().max(100), offeredTonnes: z.number().positive(),
  city: z.string().max(1000), province: z.string().max(1000),
  source: z.enum(["photo", "manual"]), confidence: z.enum(["low", "medium", "high"]),
  visibleClues: z.array(z.string()).max(30), qualityIndicators: z.array(z.string()).max(30),
  contamination: z.array(z.string()).max(30), potentialUses: z.array(z.string()).max(30),
  collectedTonnes: z.number().min(0).nullable(), receivedTonnes: z.number().min(0).nullable(), reusedTonnes: z.number().min(0).nullable(),
  status: z.enum(["Awaiting actual data", "Partial actual data", "Actual quantities recorded"]),
  emissionsStatus: z.enum(["Data belum cukup", "Not calculated", "Provisional net result"]),
  quality: materialQualitySchema.optional(),
  massBasis: massBasisSchema.optional(),
  emissions: z.object({
    status: z.enum(["Not calculated", "Provisional net result"]), missing: z.array(z.string()),
    baselineKg: z.number().nullable(), projectKg: z.number().nullable(), netKg: z.number().nullable(),
    inputs: emissionsInputsSchema,
  }).optional(),
  transactionDetails: z.array(z.string()).optional(),
});
export type ImpactEstimationReport = z.infer<typeof impactReportSchema>;
export function estimationVersion(record: MaterialRecord, transactions: DemoTransaction[] = []): string {
  const content = JSON.stringify([record.id, record.offer, record.scan, record.quality, record.intendedUse || "", record.actualQuantities || null,
    record.emissionsInputs, transactions.filter(t => t.offerId === record.id).map(t => [t.id, t.status, t.updatedAt, t.draft, t.evidence])]);
  // A bounded change fingerprint avoids exporting private addresses in sourceVersion.
  let a = 2166136261, b = 5381;
  for (let n = 0; n < content.length; n++) {
    a = Math.imul(a ^ content.charCodeAt(n), 16777619);
    b = Math.imul(b, 33) ^ content.charCodeAt(n);
  }
  return `measured-v1:${content.length}:${a >>> 0}:${b >>> 0}`;
}
export function resolveActuals(record: MaterialRecord, transactions: DemoTransaction[]): MaterialRecord {
  const id = record.actualQuantities?.sourceTransactionId;
  if (!id) return record;
  const tx = transactions.find(t => t.id === id && t.offerId === record.id);
  const usable = tx && ["received", "completed"].includes(tx.status) && tx.history.some(h => h.status === "received");
  const numeric = (s: string) => s.trim() === "" ? null : Number(s);
  return { ...record, intendedUse: usable ? tx.draft.destinationUse : record.intendedUse, actualQuantities: {
    ...record.actualQuantities!,
    collected: usable ? numeric(tx.draft.actualCollectedTonnes) : null,
    received: usable ? numeric(tx.draft.receivedTonnes) : null,
    reused: usable ? numeric(tx.draft.actualReusedTonnes) : null,
  } };
}
export function validateActualQuantities(record: MaterialRecord, draft: ActualQuantityDraft, now: string): Result<ActualQuantities> {
  if (!record.offer) return { ok: false, errors: { record: "Submit an offer first." } };
  const errors: Record<string, string> = {};
  const values = {} as Record<keyof ActualQuantityDraft, number | null>;
  for (const key of ["collected", "received", "reused"] as const) {
    const n = draft[key].trim() ? Number(draft[key]) : null;
    if (n !== null && (!Number.isFinite(n) || n < 0 || n > 1_000_000)) errors[key] = "Enter tonnes from 0 to 1,000,000, or leave unknown.";
    values[key] = n;
  }
  if (values.collected !== null && values.collected > record.offer.supply.quantityTonnes) errors.collected = "Collected quantity cannot exceed offered quantity for this batch.";
  if (values.received !== null && values.collected !== null && values.received > values.collected) errors.received = "Received quantity cannot exceed collected quantity on the same mass basis.";
  if (values.reused !== null && (values.collected === null || values.received === null)) errors.reused = "Record collected and received quantities before reused quantity.";
  if (values.reused !== null && ((values.collected !== null && values.reused > values.collected) || (values.received !== null && values.reused > values.received))) errors.reused = "Reused quantity cannot exceed collected or received quantity.";
  if (Object.keys(errors).length) return { ok: false, errors };
  if (draft.massBasis && !massBasisSchema.safeParse(draft.massBasis).success) errors.massBasis = "Choose wet, dry or unknown mass basis.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { ...values, massBasis: draft.massBasis ?? "unknown", sourceTransactionId: draft.sourceTransactionId, updatedAt: now } };
}
export function buildEstimationReport(record: MaterialRecord, id: string, now: string, transactions: DemoTransaction[] = []): Result<ImpactEstimationReport> {
  if (!record.offer) return { ok: false, errors: { record: "Submit an offer before generating a report." } };
  if (record.intendedUse && !(USES as readonly string[]).includes(record.intendedUse)) return { ok: false, errors: { method: "Choose an intended use." } };
  const original = record;
  const offer = record.offer;
  record = resolveActuals(record, transactions);
  const actual = record.actualQuantities;
  const validation = validateActualQuantities(record, {
    collected: actual?.collected?.toString() ?? "", received: actual?.received?.toString() ?? "", reused: actual?.reused?.toString() ?? "",
    massBasis: actual?.massBasis,
  }, now);
  if (!validation.ok) return validation;
  const amounts = [actual?.collected ?? null, actual?.received ?? null, actual?.reused ?? null];
  const known = amounts.filter(v => v !== null).length;
  return { ok: true, value: {
    id, recordId: record.id, generatedAt: now, sourceVersion: estimationVersion(original, transactions),
    material: record.scan.wasteType, method: record.intendedUse || "Not selected",
    offeredTonnes: offer.supply.quantityTonnes, city: offer.supply.location, province: offer.supply.region,
    source: record.source, confidence: record.scan.confidence, visibleClues: [...record.scan.visibleClues],
    qualityIndicators: [...record.scan.visibleQualityIndicators], contamination: [...record.scan.possibleContamination],
    potentialUses: [...record.scan.possibleUses],
    collectedTonnes: amounts[0], receivedTonnes: amounts[1], reusedTonnes: amounts[2],
    status: known === 0 ? "Awaiting actual data" : known === 3 ? "Actual quantities recorded" : "Partial actual data",
    emissionsStatus: estimateEmissions(record.emissionsInputs, actual, record.intendedUse || "").status,
    emissions: estimateEmissions(record.emissionsInputs, actual, record.intendedUse || ""),
    quality: structuredClone(record.quality ?? emptyQuality()), massBasis: actual?.massBasis ?? "unknown",
    transactionDetails: transactions.filter(t => t.offerId === record.id).flatMap(t => [
      `Local prototype transaction ${t.id}: ${t.status}; updated ${t.updatedAt}. Not a verified sale or reuse.`,
      `Received date: ${t.history.some(h => h.status === "received") ? t.draft.receivedDate : "Not recorded"}; destination: ${t.draft.destinationUse}; quality check: ${t.draft.qualityCheck}`,
      `Transport: ${t.draft.logistics}; payer: ${t.draft.transportPayer}; cost IDR: ${t.draft.actualTransportCostIdr || "Unknown"}; scheduled: ${t.draft.scheduledDate || "Not recorded"}`,
    ]),
  } };
}
export const REPORT_LIMITATIONS = [
  "Offered quantity is availability, not evidence of collection, receipt or reuse.",
  "Actual quantities are user-reported. A photo cannot confirm moisture, quality or energy value; testing may be needed.",
  "Preliminary estimate — not verified carbon credits. No certification, automatic carbon-credit price or fixed biomass multiplier.",
];
export type ReportMethod = IntendedUse | "";
