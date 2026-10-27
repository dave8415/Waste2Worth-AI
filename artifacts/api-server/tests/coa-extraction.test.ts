import assert from "node:assert/strict";
import { test } from "node:test";
import { validateCoaDocument } from "../src/lib/coa-document.ts";
import { containsUnsafePayload, sanitizeCoaExtraction } from "../src/lib/coa-extraction.ts";
import { geminiErrorMessage } from "../src/lib/gemini-errors.ts";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const webp = Buffer.from("RIFF....WEBP....", "ascii");
const pdf = Buffer.from("%PDF-1.4 sample laboratory report", "ascii");

function b64(bytes: Buffer): string {
  return bytes.toString("base64");
}

function printed(overrides: Record<string, unknown> = {}) {
  return {
    documentType: "Certificate of Analysis",
    laboratoryName: "Example Laboratory",
    reportNumber: "COA-100",
    sampleId: "S-22",
    testDate: "2026-03-01",
    moisture: { value: 12.5, unit: "%", massBasis: "wet", method: "oven", printedText: "Moisture 12.5 %" },
    calorificValue: { value: 3800, unit: "kcal/kg", calorificType: "gross", massBasis: "dry", method: null, printedText: "GCV 3800 kcal/kg" },
    ash: { value: 4.2, unit: "%", massBasis: "dry", method: null, printedText: "Ash 4.2 %" },
    warnings: [],
    documentLooksLikeLabReport: true,
    ...overrides,
  };
}

test("valid PDF and image signatures are accepted", () => {
  assert.equal(validateCoaDocument(b64(pdf), "application/pdf").ok, true);
  assert.equal(validateCoaDocument(b64(jpeg), "image/jpeg").ok, true);
  assert.equal(validateCoaDocument(b64(png), "image/png").ok, true);
  assert.equal(validateCoaDocument(b64(webp), "image/webp").ok, true);
});

test("invalid base64, empty documents, oversize files and signature mismatches are rejected", () => {
  assert.equal(validateCoaDocument("abc", "application/pdf").ok, false);
  assert.equal(validateCoaDocument(b64(Buffer.alloc(0)), "application/pdf").ok, false);
  const huge = Buffer.concat([Buffer.from("%PDF"), Buffer.alloc(5 * 1024 * 1024)]);
  const oversize = validateCoaDocument(huge.toString("base64"), "application/pdf");
  assert.equal(oversize.ok, false);
  if (!oversize.ok) assert.equal(oversize.status, 413);
  const mismatch = validateCoaDocument(b64(pdf), "image/jpeg");
  assert.equal(mismatch.ok, false);
  if (!mismatch.ok) assert.equal(mismatch.status, 400);
  assert.equal(validateCoaDocument(b64(pdf), "text/plain").ok, false);
});

test("valid PDF extraction keeps printed values and leaves missing fields null", () => {
  const full = sanitizeCoaExtraction(printed());
  assert.equal(full.moisture?.value, 12.5);
  assert.equal(full.calorificValue?.calorificType, "gross");
  const partial = sanitizeCoaExtraction(printed({
    calorificValue: null,
    ash: { value: null, unit: null, massBasis: null, method: null, printedText: null },
  }));
  assert.equal(partial.calorificValue, null);
  assert.equal(partial.ash?.value, null);
  assert.equal(partial.moisture?.value, 12.5);
});

test("impossible numeric candidates are discarded", () => {
  const bad = sanitizeCoaExtraction(printed({
    moisture: { value: 140, unit: "%", massBasis: "wet", method: null, printedText: "140%" },
    ash: { value: -1, unit: "%", massBasis: "dry", method: null, printedText: "-1" },
    calorificValue: { value: 0, unit: "kcal/kg", calorificType: "gross", massBasis: "dry", method: null, printedText: "0" },
  }));
  assert.equal(bad.moisture, null);
  assert.equal(bad.ash, null);
  assert.equal(bad.calorificValue, null);
  assert.ok(bad.warnings.some(line => /Moisture/.test(line)));
  assert.ok(bad.warnings.some(line => /Calorific/.test(line)));
});

test("a biomass photo is not accepted as laboratory evidence", () => {
  const photo = sanitizeCoaExtraction(printed({
    documentLooksLikeLabReport: false,
    documentType: "Photograph",
  }));
  assert.equal(photo.moisture, null);
  assert.equal(photo.calorificValue, null);
  assert.equal(photo.ash, null);
  assert.match(photo.warnings.join(" "), /does not look like a laboratory report/);
});

test("quota guidance stays safe for documents and photo messages are unchanged", () => {
  assert.match(geminiErrorMessage(429, null, "document"), /quota/);
  assert.match(geminiErrorMessage(400, { error: { details: null } }), /Try another clear/);
});

test("logs and responses never include the API key or raw document", () => {
  assert.equal(containsUnsafePayload({ error: "ok" }, "secret-key"), false);
  assert.equal(containsUnsafePayload("header secret-key leaked", "secret-key"), true);
  assert.equal(containsUnsafePayload("AIzaSyDummyValueHere"), true);
});
