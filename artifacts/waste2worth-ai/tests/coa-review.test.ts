import assert from "node:assert/strict";
import { test } from "node:test";
import type { CoaExtraction } from "@workspace/api-client-react";
import { applyCoaToDraft, canExtractDocument, clearExtractedValue, extractionReviewLines, extractionStatus, isPartialExtraction } from "../src/lib/coa-review";
import { emptyQuality, qualityLines } from "../src/lib/material-quality";
import { qualityStatus, testResultsDraft, validateTestResults } from "../src/lib/test-results";
import { estimationVersion } from "../src/lib/impact-estimation";
import { MATERIALS } from "../src/lib/biomass";

const now = "2026-10-24T04:00:00.000Z";
const evidence = { id: "coa-file", name: "TEST-only-COA.pdf", type: "application/pdf", size: 400, category: "quality" as const, attachedAt: now };

function extraction(overrides: Partial<CoaExtraction> = {}): CoaExtraction {
  return {
    documentType: "Certificate of Analysis",
    laboratoryName: "Example Laboratory",
    reportNumber: "COA-100",
    sampleId: "S-22",
    testDate: "2026-03-01",
    moisture: { value: 12.5, unit: "%", massBasis: "wet", method: "oven", printedText: "Moisture 12.5 %" },
    calorificValue: { value: 3800, unit: "kcal/kg", calorificType: "gross", massBasis: "dry", method: null, printedText: "GCV 3800" },
    ash: { value: 4.2, unit: "%", massBasis: "dry", method: null, printedText: "Ash 4.2 %" },
    warnings: [],
    documentLooksLikeLabReport: true,
    ...overrides,
  };
}

function offerRecord() {
  return {
    id: "batch-coa",
    createdAt: now,
    source: "photo" as const,
    scan: {
      wasteType: "Rice husk",
      confidence: "medium" as const,
      visibleClues: ["fibrous"],
      possibleUses: ["Fuel"],
      limitationNote: "A photo cannot confirm moisture.",
      visibleQualityIndicators: [],
      possibleContamination: [],
    },
    offer: {
      supply: {
        material: MATERIALS[0].id,
        quantityTonnes: 10,
        location: "Bandung",
        region: "West Java",
        moisturePercent: null,
        quality: "unknown" as const,
        qualityNotes: "",
      },
      terms: {
        village: "", pickupPin: "", privatePickupAddress: "", logistics: "to-be-agreed" as const,
        transportPayer: "unknown" as const, estimatedTransportCostIdr: "", loadingNeeds: "", unloadingNeeds: "",
        readyDate: "", deliveryWindowStart: "", deliveryWindowEnd: "", askingPricePerTonneIdr: "0",
        pricing: "negotiable" as const, minimumOrderTonnes: "",
      },
      notes: "",
      submittedAt: now,
    },
    report: null,
  };
}

test("extraction is available only for supported documents and is a separate step from file selection", () => {
  assert.equal(canExtractDocument("application/pdf"), true);
  assert.equal(canExtractDocument("image/jpeg"), true);
  assert.equal(canExtractDocument("image/png"), true);
  assert.equal(canExtractDocument("image/webp"), true);
  assert.equal(canExtractDocument("text/plain"), false);
  assert.equal(canExtractDocument("text/csv"), false);
  const draft = testResultsDraft();
  assert.deepEqual(draft.values, { moisture: "", calorific: "", ash: "" });
  assert.equal(draft.confirmed, false);
});

test("extracted values stay unsaved until confirmation and can be edited or removed", () => {
  const draft = applyCoaToDraft(testResultsDraft(), extraction());
  assert.equal(draft.values.moisture, "12.5");
  assert.equal(draft.source, "lab report");
  assert.equal(draft.confirmed, false);
  assert.equal(validateTestResults(draft, now).ok, false);
  const edited = { ...draft, values: { ...draft.values, moisture: "11" }, confirmed: true, date: "2026-03-01" };
  const saved = validateTestResults(edited, now);
  assert.ok(saved.ok);
  assert.equal(saved.value.moisture.value, 11);
  const cleared = clearExtractedValue(draft, "ash");
  assert.equal(cleared.values.ash, "");
  assert.equal(cleared.confirmed, false);
});

test("partial extraction and document-only saves leave missing values as Not measured", () => {
  const partial = extraction({ calorificValue: null, ash: { value: null, unit: null, massBasis: null, method: null, printedText: null } });
  assert.equal(isPartialExtraction(partial), true);
  const draft = applyCoaToDraft(testResultsDraft(), partial);
  assert.equal(draft.values.calorific, "");
  assert.equal(draft.values.ash, "");
  const documentOnly = validateTestResults({
    ...testResultsDraft(), source: "lab report", date: "2026-03-01", confirmed: true, evidence,
  }, now);
  assert.ok(documentOnly.ok);
  assert.equal(documentOnly.value.moisture.value, null);
  assert.equal(documentOnly.value.calorific.value, null);
  assert.equal(documentOnly.value.ash.value, null);
  assert.match(qualityLines(documentOnly.value).join("\n"), /Not measured/);
  assert.match(qualityStatus(documentOnly.value), /values not entered/);
});

test("manual entry still works without Gemini and offers can continue without test results", () => {
  const manual = validateTestResults({
    ...testResultsDraft(),
    values: { moisture: "8", calorific: "", ash: "" },
    source: "user entry",
    date: "2026-03-02",
    confirmed: true,
  }, now);
  assert.ok(manual.ok);
  assert.equal(manual.value.testResult?.source, "user entry");
  assert.equal(qualityStatus(), "Quality not yet tested");
  assert.equal(validateTestResults(testResultsDraft(), now).ok, false);
});

test("confirmed lab-report results appear in Market and Reports wording and mark reports outdated when changed", () => {
  const draft = applyCoaToDraft(testResultsDraft(), extraction());
  const saved = validateTestResults({ ...draft, confirmed: true, evidence }, now);
  assert.ok(saved.ok);
  const text = qualityLines(saved.value).join("\n");
  assert.match(text, /User-confirmed from uploaded lab report/);
  assert.match(text, /Source: uploaded lab report, reviewed and confirmed by user/);
  assert.doesNotMatch(text, /Gemini-measured|independently certified/);
  const record = { ...offerRecord(), quality: saved.value };
  const first = estimationVersion(record);
  record.quality = {
    ...saved.value,
    moisture: { ...saved.value.moisture, value: 18 },
  };
  assert.notEqual(estimationVersion(record), first);
});

test("review lines stay compact and do not treat candidates as measured", () => {
  const lines = extractionReviewLines(extraction({ moisture: null }));
  assert.ok(lines.some(line => line.label === "Moisture" && line.value === "Not found in document"));
  assert.equal(extractionStatus(extraction(), ""), "success");
  assert.equal(extractionStatus(extraction({ calorificValue: null }), ""), "partial");
  assert.equal(extractionStatus(extraction({ documentLooksLikeLabReport: false }), ""), "not-lab");
  assert.equal(extractionStatus(null, "Could not read"), "error");
  assert.equal(qualityLines(emptyQuality()).join("\n").includes("Quality not yet tested"), true);
});
