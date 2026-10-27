import assert from "node:assert/strict";
import { test } from "node:test";
import { NO_OBVIOUS_CONTAMINATION, normalizeWasteAnalysis } from "../src/lib/waste-analysis.ts";

test("known canonical materials keep their id and name", () => {
  const result = normalizeWasteAnalysis({
    wasteType: "Rice husk",
    materialId: "rice-husk",
    materialName: "Rice husk",
    materialCategory: "rice residues",
    confidence: "high",
    visibleClues: ["Small golden husks"],
    visibleQualityIndicators: ["Appears dry"],
    possibleContamination: ["Possible plastic fragments"],
    possibleUses: ["Biochar after testing"],
    needsUserConfirmation: false,
    limitationNote: "ignored",
  });
  assert.equal(result.materialId, "rice-husk");
  assert.equal(result.materialName, "Rice husk");
  assert.equal(result.needsUserConfirmation, false);
  assert.deepEqual(result.possibleContamination, ["Possible plastic fragments"]);
});

test("unmatched agricultural names stay open and require confirmation", () => {
  const result = normalizeWasteAnalysis({
    wasteType: "Durian husk",
    materialId: "durian-husk",
    materialName: "Durian husk",
    materialCategory: "fruit processing residues",
    confidence: "medium",
    visibleClues: ["Spiky rind fragments"],
    possibleUses: ["Compost after testing"],
    limitationNote: "ignored",
  });
  assert.equal(result.materialId, "other-agricultural-residue");
  assert.equal(result.materialName, "Durian husk");
  assert.equal(result.needsUserConfirmation, true);
});

test("empty contamination observations use the inspection disclaimer", () => {
  const result = normalizeWasteAnalysis({
    wasteType: "Sawdust",
    materialId: "sawdust",
    materialName: "Sawdust",
    materialCategory: "wood and forestry residues",
    confidence: "high",
    visibleClues: ["Fine pale particles"],
    possibleContamination: [],
    possibleUses: ["Boiler fuel after testing"],
    limitationNote: "ignored",
  });
  assert.deepEqual(result.possibleContamination, [NO_OBVIOUS_CONTAMINATION]);
  assert.match(NO_OBVIOUS_CONTAMINATION, /Physical inspection may still be needed/);
});

test("numeric quality claims are stripped from photo observations", () => {
  const result = normalizeWasteAnalysis({
    wasteType: "Rice straw 14% moisture",
    materialId: "rice-straw",
    materialName: "Rice straw 14% moisture",
    confidence: "medium",
    visibleClues: ["Moisture about 12%", "Fibrous stalks"],
    visibleQualityIndicators: ["Calorific value: 4,000 kcal/kg", "Appears dry"],
    possibleContamination: ["Ash content 18%"],
    possibleUses: ["Certified premium fuel"],
    limitationNote: "ignored",
  });
  assert.equal(result.wasteType, "Agricultural residue (visual estimate)");
  assert.deepEqual(result.visibleClues, ["Fibrous stalks"]);
  assert.deepEqual(result.visibleQualityIndicators, ["Appears dry"]);
  assert.deepEqual(result.possibleContamination, [NO_OBVIOUS_CONTAMINATION]);
  assert.equal(result.possibleUses.length, 0);
  assert.equal(result.needsUserConfirmation, true);
  assert.equal(result.originalIdentification?.materialId, "rice-straw");
});

test("Gabah (Paddy Rice) does not map to rice-husk even when Gemini supplies that id", () => {
  const result = normalizeWasteAnalysis({
    wasteType: "Gabah (Paddy Rice)",
    materialId: "rice-husk",
    materialName: "Gabah (Paddy Rice)",
    materialCategory: "rice residues",
    confidence: "high",
    visibleClues: ["Oval grains on a paved surface"],
    possibleUses: ["Milling"],
    needsUserConfirmation: false,
    limitationNote: "ignored",
  });
  assert.equal(result.materialId, "unknown");
  assert.equal(result.isAgriculturalResidue, "false");
  assert.equal(result.needsUserConfirmation, true);
  assert.equal(result.originalIdentification?.materialName, "Gabah (Paddy Rice)");
  assert.equal(result.originalIdentification?.materialId, "rice-husk");
  assert.equal(result.originalIdentification?.confidence, "high");
});

test("Paddy Rice with Gemini materialId rice-husk is rejected", () => {
  const result = normalizeWasteAnalysis({
    wasteType: "Paddy Rice",
    materialId: "rice-husk",
    materialName: "Paddy Rice",
    confidence: "high",
    visibleClues: ["Whole grains"],
    possibleUses: [],
    limitationNote: "ignored",
  });
  assert.equal(result.materialId, "unknown");
  assert.equal(result.needsUserConfirmation, true);
});

test("rice husk and sekam padi keep rice-husk", () => {
  for (const name of ["Rice husk", "Sekam padi"]) {
    const result = normalizeWasteAnalysis({
      wasteType: name,
      materialId: "rice-husk",
      materialName: name,
      confidence: "high",
      visibleClues: ["Small golden husks"],
      possibleUses: ["Biochar after testing"],
      limitationNote: "ignored",
    });
    assert.equal(result.materialId, "rice-husk");
    assert.equal(result.isAgriculturalResidue, "true");
    assert.equal(result.needsUserConfirmation, false);
  }
});

test("rice straw and jerami padi map to rice-straw", () => {
  for (const name of ["Rice straw", "jerami padi"]) {
    const result = normalizeWasteAnalysis({
      wasteType: name,
      materialId: "rice-straw",
      materialName: name,
      confidence: "high",
      visibleClues: ["Fibrous stalks"],
      possibleUses: ["Mulch after testing"],
      limitationNote: "ignored",
    });
    assert.equal(result.materialId, "rice-straw");
    assert.equal(result.materialName, name === "jerami padi" ? "jerami padi" : "Rice straw");
  }
});

test("generic rice does not map automatically to rice-husk", () => {
  const result = normalizeWasteAnalysis({
    wasteType: "rice",
    materialId: "rice-husk",
    materialName: "rice",
    confidence: "high",
    visibleClues: ["Grain-like particles"],
    possibleUses: [],
    limitationNote: "ignored",
  });
  assert.notEqual(result.materialId, "rice-husk");
  assert.equal(result.materialId, "unknown");
  assert.equal(result.needsUserConfirmation, true);
});

test("a conflicting name and materialId requires confirmation and keeps the original id", () => {
  const result = normalizeWasteAnalysis({
    wasteType: "Durian husk",
    materialId: "rice-husk",
    materialName: "Durian husk",
    confidence: "high",
    visibleClues: ["Spiky rind"],
    possibleUses: ["Compost after testing"],
    limitationNote: "ignored",
  });
  assert.equal(result.materialId, "unknown");
  assert.equal(result.needsUserConfirmation, true);
  assert.equal(result.originalIdentification?.materialId, "rice-husk");
  assert.equal(result.originalIdentification?.materialName, "Durian husk");
});

test("id-style Gemini names are displayed as catalog labels without changing the id", () => {
  const result = normalizeWasteAnalysis({
    wasteType: "rice-straw",
    materialId: "rice-straw",
    materialName: "rice-straw",
    confidence: "high",
    visibleClues: ["Fibrous stalks"],
    possibleUses: ["Biochar after testing"],
    limitationNote: "ignored",
  });
  assert.equal(result.materialId, "rice-straw");
  assert.equal(result.materialName, "Rice straw");
  assert.equal(result.originalIdentification?.materialName, "rice-straw");
});
