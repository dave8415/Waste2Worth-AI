import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MATERIAL_CATEGORIES,
  humanizeMaterialName,
  inferCatalogId,
  needsMaterialConfirmation,
  resolveMaterialId,
} from "../src/lib/material-catalog";
import { applyMaterialConfirmation, assessmentSchema, prepareConnectedOffer, scanCanBeOffered, scanDisplayName, scanMaterialId, scanNeedsConfirmation } from "../src/lib/journey";
import { emptyQuality, qualityLines } from "../src/lib/material-quality";
import { lookupMaterialReference } from "../src/lib/material-reference";
import { emptyEmissions, estimateEmissions } from "../src/lib/emissions";

const now = "2026-10-26T04:00:00.000Z";
const draft = {
  quantityTonnes: "4", askingPricePerTonneIdr: "0", province: "West Java", city: "Bandung",
  logistics: "to-be-agreed" as const, notes: "",
};

test("canonical materials and Indonesian aliases resolve to catalog ids", () => {
  assert.equal(inferCatalogId("rice-husk"), "rice-husk");
  assert.equal(inferCatalogId("Rice husk"), "rice-husk");
  assert.equal(inferCatalogId("sekam padi"), "rice-husk");
  assert.equal(inferCatalogId("Rice straw"), "rice-straw");
  assert.equal(inferCatalogId("jerami padi"), "rice-straw");
  assert.equal(inferCatalogId("tongkol jagung"), "corn-cob");
  assert.equal(inferCatalogId("klobot jagung"), "corn-husk");
  assert.equal(inferCatalogId("ampas tebu"), "sugarcane-bagasse");
  assert.equal(inferCatalogId("tandan kosong sawit"), "oil-palm-empty-fruit-bunch");
  assert.equal(inferCatalogId("tangkos"), "oil-palm-empty-fruit-bunch");
  assert.equal(inferCatalogId("cangkang sawit"), "palm-kernel-shell");
  assert.equal(inferCatalogId("PKS"), "palm-kernel-shell");
  assert.equal(inferCatalogId("serat sawit"), "palm-mesocarp-fiber");
  assert.equal(inferCatalogId("pelepah sawit"), "oil-palm-frond");
  assert.equal(inferCatalogId("tempurung kelapa"), "coconut-shell");
  assert.equal(inferCatalogId("sabut kelapa"), "coconut-husk");
  assert.equal(inferCatalogId("kulit kopi"), "coffee-husk");
  assert.equal(inferCatalogId("kulit kakao"), "cocoa-pod-husk");
  assert.equal(inferCatalogId("serbuk gergaji"), "sawdust");
  assert.equal(inferCatalogId("potongan kayu"), "wood-offcut");
  assert.ok(MATERIAL_CATEGORIES.includes("fruit processing residues"));
  assert.equal(inferCatalogId("Gabah (Paddy Rice)"), "");
  assert.equal(inferCatalogId("paddy rice"), "");
  assert.equal(inferCatalogId("rice"), "");
  assert.equal(inferCatalogId("beras"), "");
  assert.equal(humanizeMaterialName("rice-straw", "rice-straw"), "Rice straw");
  assert.equal(scanDisplayName(assessmentSchema.parse({
    wasteType: "rice-straw",
    materialId: "rice-straw",
    materialName: "rice-straw",
    confidence: "high",
    visibleClues: [],
    possibleUses: [],
    limitationNote: "A photo cannot confirm moisture, quality or energy value; lab testing may be needed.",
  })), "Rice straw");
});

test("non-residue assessments cannot be offered until corrected", () => {
  const scan = assessmentSchema.parse({
    wasteType: "Gabah (Paddy Rice)",
    materialId: "unknown",
    materialName: "Gabah (Paddy Rice)",
    confidence: "high",
    visibleClues: ["Oval grains"],
    possibleUses: [],
    limitationNote: "A photo cannot confirm moisture, quality or energy value; lab testing may be needed.",
    needsUserConfirmation: true,
    isAgriculturalResidue: "false",
    originalIdentification: {
      wasteType: "Gabah (Paddy Rice)",
      materialId: "rice-husk",
      materialName: "Gabah (Paddy Rice)",
      confidence: "high",
    },
  });
  assert.equal(scanNeedsConfirmation(scan), true);
  assert.equal(scanCanBeOffered(scan), false);
  assert.equal(lookupMaterialReference(scan.wasteType, scan.materialId), null);
  const confirmed = applyMaterialConfirmation(scan, { materialId: "corn-cob", materialName: "Corn cob" }, now);
  assert.equal(scanCanBeOffered(confirmed), true);
  assert.equal(confirmed.originalIdentification?.materialId, "rice-husk");
  assert.equal(confirmed.confirmedIdentification?.materialId, "corn-cob");
  assert.equal(lookupMaterialReference(confirmed.wasteType, confirmed.materialId), null);
});

test("unknown agricultural residue keeps an open name and still prepares an offer", () => {
  const scan = assessmentSchema.parse({
    wasteType: "Mango peel residue",
    materialId: "other-agricultural-residue",
    materialName: "Mango peel residue",
    materialCategory: "fruit processing residues",
    confidence: "medium",
    visibleClues: ["Orange fibrous peels"],
    possibleUses: ["Compost after testing"],
    limitationNote: "A photo cannot confirm moisture, quality or energy value; lab testing may be needed.",
    needsUserConfirmation: true,
  });
  assert.equal(scanMaterialId(scan), "other-agricultural-residue");
  assert.equal(scanNeedsConfirmation(scan), true);
  assert.equal(lookupMaterialReference(scan.wasteType, scan.materialId), null);
  const offer = prepareConnectedOffer(scan, draft, now);
  assert.equal(offer.ok, true);
  if (!offer.ok) return;
  assert.equal(offer.value.supply.material, "other-agricultural-residue");
  assert.equal(offer.value.supply.moisturePercent, null);
});

test("low-confidence confirmation stores original AI and user-confirmed identification", () => {
  const scan = assessmentSchema.parse({
    wasteType: "Likely rice husks",
    materialId: "rice-husk",
    materialName: "Likely rice husks",
    confidence: "low",
    visibleClues: ["Small golden husks"],
    possibleUses: ["Biochar after testing"],
    limitationNote: "A photo cannot confirm moisture, quality or energy value; lab testing may be needed.",
    needsUserConfirmation: true,
  });
  assert.equal(needsMaterialConfirmation({ confidence: "low", materialId: "rice-husk" }), true);
  const confirmed = applyMaterialConfirmation(scan, { materialId: "rice-straw", materialName: "Rice straw" }, now);
  assert.equal(confirmed.originalIdentification?.wasteType, "Likely rice husks");
  assert.equal(confirmed.originalIdentification?.materialId, "rice-husk");
  assert.equal(confirmed.confirmedIdentification?.materialId, "rice-straw");
  assert.equal(confirmed.confirmedIdentification?.materialName, "Rice straw");
  assert.equal(confirmed.wasteType, "Rice straw");
  assert.equal(scanNeedsConfirmation(confirmed), false);
});

test("manual correction of an unmatched name is retained for the offer", () => {
  const scan = assessmentSchema.parse({
    wasteType: "Brown fibrous residue",
    materialId: "other-agricultural-residue",
    materialName: "Brown fibrous residue",
    confidence: "medium",
    visibleClues: ["Fibrous strands"],
    possibleUses: [],
    limitationNote: "A photo cannot confirm moisture, quality or energy value; lab testing may be needed.",
  });
  const confirmed = applyMaterialConfirmation(scan, {
    materialId: "other-agricultural-residue",
    materialName: "Pineapple leaf fibre",
  }, now);
  const offer = prepareConnectedOffer(confirmed, draft, now);
  assert.equal(offer.ok, true);
  if (!offer.ok) return;
  assert.equal(offer.value.supply.material, "other-agricultural-residue");
  assert.match(offer.value.supply.qualityNotes, /Pineapple leaf fibre/);
  assert.match(offer.value.supply.qualityNotes, /Original AI identification: Brown fibrous residue/);
});

test("older saved scans without materialId still load and can be offered", () => {
  const parsed = assessmentSchema.parse({
    wasteType: "Likely rice husks",
    confidence: "medium",
    visibleClues: ["Small golden husks"],
    possibleUses: ["Biochar after testing"],
    limitationNote: "A photo cannot confirm moisture, quality or energy value; lab testing may be needed.",
  });
  assert.equal(parsed.materialId, undefined);
  assert.equal(parsed.confirmedIdentification, undefined);
  assert.equal(resolveMaterialId(parsed.materialId, parsed.wasteType), "rice-husk");
  const offer = prepareConnectedOffer(parsed, draft, now);
  assert.equal(offer.ok, true);
  if (!offer.ok) return;
  assert.equal(offer.value.supply.material, "rice-husk");
  assert.equal(offer.value.supply.quality, "unknown");
});

test("reference values never become measured quality or emissions inputs", () => {
  const quality = emptyQuality();
  assert.equal(quality.moisture.value, null);
  assert.match(qualityLines(quality).join("\n"), /Quality not yet tested/);
  const emissions = estimateEmissions(emptyEmissions(), { received: 1, reused: 1, massBasis: "dry" }, "Biomass fuel");
  assert.equal(emissions.netKg, null);
  assert.ok(!Object.values(emissions.inputs).some(value => value === 14.08 || value === 15.09 || value === 3360));
});
