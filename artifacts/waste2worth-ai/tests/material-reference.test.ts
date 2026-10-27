import assert from "node:assert/strict";
import { test } from "node:test";
import { estimateEmissions, emptyEmissions } from "../src/lib/emissions";
import { assessmentSchema, prepareConnectedOffer } from "../src/lib/journey";
import { emptyQuality, qualityLines } from "../src/lib/material-quality";
import {
  calorificDisplay,
  calorificKcalDisplay,
  lookupMaterialReference,
  mjToApproxKcal,
  MJ_TO_KCAL,
  referenceItems,
  REFERENCE_GUIDANCE,
  REFERENCE_HEADLINE,
  REFERENCE_UNAVAILABLE,
  RICE_HUSK_REFERENCE,
  RICE_STRAW_REFERENCE,
} from "../src/lib/material-reference";
import { qualityStatus, testResultsDraft, validateTestResults } from "../src/lib/test-results";

const now = "2026-10-24T04:00:00.000Z";
const scan = assessmentSchema.parse({
  wasteType: "Likely rice husks",
  confidence: "medium",
  visibleClues: ["Small golden husks"],
  visibleQualityIndicators: ["Mixed particle sizes"],
  possibleContamination: [],
  possibleUses: ["Biochar after testing"],
  limitationNote: "A photo cannot confirm moisture, quality or energy value; lab testing may be needed.",
});

test("rice husk aliases select the IRRI rice husk reference", () => {
  for (const label of ["rice husk", "Rice husks", "rice hull", "rice hulls", "sekam padi", "Likely rice husks after milling"]) {
    assert.equal(lookupMaterialReference(label)?.id, "rice-husk");
  }
  assert.equal(lookupMaterialReference("sekam padi kering")?.material, "Rice husk");
});

test("rice husk reference shows four typical values, conversion and IRRI source", () => {
  const items = referenceItems(RICE_HUSK_REFERENCE);
  assert.equal(items.length, 4);
  assert.deepEqual(items.map(item => item.label), [
    "Moisture", "Calorific value", "Ash", "Loose bulk density",
  ]);
  assert.equal(items[0].value, "14–15%");
  assert.equal(MJ_TO_KCAL, 238.8459);
  assert.equal(mjToApproxKcal(13), 3100);
  assert.equal(mjToApproxKcal(16), 3820);
  assert.match(calorificDisplay(RICE_HUSK_REFERENCE), /13–16 MJ\/kg/);
  assert.match(calorificDisplay(RICE_HUSK_REFERENCE), /as received/);
  assert.match(calorificKcalDisplay(RICE_HUSK_REFERENCE), /3,100–3,820 kcal\/kg/);
  assert.match(items[2].value, /18%/);
  assert.match(items[2].value, /dry basis/);
  assert.match(items[3].value, /100 kg\/m³/);
  assert.match(REFERENCE_GUIDANCE, /general guidance/);
  assert.equal(
    RICE_HUSK_REFERENCE.source.urls[0],
    "https://knowledgebank.irri.org/step-by-step-production/postharvest/rice-by-products/rice-husk",
  );
  assert.equal(RICE_HUSK_REFERENCE.source.label, "IRRI Rice Knowledge Bank");
  assert.match(REFERENCE_HEADLINE, /not measured for this batch/);
});

test("rice straw reference uses IRRI values with an explicit basis", () => {
  for (const label of ["rice straw", "jerami padi", "Likely rice straw after harvest"]) {
    assert.equal(lookupMaterialReference(label)?.id, "rice-straw");
  }
  const items = referenceItems(RICE_STRAW_REFERENCE);
  assert.equal(items[0].value, "12–17%");
  assert.match(items[0].detail ?? "", /wet basis/);
  assert.match(calorificDisplay(RICE_STRAW_REFERENCE), /14\.08–15\.09 MJ\/kg/);
  assert.match(calorificDisplay(RICE_STRAW_REFERENCE), /dry basis/);
  assert.match(calorificKcalDisplay(RICE_STRAW_REFERENCE), /3,360–3,600 kcal\/kg/);
  assert.match(items.find(item => item.label === "Ash")?.value ?? "", /18\.67–29\.1%/);
  assert.match(items.find(item => item.label === "Ash")?.value ?? "", /dry basis/);
  assert.ok(RICE_STRAW_REFERENCE.combustionRisks?.some(note => /slagging and fouling/i.test(note)));
  assert.match(RICE_STRAW_REFERENCE.source.urls[0], /rice-straw/);
});

test("unsupported materials do not receive invented numbers", () => {
  for (const label of ["Palm kernel shells", "Unidentified brown residue", "bagasse", ""]) {
    assert.equal(lookupMaterialReference(label), null);
  }
  assert.equal(lookupMaterialReference("Gabah (Paddy Rice)", "unknown"), null);
  assert.equal(lookupMaterialReference("Gabah (Paddy Rice)", "rice-husk"), null);
  assert.equal(lookupMaterialReference("Corn cob", "corn-cob"), null);
  assert.match(REFERENCE_UNAVAILABLE, /being expanded/);
});

test("reference values are not written into measured quality, offers or emissions", () => {
  const reference = lookupMaterialReference(scan.wasteType);
  assert.ok(reference);
  const quality = emptyQuality();
  assert.equal(quality.moisture.value, null);
  assert.equal(quality.calorific.value, null);
  assert.equal(quality.ash.value, null);
  assert.match(qualityLines(quality).join("\n"), /Quality not yet tested/);
  assert.equal(qualityStatus(quality), "Quality not yet tested");
  const draft = testResultsDraft(quality);
  assert.deepEqual(draft.values, { moisture: "", calorific: "", ash: "" });
  assert.equal(validateTestResults({ ...draft, confirmed: true, source: "lab report", date: "2026-03-01" }, now).ok, false);

  const offer = prepareConnectedOffer(scan, {
    quantityTonnes: "10", askingPricePerTonneIdr: "0", province: "West Java", city: "Bandung",
    logistics: "to-be-agreed", notes: "",
  }, now);
  assert.ok(offer.ok);
  assert.equal(offer.value.supply.moisturePercent, null);
  assert.equal(offer.value.supply.quality, "unknown");
  assert.equal(scan.limitationNote.includes("photo cannot confirm"), true);
  assert.doesNotMatch(offer.value.supply.qualityNotes, /14–15%|3100|3,100|18%/);

  const emissions = estimateEmissions(emptyEmissions(), { received: 1, reused: 1, massBasis: "dry" }, "Biomass fuel");
  assert.equal(emissions.status, "Not calculated");
  assert.equal(emissions.netKg, null);
  assert.ok(!Object.values(emissions.inputs).some(value => value === 14 || value === 18 || value === 3100));
});
