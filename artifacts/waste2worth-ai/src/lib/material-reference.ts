import { catalogEntry, equivalentMaterialIds, hasMaterialPhrase, inferCatalogId, isNonResidueName, type MaterialId } from "./material-catalog";

export const MJ_TO_KCAL = 238.8459;

export type ReferenceBasis = "wet" | "dry" | "as received";

export interface MaterialReference {
  id: MaterialId;
  material: string;
  aliases: string[];
  moisture?: { range: string; basis: ReferenceBasis; context?: string };
  calorificMj?: { min: number; max: number; basis: ReferenceBasis; type?: string };
  ash?: { range: string; basis: ReferenceBasis };
  bulkDensity?: { value: string; basis?: string; context?: string };
  possibleUses?: string[];
  processing?: string[];
  combustionRisks?: string[];
  source: {
    name: string;
    label: string;
    urls: string[];
    year?: string;
  };
}

export const REFERENCE_HEADLINE = "Typical reference values — not measured for this batch.";
export const REFERENCE_GUIDANCE =
  "Reference values are general guidance. Use a COA or lab test to confirm the actual values for this batch.";
export const REFERENCE_UNAVAILABLE =
  "Reference data for this material is being expanded. Upload a COA or enter test results after creating an offer.";

export const RICE_HUSK_REFERENCE: MaterialReference = {
  id: "rice-husk",
  material: "Rice husk",
  aliases: ["rice husk", "rice husks", "rice hull", "rice hulls", "sekam padi", "paddy husk"],
  moisture: {
    range: "14–15%",
    basis: "as received",
    context: "rice husk collected after rice milling",
  },
  calorificMj: { min: 13, max: 16, basis: "as received", type: "heating value as published" },
  ash: { range: "approximately 18%", basis: "dry" },
  bulkDensity: { value: "approximately 100 kg/m³" },
  possibleUses: ["Energy in compatible biomass systems after testing", "Biochar feedstock after testing"],
  processing: ["Handle silica-rich ash and abrasive particles according to equipment design"],
  source: {
    name: "International Rice Research Institute, Rice Knowledge Bank",
    label: "IRRI Rice Knowledge Bank",
    urls: [
      "https://knowledgebank.irri.org/step-by-step-production/postharvest/rice-by-products/rice-husk",
      "https://knowledgebank.irri.org/step-by-step-production/postharvest/rice-by-products/rice-husk/using-rice-husk-for-energy-production",
    ],
    year: "n.d.",
  },
};

export const RICE_STRAW_REFERENCE: MaterialReference = {
  id: "rice-straw",
  material: "Rice straw",
  aliases: ["rice straw", "jerami padi", "paddy straw"],
  moisture: {
    range: "12–17%",
    basis: "wet",
    context: "recommended moisture for compression",
  },
  calorificMj: { min: 14.08, max: 15.09, basis: "dry", type: "higher heating value" },
  ash: { range: "18.67–29.1%", basis: "dry" },
  bulkDensity: {
    value: "70–80 kg/m³ uncompressed",
    context: "reported at about 15–18% moisture",
  },
  possibleUses: ["Energy after drying and testing", "Compost or mulch after agronomic checks"],
  processing: ["Compression is typically discussed at 12–17% moisture, wet basis"],
  combustionRisks: [
    "Ash, alkali, silica, slagging and fouling risks are commonly reported for rice straw combustion; test ash behaviour before firing.",
  ],
  source: {
    name: "International Rice Research Institute, Rice Knowledge Bank — rice straw",
    label: "IRRI Rice Knowledge Bank",
    urls: [
      "http://www.knowledgebank.irri.org/step-by-step-production/postharvest/rice-by-products/rice-straw",
      "http://www.knowledgebank.irri.org/step-by-step-production/postharvest/rice-by-products/rice-straw/rice-straw-off-field-value-chain",
    ],
    year: "2014",
  },
};

const REFERENCES: MaterialReference[] = [RICE_HUSK_REFERENCE, RICE_STRAW_REFERENCE];

export function mjToApproxKcal(mj: number): number {
  return Math.round((mj * MJ_TO_KCAL) / 10) * 10;
}

export function hasVerifiedNumericReference(reference: MaterialReference): boolean {
  return Boolean(reference.moisture || reference.calorificMj || reference.ash || reference.bulkDensity);
}

export function lookupMaterialReference(wasteType: string, materialId?: string): MaterialReference | null {
  if (isNonResidueName(wasteType) || materialId === "unknown") return null;
  if (materialId && materialId !== "other-agricultural-residue" && materialId !== "other") {
    const ids = equivalentMaterialIds(materialId);
    return REFERENCES.find(entry => ids.includes(entry.id)) ?? null;
  }
  const inferred = inferCatalogId(wasteType);
  if (inferred && inferred !== "unknown" && inferred !== "other-agricultural-residue") {
    const byInferred = REFERENCES.find(entry => equivalentMaterialIds(inferred).includes(entry.id));
    if (byInferred) return byInferred;
  }
  if (!wasteType.trim()) return null;
  const aliases = REFERENCES.flatMap(entry =>
    entry.aliases.map(alias => ({ alias, entry })),
  ).sort((a, b) => b.alias.length - a.alias.length);
  return aliases.find(({ alias }) => hasMaterialPhrase(wasteType, alias))?.entry ?? null;
}

export function calorificDisplay(reference: MaterialReference): string {
  if (!reference.calorificMj) return "";
  const { min, max, basis, type } = reference.calorificMj;
  const kind = type ? `${type}, ` : "";
  return `${min}–${max} MJ/kg (${kind}${basis} basis)`;
}

export function calorificKcalDisplay(reference: MaterialReference): string {
  if (!reference.calorificMj) return "";
  const { min, max } = reference.calorificMj;
  return `approximately ${mjToApproxKcal(min).toLocaleString("en-US")}–${mjToApproxKcal(max).toLocaleString("en-US")} kcal/kg`;
}

export function referenceItems(reference: MaterialReference): Array<{ label: string; value: string; detail?: string }> {
  const items: Array<{ label: string; value: string; detail?: string }> = [];
  if (reference.moisture) {
    items.push({
      label: "Moisture",
      value: reference.moisture.range,
      detail: [reference.moisture.context, `${reference.moisture.basis} basis`].filter(Boolean).join(" · "),
    });
  }
  if (reference.calorificMj) {
    items.push({
      label: "Calorific value",
      value: calorificDisplay(reference),
      detail: calorificKcalDisplay(reference),
    });
  }
  if (reference.ash) {
    items.push({ label: "Ash", value: `${reference.ash.range} (${reference.ash.basis} basis)` });
  }
  if (reference.bulkDensity) {
    items.push({
      label: "Loose bulk density",
      value: reference.bulkDensity.value,
      detail: reference.bulkDensity.context,
    });
  }
  return items;
}

export function referenceMaterialLabel(id: string): string {
  return catalogEntry(id)?.label ?? id;
}
