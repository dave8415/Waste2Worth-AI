import { QUALITY_KEYS, validateQuality, qualityEvidenceSchema, type MaterialQuality, type QualityDraft } from "./material-quality";
import type { EvidenceMeta, Result } from "./transactions";

export interface TestResultsDraft {
  values: Record<typeof QUALITY_KEYS[number], string>;
  bases: Record<typeof QUALITY_KEYS[number], "unknown" | "wet" | "dry">;
  source: "" | "lab report" | "measuring device" | "user entry";
  date: string;
  evidence?: EvidenceMeta;
  confirmed: boolean;
  laboratoryName?: string;
  reportNumber?: string;
  sampleId?: string;
  extractionModel?: string;
  extractedAt?: string;
  calorificType?: "gross" | "net" | "unknown";
}
export function testResultsDraft(quality?: MaterialQuality): TestResultsDraft {
  const measured = QUALITY_KEYS.map(k => quality?.[k]).filter(m => m?.value != null);
  const sources = new Set(measured.map(m => m!.source));
  const dates = new Set(measured.map(m => m!.date));
  const common = sources.size === 1 && dates.size === 1;
  return {
    values: Object.fromEntries(QUALITY_KEYS.map(k => [k, quality?.[k].value == null ? "" : String(quality[k].value)])) as TestResultsDraft["values"],
    bases: Object.fromEntries(QUALITY_KEYS.map(k => [k, quality?.[k].basis ?? "unknown"])) as TestResultsDraft["bases"],
    source: quality?.testResult?.source ?? (common ? measured[0]!.source : ""),
    date: quality?.testResult?.date ?? (common ? measured[0]!.date : ""),
    evidence: quality?.testResult?.evidence,
    confirmed: false,
    laboratoryName: quality?.testResult?.laboratoryName,
    reportNumber: quality?.testResult?.reportNumber,
    sampleId: quality?.testResult?.sampleId,
    extractionModel: quality?.testResult?.extractionModel,
    extractedAt: quality?.testResult?.extractedAt,
    calorificType: quality?.testResult?.calorificType,
  };
}
export function validateTestResults(draft: TestResultsDraft, nowIso: string): Result<MaterialQuality> {
  const errors: Record<string, string> = {};
  if (!draft.confirmed) errors.confirmed = "Confirm the entered results and document details before saving.";
  if (!["lab report", "measuring device", "user entry"].includes(draft.source)) errors.source = "Choose the shared result source.";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date) || !Number.isFinite(Date.parse(draft.date)) || new Date(draft.date).toISOString().slice(0, 10) !== draft.date) errors.date = "Enter a valid test date.";
  if (!QUALITY_KEYS.some(k => draft.values[k].trim() !== "") && !draft.evidence) errors.result = "Enter at least one measured value or attach a lab report / COA.";
  const evidence = draft.evidence ? qualityEvidenceSchema.safeParse(draft.evidence) : undefined;
  if (evidence && !evidence.success) errors.evidence = "Check the result evidence file.";
  if (Object.keys(errors).length) return { ok: false, errors };
  const legacy: QualityDraft = Object.fromEntries(QUALITY_KEYS.map(k => [k, {
    value: draft.values[k], basis: draft.bases[k], source: draft.source, date: draft.date,
  }])) as QualityDraft;
  const parsed = validateQuality(legacy);
  if (!parsed.ok) return parsed;
  return { ok: true, value: { ...parsed.value, testResult: {
    source: draft.source as "lab report" | "measuring device" | "user entry", date: draft.date,
    evidence: evidence?.success ? evidence.data : undefined, confirmedAt: nowIso,
    ...(draft.laboratoryName ? { laboratoryName: draft.laboratoryName } : {}),
    ...(draft.reportNumber ? { reportNumber: draft.reportNumber } : {}),
    ...(draft.sampleId ? { sampleId: draft.sampleId } : {}),
    ...(draft.extractionModel ? { extractionModel: draft.extractionModel } : {}),
    ...(draft.extractedAt ? { extractedAt: draft.extractedAt } : {}),
    ...(draft.calorificType ? { calorificType: draft.calorificType } : {}),
  } } };
}
export function qualityStatus(quality?: MaterialQuality): string {
  const measured = QUALITY_KEYS.some(k => quality?.[k].value != null);
  if (measured) return "Test results recorded — user-reported";
  if (quality?.testResult?.evidence) return "Lab report attached — values not entered";
  return "Quality not yet tested";
}
