import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyQuality, materialQualitySchema, qualityLines } from "../src/lib/material-quality";
import { qualityStatus, testResultsDraft, validateTestResults } from "../src/lib/test-results";

const now = "2026-10-24T04:00:00.000Z";
const evidence = { id: "test-evidence", name: "TEST-only-COA.pdf", type: "application/pdf", size: 300, category: "quality" as const, attachedAt: now };
function draft() {
  return { ...testResultsDraft(), source: "lab report" as const, date: "2026-10-23", confirmed: true };
}
test("offering without any test results has no numeric defaults", () => {
  const d = testResultsDraft();
  assert.deepEqual(d.values, { moisture: "", calorific: "", ash: "" });
  assert.equal(qualityStatus(), "Quality not yet tested");
  assert.equal(qualityStatus(emptyQuality()), "Quality not yet tested");
  assert.equal(d.confirmed, false);
  assert.equal(validateTestResults(d, now).ok, false);
});
test("one shared source and date preserves zero and unknown independently", () => {
  const d = draft();
  d.values.moisture = "0"; d.values.ash = "3"; d.bases.moisture = "wet"; d.bases.ash = "dry";
  const r = validateTestResults(d, now);
  assert.ok(r.ok);
  assert.equal(r.value.moisture.value, 0);
  assert.equal(r.value.calorific.value, null);
  assert.equal(r.value.ash.value, 3);
  assert.equal(r.value.moisture.source, "lab report");
  assert.equal(r.value.ash.date, "2026-10-23");
  assert.equal(r.value.testResult!.confirmedAt, now);
  assert.equal(r.value.testResult!.source, "lab report");
  const lines = qualityLines(r.value).join("\n");
  assert.equal(lines.match(/Shared source:/g)?.length, 1);
  assert.match(lines, /Calorific value \(kcal\/kg\): Not measured/);
  assert.match(lines, /Moisture \(%\): 0; mass basis: wet/);
});
test("a COA file can be saved alone without extracting or inventing measurements", () => {
  const r = validateTestResults({ ...draft(), evidence }, now);
  assert.ok(r.ok);
  for (const k of ["moisture", "calorific", "ash"] as const) assert.equal(r.value[k].value, null);
  assert.equal(r.value.testResult!.evidence!.id, evidence.id);
  assert.match(qualityStatus(r.value), /values not entered/);
  assert.match(qualityLines(r.value).join("\n"), /numeric values not entered/);
});
test("test results need explicit user confirmation, source and a valid date", () => {
  for (const patch of [{ confirmed: false }, { source: "" as const }, { date: "" }, { date: "2026-02-30" }]) {
    assert.equal(validateTestResults({ ...draft(), evidence, ...patch }, now).ok, false);
  }
});
test("invalid measured values are rejected even with a valid shared source", () => {
  for (const value of ["-1", "101", "NaN", "Infinity"]) {
    const d = draft(); d.values.moisture = value;
    assert.equal(validateTestResults(d, now).ok, false);
  }
});
test("existing results retain their measured values and bases without inventing shared provenance", () => {
  const q = emptyQuality();
  q.moisture = { value: 12, source: "measuring device", date: "2026-10-22", basis: "wet", evidence };
  q.ash = { value: 3, source: "lab report", date: "2026-10-23", basis: "dry" };
  const d = testResultsDraft(q);
  assert.equal(d.source, "");
  assert.equal(d.date, "");
  assert.equal(d.values.moisture, "12");
  assert.equal(d.bases.moisture, "wet");
  assert.equal(d.bases.ash, "dry");
  assert.equal(d.evidence, undefined);
  assert.equal(d.confirmed, false);
  assert.equal(materialQualitySchema.safeParse(q).success, true);
});
test("shared evidence metadata and unknown values survive serialization and require reconfirmation for edits", () => {
  const r = validateTestResults({ ...draft(), evidence }, now);
  assert.ok(r.ok);
  const restored = materialQualitySchema.parse(JSON.parse(JSON.stringify(r.value)));
  const reopened = testResultsDraft(restored);
  assert.equal(reopened.evidence!.id, evidence.id);
  assert.equal(reopened.values.moisture, "");
  assert.equal(reopened.source, "lab report");
  assert.equal(reopened.date, "2026-10-23");
  assert.equal(reopened.confirmed, false);
});
