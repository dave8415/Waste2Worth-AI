import { z } from "zod";
import { USES, type IntendedUse } from "./biomass";
import type { MaterialRecord } from "./journey";
import type { Result } from "./transactions";

export const actualQuantitiesSchema = z.object({
  collected: z.number().min(0).max(1_000_000).nullable(),
  received: z.number().min(0).max(1_000_000).nullable(),
  reused: z.number().min(0).max(1_000_000).nullable(),
  updatedAt: z.string().datetime(),
});
export type ActualQuantities = z.infer<typeof actualQuantitiesSchema>;
export type ActualQuantityDraft = { collected: string; received: string; reused: string };
export const impactReportSchema = z.object({
  id: z.string(), recordId: z.string(), generatedAt: z.string().datetime(), sourceVersion: z.string().max(10000),
  material: z.string().max(1000), method: z.string().max(100), offeredTonnes: z.number().positive(),
  city: z.string().max(1000), province: z.string().max(1000),
  source: z.enum(["photo", "manual"]), confidence: z.enum(["low", "medium", "high"]),
  visibleClues: z.array(z.string()).max(30), qualityIndicators: z.array(z.string()).max(30),
  contamination: z.array(z.string()).max(30), potentialUses: z.array(z.string()).max(30),
  collectedTonnes: z.number().min(0).nullable(), receivedTonnes: z.number().min(0).nullable(), reusedTonnes: z.number().min(0).nullable(),
  status: z.enum(["Awaiting actual data", "Partial actual data", "Actual quantities recorded"]),
  emissionsStatus: z.literal("Data belum cukup"),
});
export type ImpactEstimationReport = z.infer<typeof impactReportSchema>;
export function estimationVersion(record: MaterialRecord): string {
  return JSON.stringify([record.id, record.offer?.submittedAt, record.intendedUse || "", record.actualQuantities || null]);
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
  if (values.reused !== null && (values.collected === null || values.received === null)) errors.reused = "Record collected and received quantities before reused quantity.";
  if (values.reused !== null && ((values.collected !== null && values.reused > values.collected) || (values.received !== null && values.reused > values.received))) errors.reused = "Reused quantity cannot exceed collected or received quantity.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { ...values, updatedAt: now } };
}
export function buildEstimationReport(record: MaterialRecord, id: string, now: string): Result<ImpactEstimationReport> {
  if (!record.offer) return { ok: false, errors: { record: "Submit an offer before generating a report." } };
  if (record.intendedUse && !(USES as readonly string[]).includes(record.intendedUse)) return { ok: false, errors: { method: "Choose an intended use." } };
  const actual = record.actualQuantities;
  const amounts = [actual?.collected ?? null, actual?.received ?? null, actual?.reused ?? null];
  const known = amounts.filter(v => v !== null).length;
  return { ok: true, value: {
    id, recordId: record.id, generatedAt: now, sourceVersion: estimationVersion(record),
    material: record.scan.wasteType, method: record.intendedUse || "Not selected",
    offeredTonnes: record.offer.supply.quantityTonnes, city: record.offer.supply.location, province: record.offer.supply.region,
    source: record.source, confidence: record.scan.confidence, visibleClues: [...record.scan.visibleClues],
    qualityIndicators: [...record.scan.visibleQualityIndicators], contamination: [...record.scan.possibleContamination],
    potentialUses: [...record.scan.possibleUses],
    collectedTonnes: amounts[0], receivedTonnes: amounts[1], reusedTonnes: amounts[2],
    status: known === 0 ? "Awaiting actual data" : known === 3 ? "Actual quantities recorded" : "Partial actual data",
    emissionsStatus: "Data belum cukup",
  } };
}
export const REPORT_LIMITATIONS = [
  "Offered quantity is availability, not evidence of collection, receipt or reuse.",
  "Actual quantities are user-reported. A photo cannot confirm moisture, quality or energy value; testing may be needed.",
  "Emissions savings are not calculated. This report is not certified or proof of carbon credits.",
];
export type ReportMethod = IntendedUse | "";
