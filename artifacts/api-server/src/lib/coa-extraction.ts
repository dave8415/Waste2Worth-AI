export const GEMINI_COA_MODEL = "gemini-3.1-flash-lite";

export const COA_EXTRACTION_PROMPT = [
  "Extract only values that are visibly printed in the uploaded document.",
  "Do not infer, estimate, calculate, or invent missing values.",
  "Do not convert visual appearance into a moisture percentage.",
  "Do not treat a biomass photo, farm photo, or heap of residue as a laboratory report.",
  "If the file is not clearly a COA, certificate of analysis, or laboratory test report, set documentLooksLikeLabReport to false, set every measurement to null, and add a warning.",
  "Keep ambiguous values null and add a warning.",
  "Preserve the printed unit exactly as shown.",
  "Preserve whether calorific value is GCV/HHV (gross), NCV/LHV (net), or unknown.",
  "Preserve the printed mass basis when available (wet, as-received, dry, or unknown).",
  "Never claim that the document or laboratory is verified.",
  "Never output a value that is not printed in the document.",
  "Return JSON with nullable fields: documentType, laboratoryName, reportNumber, sampleId, testDate, moisture, calorificValue, ash, warnings, documentLooksLikeLabReport.",
  "Each measurement object has nullable value, unit, massBasis, method, and printedText.",
  "calorificValue also has nullable calorificType of gross, net, or unknown.",
  "testDate must be YYYY-MM-DD only when that date is printed; otherwise null.",
].join(" ");

export const COA_RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    documentType: { type: "STRING", nullable: true },
    laboratoryName: { type: "STRING", nullable: true },
    reportNumber: { type: "STRING", nullable: true },
    sampleId: { type: "STRING", nullable: true },
    testDate: { type: "STRING", nullable: true },
    moisture: {
      type: "OBJECT",
      nullable: true,
      properties: {
        value: { type: "NUMBER", nullable: true },
        unit: { type: "STRING", nullable: true },
        massBasis: { type: "STRING", nullable: true },
        method: { type: "STRING", nullable: true },
        printedText: { type: "STRING", nullable: true },
      },
    },
    calorificValue: {
      type: "OBJECT",
      nullable: true,
      properties: {
        value: { type: "NUMBER", nullable: true },
        unit: { type: "STRING", nullable: true },
        calorificType: { type: "STRING", nullable: true, enum: ["gross", "net", "unknown"] },
        massBasis: { type: "STRING", nullable: true },
        method: { type: "STRING", nullable: true },
        printedText: { type: "STRING", nullable: true },
      },
    },
    ash: {
      type: "OBJECT",
      nullable: true,
      properties: {
        value: { type: "NUMBER", nullable: true },
        unit: { type: "STRING", nullable: true },
        massBasis: { type: "STRING", nullable: true },
        method: { type: "STRING", nullable: true },
        printedText: { type: "STRING", nullable: true },
      },
    },
    warnings: { type: "ARRAY", items: { type: "STRING" } },
    documentLooksLikeLabReport: { type: "BOOLEAN", nullable: true },
  },
  required: [
    "documentType",
    "laboratoryName",
    "reportNumber",
    "sampleId",
    "testDate",
    "moisture",
    "calorificValue",
    "ash",
    "warnings",
    "documentLooksLikeLabReport",
  ],
} as const;

type Measurement = {
  value: number | null;
  unit: string | null;
  massBasis: string | null;
  method: string | null;
  printedText: string | null;
};

type Calorific = Measurement & {
  calorificType: "gross" | "net" | "unknown" | null;
};

export type CoaCandidate = {
  documentType: string | null;
  laboratoryName: string | null;
  reportNumber: string | null;
  sampleId: string | null;
  testDate: string | null;
  moisture: Measurement | null;
  calorificValue: Calorific | null;
  ash: Measurement | null;
  warnings: string[];
  documentLooksLikeLabReport: boolean | null;
};

function finiteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function nullableText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }
  const text = value.trim();
  return text ? text : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function readMeasurement(value: unknown): Measurement | null {
  const record = asRecord(value);
  if (!record) {
    return null;
  }
  return {
    value: finiteNumber(record.value),
    unit: nullableText(record.unit),
    massBasis: nullableText(record.massBasis),
    method: nullableText(record.method),
    printedText: nullableText(record.printedText),
  };
}

function readCalorific(value: unknown): Calorific | null {
  const base = readMeasurement(value);
  if (!base) {
    return null;
  }
  const record = asRecord(value);
  const rawType = nullableText(record?.calorificType);
  const calorificType =
    rawType === "gross" || rawType === "net" || rawType === "unknown" ? rawType : null;
  return { ...base, calorificType };
}

function rejectPercent(measurement: Measurement | null, label: string, warnings: string[]): Measurement | null {
  if (!measurement || measurement.value == null) {
    return measurement;
  }
  if (measurement.value < 0 || measurement.value > 100) {
    warnings.push(`${label} printed as ${measurement.value} is outside 0-100% and was discarded.`);
    return null;
  }
  return measurement;
}

function rejectCalorific(measurement: Calorific | null, warnings: string[]): Calorific | null {
  if (!measurement || measurement.value == null) {
    return measurement;
  }
  if (measurement.value <= 0) {
    warnings.push("Calorific value at or below zero was discarded.");
    return null;
  }
  return measurement;
}

export function sanitizeCoaExtraction(value: unknown): CoaCandidate {
  const record = asRecord(value) ?? {};
  const warnings = Array.isArray(record.warnings)
    ? record.warnings.filter((line): line is string => typeof line === "string" && line.trim() !== "").map(line => line.trim())
    : [];

  const looksLikeReport = typeof record.documentLooksLikeLabReport === "boolean"
    ? record.documentLooksLikeLabReport
    : null;

  let moisture = readMeasurement(record.moisture);
  let ash = readMeasurement(record.ash);
  let calorificValue = readCalorific(record.calorificValue);

  if (looksLikeReport === false) {
    moisture = null;
    ash = null;
    calorificValue = null;
    warnings.push("This file does not look like a laboratory report. Printed quality values were not accepted.");
  } else {
    moisture = rejectPercent(moisture, "Moisture", warnings);
    ash = rejectPercent(ash, "Ash", warnings);
    calorificValue = rejectCalorific(calorificValue, warnings);
    if (looksLikeReport == null) {
      warnings.push("Document type is unclear. Review every extracted value before saving.");
    }
  }

  const testDate = nullableText(record.testDate);
  const validDate = testDate && /^\d{4}-\d{2}-\d{2}$/.test(testDate) && Number.isFinite(Date.parse(testDate))
    && new Date(testDate).toISOString().slice(0, 10) === testDate
    ? testDate
    : null;
  if (testDate && !validDate) {
    warnings.push("The printed test date could not be read as a calendar date.");
  }

  return {
    documentType: nullableText(record.documentType),
    laboratoryName: nullableText(record.laboratoryName),
    reportNumber: nullableText(record.reportNumber),
    sampleId: nullableText(record.sampleId),
    testDate: validDate,
    moisture,
    calorificValue,
    ash,
    warnings: [...new Set(warnings)],
    documentLooksLikeLabReport: looksLikeReport,
  };
}

export function containsUnsafePayload(value: unknown, secret?: string): boolean {
  const text = typeof value === "string" ? value : JSON.stringify(value);
  if (secret && text.includes(secret)) {
    return true;
  }
  return /AIza[A-Za-z0-9_-]{10,}/.test(text);
}
