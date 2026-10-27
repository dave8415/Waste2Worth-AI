import type { CoaExtraction } from "@workspace/api-client-react";
import type { TestResultsDraft } from "./test-results";

export const EXTRACTABLE_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"] as const;

export function canExtractDocument(type: string): boolean {
  return (EXTRACTABLE_TYPES as readonly string[]).includes(type);
}

export function normalizePrintedBasis(value: string | null | undefined): TestResultsDraft["bases"]["moisture"] {
  const text = (value ?? "").toLowerCase();
  if (/\b(wet|as[-\s]?received|ar)\b/.test(text)) return "wet";
  if (/\b(dry|odb|oven[-\s]?dry)\b/.test(text)) return "dry";
  return "unknown";
}

export function isPartialExtraction(extraction: CoaExtraction): boolean {
  const missing = [
    extraction.moisture?.value == null,
    extraction.calorificValue?.value == null,
    extraction.ash?.value == null,
  ].filter(Boolean).length;
  return missing > 0 && missing < 3;
}

export function applyCoaToDraft(draft: TestResultsDraft, extraction: CoaExtraction): TestResultsDraft {
  if (extraction.documentLooksLikeLabReport === false) {
    return { ...draft, confirmed: false };
  }

  const next: TestResultsDraft = {
    ...draft,
    confirmed: false,
    source: "lab report",
    laboratoryName: extraction.laboratoryName ?? draft.laboratoryName,
    reportNumber: extraction.reportNumber ?? draft.reportNumber,
    sampleId: extraction.sampleId ?? draft.sampleId,
    extractionModel: "gemini-3.1-flash-lite",
    extractedAt: new Date().toISOString(),
    calorificType: (["gross", "net", "unknown"] as const).includes(
      extraction.calorificValue?.calorificType as "gross",
    ) ? extraction.calorificValue!.calorificType as "gross" | "net" | "unknown" : draft.calorificType,
  };

  if (extraction.testDate) {
    next.date = extraction.testDate;
  }

  if (extraction.moisture?.value != null) {
    next.values = { ...next.values, moisture: String(extraction.moisture.value) };
    next.bases = { ...next.bases, moisture: normalizePrintedBasis(extraction.moisture.massBasis) };
  }
  if (extraction.calorificValue?.value != null) {
    next.values = { ...next.values, calorific: String(extraction.calorificValue.value) };
    next.bases = { ...next.bases, calorific: normalizePrintedBasis(extraction.calorificValue.massBasis) };
  }
  if (extraction.ash?.value != null) {
    next.values = { ...next.values, ash: String(extraction.ash.value) };
    next.bases = { ...next.bases, ash: normalizePrintedBasis(extraction.ash.massBasis) };
  }

  return next;
}

export function clearExtractedValue(draft: TestResultsDraft, key: keyof TestResultsDraft["values"]): TestResultsDraft {
  return {
    ...draft,
    confirmed: false,
    values: { ...draft.values, [key]: "" },
    bases: { ...draft.bases, [key]: "unknown" },
    ...(key === "calorific" ? { calorificType: undefined } : {}),
  };
}

export function extractionStatus(extraction: CoaExtraction | null, error: string): "idle" | "success" | "partial" | "not-lab" | "error" {
  if (error) return "error";
  if (!extraction) return "idle";
  if (extraction.documentLooksLikeLabReport === false) return "not-lab";
  if (isPartialExtraction(extraction)) return "partial";
  return "success";
}

function shown(value: string | number | null | undefined): string {
  if (value == null || value === "") return "Not found in document";
  return String(value);
}

export function extractionReviewLines(extraction: CoaExtraction): Array<{ label: string; value: string }> {
  const calorificType = extraction.calorificValue?.calorificType;
  return [
    { label: "Lab name", value: shown(extraction.laboratoryName) },
    { label: "Report number", value: shown(extraction.reportNumber) },
    { label: "Sample ID", value: shown(extraction.sampleId) },
    { label: "Test date", value: shown(extraction.testDate) },
    { label: "Moisture", value: extraction.moisture?.value == null ? "Not found in document" : `${extraction.moisture.value} ${extraction.moisture.unit ?? ""}`.trim() },
    { label: "Calorific value", value: extraction.calorificValue?.value == null ? "Not found in document" : `${extraction.calorificValue.value} ${extraction.calorificValue.unit ?? ""}`.trim() },
    { label: "Calorific type", value: shown(calorificType) },
    { label: "Ash", value: extraction.ash?.value == null ? "Not found in document" : `${extraction.ash.value} ${extraction.ash.unit ?? ""}`.trim() },
    { label: "Mass basis", value: [
      extraction.moisture?.massBasis ? `Moisture: ${extraction.moisture.massBasis}` : "",
      extraction.calorificValue?.massBasis ? `Calorific: ${extraction.calorificValue.massBasis}` : "",
      extraction.ash?.massBasis ? `Ash: ${extraction.ash.massBasis}` : "",
    ].filter(Boolean).join("; ") || "Not found in document" },
    { label: "Printed source", value: [
      extraction.moisture?.printedText,
      extraction.calorificValue?.printedText,
      extraction.ash?.printedText,
    ].filter(Boolean).join(" · ") || "Not found in document" },
  ];
}
