import {
  PREFERRED_MATERIAL_IDS,
  canonicalMaterialId,
  coerceResidueFlag,
  humanizeMaterialName,
  inferCatalogId,
  isNonResidueName,
  nameMatchesMaterial,
  type ResidueAssessment,
} from "./material-matching";
import { photoObservation } from "./photo-observations";

export { PREFERRED_MATERIAL_IDS } from "./material-matching";

export const LIMITATION_NOTE =
  "A photo cannot confirm moisture, quality, or energy value. Lab testing may still be needed before choosing a reuse method.";

export const NO_OBVIOUS_CONTAMINATION =
  "No obvious contamination is visible in this photo. Physical inspection may still be needed.";

export const MATERIAL_CATEGORIES = [
  "rice residues",
  "corn residues",
  "sugarcane residues",
  "palm oil residues",
  "coconut residues",
  "coffee residues",
  "cocoa residues",
  "banana residues",
  "cassava residues",
  "peanut and legume residues",
  "fruit processing residues",
  "wood and forestry residues",
  "other agricultural residue",
  "unknown or unsupported material",
];

export type VisualAnalysis = {
  wasteType: string;
  materialId?: string;
  materialName?: string;
  materialCategory?: string;
  confidence: "low" | "medium" | "high";
  visibleClues: string[];
  visibleQualityIndicators?: string[];
  possibleContamination?: string[];
  possibleUses: string[];
  needsUserConfirmation?: boolean;
  isAgriculturalResidue?: ResidueAssessment;
  originalIdentification?: {
    wasteType: string;
    materialId?: string;
    materialName?: string;
    confidence: "low" | "medium" | "high";
  };
  limitationNote: string;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

function rawString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanLine(value: unknown): string | undefined {
  return typeof value === "string" ? photoObservation(value) ?? undefined : undefined;
}

function cleanList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap(item => {
    const line = cleanLine(item);
    return line ? [line] : [];
  });
}

function confidenceOf(value: unknown): "low" | "medium" | "high" {
  return value === "low" || value === "medium" || value === "high" ? value : "low";
}

export function normalizeWasteAnalysis(rawInput: unknown): VisualAnalysis {
  const raw = asRecord(rawInput);
  const originalName = rawString(raw.materialName);
  const originalType = rawString(raw.wasteType);
  const originalId = rawString(raw.materialId);
  const confidence = confidenceOf(raw.confidence);
  const cleanedName = cleanLine(originalName) ?? cleanLine(originalType);
  const proposedName = cleanedName ?? "Agricultural residue (visual estimate)";
  const suppliedId = canonicalMaterialId(originalId);
  const nameMatchesSupplied = Boolean(suppliedId && nameMatchesMaterial(proposedName, suppliedId));
  const nonResidue = isNonResidueName(proposedName) || isNonResidueName(originalName) || isNonResidueName(originalType);
  const inferred = inferCatalogId(proposedName);
  const geminiResidue = coerceResidueFlag(raw.isAgriculturalResidue);

  let isAgriculturalResidue: ResidueAssessment = geminiResidue ?? "unknown";
  let materialId: string;
  if (nonResidue) {
    materialId = "unknown";
    isAgriculturalResidue = "false";
  } else if (suppliedId && nameMatchesSupplied) {
    materialId = suppliedId;
    isAgriculturalResidue = geminiResidue === "false" ? "false" : "true";
  } else if (suppliedId && !nameMatchesSupplied) {
    materialId = "unknown";
    isAgriculturalResidue = geminiResidue ?? "unknown";
  } else if (inferred && inferred !== "unknown") {
    materialId = inferred;
    isAgriculturalResidue = geminiResidue === "false" ? "false" : "true";
  } else if (geminiResidue === "false") {
    materialId = "unknown";
    isAgriculturalResidue = "false";
  } else if (cleanedName || originalName) {
    materialId = "other-agricultural-residue";
    isAgriculturalResidue = geminiResidue ?? "true";
  } else {
    materialId = "unknown";
    isAgriculturalResidue = geminiResidue ?? "unknown";
  }

  if (isAgriculturalResidue === "false") materialId = "unknown";

  const unmatched = materialId === "other-agricultural-residue" || materialId === "unknown";
  const needsUserConfirmation = Boolean(raw.needsUserConfirmation)
    || confidence !== "high"
    || unmatched
    || isAgriculturalResidue !== "true"
    || Boolean(suppliedId && !nameMatchesSupplied);

  const possibleContamination = cleanList(raw.possibleContamination);
  const materialName = humanizeMaterialName(proposedName, materialId);
  const materialCategory = cleanLine(raw.materialCategory)
    ?? (isAgriculturalResidue === "false"
      ? "unknown or unsupported material"
      : unmatched ? "other agricultural residue" : undefined);

  return {
    wasteType: materialName,
    materialName,
    materialId,
    materialCategory,
    confidence,
    visibleClues: cleanList(raw.visibleClues),
    visibleQualityIndicators: cleanList(raw.visibleQualityIndicators),
    possibleContamination: possibleContamination.length ? possibleContamination : [NO_OBVIOUS_CONTAMINATION],
    possibleUses: cleanList(raw.possibleUses),
    needsUserConfirmation,
    isAgriculturalResidue,
    originalIdentification: {
      wasteType: originalType || originalName || proposedName,
      materialId: originalId || undefined,
      materialName: originalName || originalType || undefined,
      confidence,
    },
    limitationNote: LIMITATION_NOTE,
  };
}
