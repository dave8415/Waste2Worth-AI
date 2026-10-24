import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyQuality, validateQuality, type QualityDraft } from "../src/lib/material-quality";
import { emptyEmissions, estimateEmissions, parseEmissionsDraft, type EmissionsDraft } from "../src/lib/emissions";
import { assessmentSchema, prepareConnectedOffer, type MaterialRecord } from "../src/lib/journey";
import { buildEstimationReport, estimationVersion, resolveActuals, validateActualQuantities } from "../src/lib/impact-estimation";
import { buildImpactPdf } from "../src/lib/impact-pdf";
import { localTransaction } from "../src/lib/local-transaction";

const now = "2026-10-24T00:00:00.000Z";
function batch(): MaterialRecord {
  const scan = assessmentSchema.parse({ wasteType: "Rice straw", confidence: "medium", visibleClues: ["Fibrous stalks"],
    visibleQualityIndicators: ["Appears dry"], possibleContamination: [], possibleUses: ["Biomass fuel"],
    limitationNote: "A photo cannot establish measured quality." });
  const offer = prepareConnectedOffer(scan, { quantityTonnes: "10", askingPricePerTonneIdr: "0", province: "West Java", city: "Bandung", logistics: "buyer-pickup", notes: "" }, now);
  assert.ok(offer.ok);
  return { id: "measured-batch", createdAt: now, source: "photo", scan, offer: offer.value, report: null, intendedUse: "Biomass fuel",
    actualQuantities: { collected: 5, received: 4, reused: 3, massBasis: "dry", updatedAt: now } };
}
function completeInputs() {
  // Explicit artificial test inputs: not production defaults or scientific factors.
  return { ...emptyEmissions(), baselineActivity: "TEST baseline fuel", baselineSource: "TEST displacement record",
    baselineQuantity: 100, baselineUnit: "kg" as const, baselineFactor: 2, factorSource: "TEST factor source",
    quantityBasis: "wet" as const, factorBasis: "wet" as const, transportKg: 20, transportSource: "TEST transport inventory",
    processingKg: 10, processingSource: "TEST processing inventory", otherKg: 0, otherSource: "TEST no other activity",
    assumptions: "TEST boundary only; no automatic energy-equivalence claim." };
}
function qualityDraft(): QualityDraft {
  return Object.fromEntries(Object.entries(emptyQuality()).map(([key, value]) => [key, { ...value, value: "" }])) as QualityDraft;
}
test("missing quality is Not measured while explicit zero is preserved with provenance", () => {
  const d = qualityDraft();
  assert.equal(validateQuality(d).ok, true);
  d.moisture = { value: "0", date: "2026-10-23", source: "measuring device", basis: "wet" };
  const result = validateQuality(d);
  assert.ok(result.ok);
  assert.equal(result.value.moisture.value, 0);
  assert.equal(result.value.ash.value, null);
  assert.equal(result.value.moisture.source, "measuring device");
});
test("measured values reject missing provenance, impossible percentages and invalid dates", () => {
  for (const patch of [
    { value: "12", source: "" }, { value: "101", source: "lab report" }, { value: "-1", source: "lab report" },
    { value: "Infinity", source: "lab report" }, { value: "12", source: "lab report", date: "2026-02-30" },
  ]) {
    const d = qualityDraft();
    d.moisture = { ...d.moisture, date: "2026-10-23", ...patch } as QualityDraft["moisture"];
    assert.equal(validateQuality(d).ok, false);
  }
});
test("missing emission inputs do not become zero or a fixed tonnes multiplier", () => {
  const r = batch(), e = estimateEmissions(undefined, r.actualQuantities, r.intendedUse!);
  assert.equal(e.status, "Not calculated");
  assert.equal(e.netKg, null);
  assert.ok(e.missing.some(m => m.includes("factor")));
  r.actualQuantities!.reused = 999;
  assert.equal(estimateEmissions(completeInputs(), r.actualQuantities, r.intendedUse!).netKg, null);
});
test("provisional baseline minus project result uses documented units and explicit zero", () => {
  const r = batch(), i = completeInputs();
  const e = estimateEmissions(i, r.actualQuantities, r.intendedUse!);
  assert.equal(e.baselineKg, 200);
  assert.equal(e.projectKg, 30);
  assert.equal(e.netKg, 170);
  i.transportKg = 300;
  assert.equal(estimateEmissions(i, r.actualQuantities, r.intendedUse!).netKg, -110);
  assert.equal(estimateEmissions({ ...i, transportKg: null }, r.actualQuantities, r.intendedUse!).netKg, null);
  assert.equal(estimateEmissions({ ...i, otherSource: "" }, r.actualQuantities, r.intendedUse!).netKg, null);
});
test("wet/dry factors cannot be combined implicitly and actual basis is required", () => {
  const r = batch(), i = completeInputs();
  assert.equal(estimateEmissions({ ...i, quantityBasis: "dry" }, r.actualQuantities, r.intendedUse!).netKg, null);
  assert.equal(estimateEmissions(i, { ...r.actualQuantities!, massBasis: "unknown" }, r.intendedUse!).netKg, null);
  assert.equal(estimateEmissions(i, undefined, r.intendedUse!).netKg, null);
  assert.equal(estimateEmissions(i, { received: 0, reused: 0, massBasis: "dry" }, r.intendedUse!).netKg, null);
  for (const method of ["Biochar", "Compost"]) assert.equal(estimateEmissions(i, r.actualQuantities, method).netKg, null);
});
test("negative, infinite, mismatched and reused-greater-than-received quantities are rejected", () => {
  const r = batch();
  for (const draft of [
    { collected: "5", received: "4", reused: "4.1" }, { collected: "-1", received: "0", reused: "0" },
    { collected: "5", received: "6", reused: "0" }, { collected: "NaN", received: "4", reused: "0" },
  ]) assert.equal(validateActualQuantities(r, draft, now).ok, false);
  const draft = Object.fromEntries(Object.entries(emptyEmissions()).map(([k, v]) => [k, v === null ? "" : v])) as EmissionsDraft;
  draft.transportKg = "-1";
  assert.equal(parseEmissionsDraft(draft).success, false);
  draft.transportKg = "0";
  assert.equal(parseEmissionsDraft(draft).success, true);
});
test("completion never creates reuse and live linked receipt edits invalidate reports", () => {
  const r = batch(), tx = localTransaction(r, "tracking-one", now);
  tx.status = "completed";
  tx.history.push({ status: "received", at: now }, { status: "completed", at: now });
  tx.draft.actualCollectedTonnes = "5"; tx.draft.receivedTonnes = "4";
  r.actualQuantities!.sourceTransactionId = tx.id;
  assert.equal(resolveActuals(r, [tx]).actualQuantities!.reused, null);
  tx.draft.actualReusedTonnes = "3";
  r.emissionsInputs = completeInputs();
  const first = buildEstimationReport(r, "first", now, [tx]);
  assert.ok(first.ok);
  assert.equal(first.value.reusedTonnes, 3);
  tx.draft.actualReusedTonnes = "2";
  assert.notEqual(first.value.sourceVersion, estimationVersion(r, [tx]));
  const next = buildEstimationReport(r, "second", now, [tx]);
  assert.ok(next.ok);
  assert.equal(next.value.reusedTonnes, 2);
  assert.equal(first.value.reusedTonnes, 3);
  tx.draft.destinationUse = "Biochar";
  const biochar = buildEstimationReport(r, "biochar", now, [tx]);
  assert.ok(biochar.ok);
  assert.equal(biochar.value.method, "Biochar");
  assert.equal(biochar.value.emissions!.netKg, null);
  tx.draft.destinationUse = "Biomass fuel";
  tx.status = "cancelled";
  assert.equal(resolveActuals(r, [tx]).actualQuantities!.received, null);
});
test("quality, assumptions and transaction changes all mark snapshots outdated", () => {
  const r = batch(), first = estimationVersion(r);
  r.quality = emptyQuality();
  r.quality.moisture = { value: 10, source: "user entry", date: "2026-10-23", basis: "wet" };
  assert.notEqual(estimationVersion(r), first);
  const second = estimationVersion(r);
  r.emissionsInputs = completeInputs();
  assert.notEqual(estimationVersion(r), second);
  const third = estimationVersion(r);
  r.emissionsInputs.assumptions = "Changed boundary";
  assert.notEqual(estimationVersion(r), third);
  const snapshot = buildEstimationReport(r, "immutable", now);
  assert.ok(snapshot.ok);
  r.emissionsInputs.assumptions = "Another change";
  r.quality.moisture.value = 15;
  assert.equal(snapshot.value.emissions!.inputs.assumptions, "Changed boundary");
  assert.equal(snapshot.value.quality!.moisture.value, 10);
});
test("PDF contains quality provenance, formulas, inputs, no credit price and explicit outdated warning", async () => {
  const r = batch();
  r.emissionsInputs = completeInputs();
  r.quality = emptyQuality();
  r.quality.moisture = { value: 0, source: "lab report", date: "2026-10-23", basis: "wet" };
  const result = buildEstimationReport(r, "pdf-one", now);
  assert.ok(result.ok);
  const bytes = await buildImpactPdf(result.value, undefined, true);
  const text = Buffer.from(bytes).toString("latin1");
  assert.match(text, /^%PDF-/);
  for (const phrase of ["OUTDATED", "Not measured", "source: lab report", "2026-10-23", "Baseline quantity", "Emission factor", "kg CO2e", "TEST factor source", "not verified carbon credits"]) assert.ok(text.includes(phrase), phrase);
  assert.doesNotMatch(text, /carbon.credit price:.*\d/i);
});
