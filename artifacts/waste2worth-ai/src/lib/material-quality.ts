import { z } from "zod";
import type { EvidenceMeta, Result } from "./transactions";

export const QUALITY_KEYS = ["moisture", "calorific", "ash"] as const;
export const QUALITY_LABELS = { moisture: "Moisture (%)", calorific: "Calorific value (kcal/kg)", ash: "Ash (%)" };
export const massBasisSchema = z.enum(["unknown", "wet", "dry"]);
export const qualityEvidenceSchema = z.object({
  id: z.string(), name: z.string(), type: z.string(), size: z.number().positive().max(5 * 1024 * 1024),
  category: z.literal("quality"), attachedAt: z.string().datetime(),
});
export const measurementSchema = z.object({
  value: z.number().finite().min(0).nullable(),
  source: z.enum(["", "lab report", "measuring device", "user entry"]),
  date: z.string(), basis: massBasisSchema,
  evidence: qualityEvidenceSchema.optional(),
});
export const materialQualitySchema = z.object({
  moisture: measurementSchema, calorific: measurementSchema, ash: measurementSchema,
});
export type MaterialQuality = z.infer<typeof materialQualitySchema>;
export type QualityDraft = Record<typeof QUALITY_KEYS[number], {
  value: string; source: z.infer<typeof measurementSchema>["source"]; date: string;
  basis: z.infer<typeof massBasisSchema>; evidence?: EvidenceMeta;
}>;
export const emptyQuality = (): MaterialQuality => Object.fromEntries(QUALITY_KEYS.map(k =>
  [k, { value: null, source: "", date: "", basis: "unknown" }])) as MaterialQuality;
export function validateQuality(draft: QualityDraft): Result<MaterialQuality> {
  const errors: Record<string, string> = {};
  const quality = emptyQuality();
  for (const key of QUALITY_KEYS) {
    const d = draft[key], n = d.value.trim() === "" ? null : Number(d.value);
    if (n !== null) {
      if (!Number.isFinite(n) || n < 0 || n > (key === "calorific" ? 20000 : 100)) errors[key] = `Enter a value from 0 to ${key === "calorific" ? 20000 : 100}.`;
      if (!["lab report", "measuring device", "user entry"].includes(d.source)) errors[key] = "Record the value's source.";
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !Number.isFinite(Date.parse(d.date)) || new Date(d.date).toISOString().slice(0, 10) !== d.date) errors[key] = "Record a valid measurement date.";
      const parsed = measurementSchema.safeParse({ ...d, value: n });
      if (!parsed.success) errors[key] = "Check the measurement and evidence metadata.";
      else quality[key] = parsed.data;
    }
  }
  return Object.keys(errors).length ? { ok: false, errors } : { ok: true, value: quality };
}
export function qualityLines(quality?: MaterialQuality): string[] {
  return QUALITY_KEYS.map(k => {
    const m = quality?.[k];
    return `${QUALITY_LABELS[k]}: ${m?.value == null ? "Not measured" : `${m.value}; source: ${m.source}; date: ${m.date}; mass basis: ${m.basis}; evidence: ${m.evidence?.name || "Not provided"}`}`;
  });
}
