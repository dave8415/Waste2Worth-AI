import assert from "node:assert/strict";
import { test } from "node:test";
import { DEMO_BUYERS } from "./fixtures/buyers";
import {
  buildImpactSummary, emptyImpact, emptySupply, exploreUses, findMatches,
  inferMaterial, parseSupply, type SupplyDraft,
} from "../src/lib/biomass";

const draft: SupplyDraft = {
  ...emptySupply, material: "rice-husk", quantityTonnes: "10",
  location: "Bandung", region: "West Java",
};
function supply(overrides: Partial<SupplyDraft> = {}) {
  const result = parseSupply({ ...draft, ...overrides });
  assert.equal(result.ok, true);
  if (!result.ok) throw new Error("Invalid test fixture");
  return result.value;
}

test("photo identification only suggests recognizable material, never moisture or quality", () => {
  assert.equal(inferMaterial("Likely rice husks"), "rice-husk");
  assert.equal(inferMaterial("Coconut shells"), "coconut-shell");
  assert.equal(inferMaterial("Unidentified brown material"), "");
});
test("supply requires material, positive quantity, location and demo region", () => {
  for (const value of [
    { material: "" as const }, { quantityTonnes: "" }, { quantityTonnes: "0" },
    { quantityTonnes: "-3" }, { quantityTonnes: "Infinity" }, { quantityTonnes: "1000001" },
    { location: " " }, { region: "" },
  ]) assert.equal(parseSupply({ ...draft, ...value }).ok, false);
});
test("optional moisture remains unknown rather than inferred; zero and 100 are valid", () => {
  assert.equal(supply().moisturePercent, null);
  assert.equal(supply({ moisturePercent: "0" }).moisturePercent, 0);
  assert.equal(supply({ moisturePercent: "100" }).moisturePercent, 100);
  for (const moisturePercent of ["-1", "101", "invalid"]) {
    assert.equal(parseSupply({ ...draft, moisturePercent }).ok, false);
  }
});
test("matches exclude incompatible materials and sort by explicit region and quantity rules", () => {
  const matches = findMatches(supply(), DEMO_BUYERS);
  assert.equal(matches[0].buyer.id, "demo-heat");
  assert.equal(matches[0].score, 2);
  assert.ok(matches.every(match => match.buyer.materials.includes("rice-husk")));
  assert.ok(matches.every(match => match.buyer.name.startsWith("Demo ")));
  assert.ok(matches.find(match => match.buyer.id === "demo-char")?.reasons.some(reason => reason.includes("Outside")));
});
test("region and quantity edits change the matching result; partial lots never exceed demand", () => {
  const outside = findMatches(supply({ region: "DKI Jakarta", location: "Jakarta", quantityTonnes: "0.1" }), DEMO_BUYERS);
  assert.ok(outside.every(match => !match.regionFits && !match.quantityFits));
  const large = findMatches(supply({ quantityTonnes: "100" }), DEMO_BUYERS);
  assert.ok(large.every(match => match.potentialTonnes <= match.buyer.demandTonnes));
  assert.deepEqual(findMatches(supply({ material: "other" }), DEMO_BUYERS), []);
});
test("all use routes require checks and respond to wet material or reported contamination", () => {
  const normal = exploreUses(supply());
  assert.equal(normal.length, 3);
  assert.ok(normal.every(route => route.checks.some(check => check.includes("Moisture is not provided"))));
  const wet = exploreUses(supply({ moisturePercent: "40" }));
  assert.ok(wet.every(route => route.checks.some(check => check.includes("Drying may be needed"))));
  const contaminated = exploreUses(supply({ quality: "contaminated" }));
  assert.ok(contaminated.every(route => route.outlook === "Pause for contamination checks"));
  assert.ok(exploreUses(supply({ material: "other" })).every(route => route.outlook === "Identify material first"));
});
test("impact requires separate collected/reused inputs and rejects reuse above collection", () => {
  for (const input of [
    emptyImpact, { ...emptyImpact, collectedTonnes: "10", reusedTonnes: "" },
    { ...emptyImpact, collectedTonnes: "5", reusedTonnes: "6" },
    { ...emptyImpact, collectedTonnes: "-2", reusedTonnes: "0" },
    { ...emptyImpact, collectedTonnes: "NaN", reusedTonnes: "0" },
  ]) assert.equal(buildImpactSummary(supply(), input).ok, false);
});
test("impact calculates user-reported mass flow, not emissions savings or confirmed transactions", () => {
  const result = buildImpactSummary(supply(), { ...emptyImpact, collectedTonnes: "10", reusedTonnes: "6", intendedUse: "Biochar" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.reusedSharePercent, 60);
  assert.equal(result.value.unallocatedTonnes, 4);
  assert.equal(result.value.location, "Bandung, West Java");
  assert.ok(result.value.disclaimer.includes("Emissions savings are not calculated"));
  assert.ok(result.value.disclaimer.includes("Not certified"));
  assert.ok(result.value.assumptions.some(note => note.includes("no sale or reuse is inferred")));
  assert.ok(result.value.missingEvidence.some(note => note.includes("baseline")));
  assert.ok(!Object.keys(result.value).some(key => /emission|carbonSaving|credit/i.test(key)));
});
test("zero quantities are explicit and do not create NaN or misleading reuse percentages", () => {
  const result = buildImpactSummary(supply(), { ...emptyImpact, collectedTonnes: "0", reusedTonnes: "0" });
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.equal(result.value.reusedSharePercent, null);
  assert.equal(result.value.unallocatedTonnes, 0);
});
