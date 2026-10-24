import assert from "node:assert/strict";
import { test } from "node:test";
import { buildEstimationReport, estimationVersion, validateActualQuantities } from "../src/lib/impact-estimation";
import { assessmentSchema, prepareConnectedOffer, type MaterialRecord } from "../src/lib/journey";
import { buildImpactPdf } from "../src/lib/impact-pdf";
import { findMatches } from "../src/lib/biomass";
import { createDemoTransaction } from "../src/lib/transactions";

const now = "2026-10-13T08:00:00.000Z";
function record(): MaterialRecord {
  const scan = assessmentSchema.parse({
    wasteType: "Rice husks", confidence: "high", visibleClues: ["Golden boat-shaped husks"],
    visibleQualityIndicators: ["Fibrous surfaces"], possibleContamination: [], possibleUses: ["Biochar after inspection"],
    limitationNote: "Photo only; testing may be needed.",
  });
  const offer = prepareConnectedOffer(scan, { quantityTonnes: "10", askingPricePerTonneIdr: "120000", province: "West Java",
    city: "Bandung", logistics: "buyer-pickup", notes: "" }, now);
  if (!offer.ok) throw new Error(JSON.stringify(offer.errors));
  return { id: "batch-one", source: "photo", scan, createdAt: now, offer: offer.value, report: null, intendedUse: "Biochar" };
}
function report(r = record()) {
  const result = buildEstimationReport(r, "report-one", now);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}
test("production demand has no synthetic fixtures by default", () => {
  const r = record();
  assert.deepEqual(findMatches(r.offer!.supply), []);
  assert.equal(createDemoTransaction("demo-heat", "User interest message", r.offer!.supply, r.offer!.terms, "tx", now).ok, false);
});
test("report automatically carries material, original findings, offered quantity, location and selected method", () => {
  const r = record(), summary = report(r);
  assert.equal(summary.recordId, r.id);
  assert.equal(summary.material, "Rice husks");
  assert.equal(summary.method, "Biochar");
  assert.equal(summary.offeredTonnes, 10);
  assert.equal(summary.city, "Bandung");
  assert.deepEqual(summary.visibleClues, ["Golden boat-shaped husks"]);
  assert.equal(summary.collectedTonnes, null);
  assert.equal(summary.receivedTonnes, null);
  assert.equal(summary.reusedTonnes, null);
  assert.equal(summary.status, "Awaiting actual data");
  assert.equal(summary.emissionsStatus, "Not calculated");
});
test("report does not import actual quantities or buyer claims from legacy simulated reports", () => {
  const r = record();
  r.report = { generatedAt: now, sourceVersion: "old", text: "FICTIONAL DEMO: collected 10 tonnes, reused 10 tonnes" };
  assert.equal(report(r).reusedTonnes, null);
  assert.doesNotMatch(JSON.stringify(report(r)), /FICTIONAL DEMO/);
});
test("unknown amounts remain unknown; zero is a valid reported quantity", () => {
  const r = record();
  const unknown = validateActualQuantities(r, { collected: "", received: "", reused: "" }, now);
  assert.equal(unknown.ok, true);
  if (!unknown.ok) throw new Error("invalid");
  assert.equal(unknown.value.collected, null);
  const zero = validateActualQuantities(r, { collected: "0", received: "0", reused: "0" }, now);
  assert.equal(zero.ok, true);
  if (!zero.ok) throw new Error("invalid");
  r.actualQuantities = zero.value;
  assert.equal(report(r).reusedTonnes, 0);
  assert.equal(report(r).status, "Actual quantities recorded");
});
test("invalid actual quantities cannot silently become impact", () => {
  const r = record();
  for (const draft of [
    { collected: "5", received: "4.9", reused: "6" },
    { collected: "", received: "4.9", reused: "4" },
    { collected: "5", received: "", reused: "4" },
    { collected: "11", received: "5", reused: "4" },
    { collected: "-1", received: "5", reused: "0" },
    { collected: "Infinity", received: "5", reused: "0" },
  ]) assert.equal(validateActualQuantities(r, draft, now).ok, false);
});
test("report history snapshots stay unchanged when material method and actuals change", () => {
  const r = record();
  const first = report(r), version = first.sourceVersion;
  r.intendedUse = "Biomass fuel";
  const actual = validateActualQuantities(r, { collected: "5", received: "4.9", reused: "4" }, now);
  if (!actual.ok) throw new Error("invalid");
  r.actualQuantities = actual.value;
  r.scan.visibleClues.push("Additional user note");
  const second = report(r);
  assert.notEqual(estimationVersion(r), version);
  assert.equal(first.method, "Biochar");
  assert.equal(first.reusedTonnes, null);
  assert.deepEqual(first.visibleClues, ["Golden boat-shaped husks"]);
  assert.equal(second.method, "Biomass fuel");
  assert.equal(second.receivedTonnes, 4.9);
  assert.equal(second.reusedTonnes, 4);
});
test("partial actual data is not full impact, and missing method stays explicit", () => {
  const r = record();
  r.intendedUse = "";
  r.actualQuantities = { collected: null, received: 4.9, reused: null, updatedAt: now };
  assert.equal(report(r).status, "Partial actual data");
  assert.equal(report(r).method, "Not selected");
  assert.equal(report(r).reusedTonnes, null);
});
test("PDF is a genuine document with correctly separated quantities and brief limitations", async () => {
  const bytes = await buildImpactPdf(report());
  const text = Buffer.from(bytes).toString("latin1");
  assert.match(text, /^%PDF-/);
  assert.match(text, /%%EOF/);
  assert.match(text, /Impact Estimation/);
  assert.match(text, /Offered quantity: 10 tonnes/);
  assert.match(text, /Actually reused: Unknown/);
  assert.match(text, /Not calculated/);
  assert.doesNotMatch(text, /Demo Java|FICTIONAL DEMO|carbon credit value/);
});
test("historical PDF exports preserve unknown quantities independently of later actual entries", async () => {
  const r = record();
  const before = report(r);
  before.id = "before-receipt";
  r.intendedUse = "Biomass fuel";
  r.actualQuantities = { collected: 5, received: 4.9, reused: 4, updatedAt: now };
  const after = report(r);
  after.id = "after-reuse";
  const [older, newer] = await Promise.all([buildImpactPdf(before), buildImpactPdf(after)]);
  const oldText = Buffer.from(older).toString("latin1");
  const newText = Buffer.from(newer).toString("latin1");
  assert.match(oldText, /Actually reused: Unknown/);
  assert.match(oldText, /Intended use \/ processing: Biochar/);
  assert.match(oldText, /before-receipt/);
  assert.doesNotMatch(oldText, /after-reuse/);
  assert.match(newText, /Actually reused: 4 tonnes/);
  assert.match(newText, /Intended use \/ processing: Biomass fuel/);
  assert.match(newText, /after-reuse/);
  assert.doesNotMatch(newText, /before-receipt/);
});
