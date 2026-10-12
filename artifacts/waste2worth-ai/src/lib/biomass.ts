import { PROVINCES, isDate, isValidLocation } from "./locations";

export const MATERIALS = [
  { id: "rice-husk", label: "Rice husks", aliases: ["rice husk", "rice hull", "paddy husk"] },
  { id: "palm-kernel-shell", label: "Palm kernel shells", aliases: ["palm kernel shell", "palm shell"] },
  { id: "empty-fruit-bunch", label: "Empty palm fruit bunches", aliases: ["empty fruit bunch", "palm fruit bunch"] },
  { id: "coconut-shell", label: "Coconut shells", aliases: ["coconut shell"] },
  { id: "bagasse", label: "Sugarcane bagasse", aliases: ["bagasse", "sugarcane"] },
  { id: "corn-cob", label: "Corn cobs", aliases: ["corn cob", "maize cob"] },
  { id: "other", label: "Other / uncertain material", aliases: [] },
] as const;
export type MaterialId = typeof MATERIALS[number]["id"];
export const REGIONS = PROVINCES;
export const USES = ["Biomass fuel", "Biochar", "Compost / mulch", "Other use"] as const;
export type IntendedUse = typeof USES[number];
export type Quality = "unknown" | "clean" | "mixed" | "contaminated";
export type MassBasis = "unknown" | "as-received" | "dry";
export interface SupplyDraft {
  material: MaterialId | "";
  quantityTonnes: string;
  location: string;
  region: string;
  moisturePercent: string;
  quality: Quality;
  qualityNotes: string;
}
export interface Supply {
  material: MaterialId;
  quantityTonnes: number;
  location: string;
  region: string;
  moisturePercent: number | null;
  quality: Quality;
  qualityNotes: string;
}
export interface ImpactDraft {
  collectedTonnes: string;
  reusedTonnes: string;
  intendedUse: IntendedUse;
  massBasis: MassBasis;
  reportDate?: string;
  transactionId?: string;
}
export interface DemoBuyer {
  id: string;
  name: string;
  industry: string;
  materials: MaterialId[];
  regions: string[];
  minimumTonnes: number;
  demandTonnes: number;
  intendedUse: IntendedUse;
  requirements: string;
}
type Validation<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };
export const emptySupply: SupplyDraft = { material: "", quantityTonnes: "", location: "", region: "", moisturePercent: "", quality: "unknown", qualityNotes: "" };
export const emptyImpact: ImpactDraft = { collectedTonnes: "", reusedTonnes: "", intendedUse: "Biomass fuel", massBasis: "unknown", reportDate: "", transactionId: "" };
export function materialLabel(id: MaterialId | "") {
  return MATERIALS.find(material => material.id === id)?.label ?? "Not selected";
}
export function inferMaterial(text: string): MaterialId | "" {
  const lower = text.toLowerCase();
  return MATERIALS.find(material => material.aliases.some(alias => lower.includes(alias)))?.id ?? "";
}
function readNumber(value: string): number | null {
  if (!value.trim()) return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}
export function parseSupply(draft: SupplyDraft): Validation<Supply> {
  const errors: Record<string, string> = {};
  const quantity = readNumber(draft.quantityTonnes);
  const moisture = readNumber(draft.moisturePercent);
  if (!MATERIALS.some(material => material.id === draft.material)) errors.material = "Choose the material, or select other / uncertain.";
  if (quantity === null || quantity <= 0 || quantity > 1_000_000) errors.quantityTonnes = "Enter an available quantity above 0 and at most 1,000,000 tonnes.";
  if (!(REGIONS as readonly string[]).includes(draft.region)) errors.region = "Choose a supported province.";
  if (!isValidLocation(draft.region, draft.location)) errors.location = "Choose a city/regency belonging to the selected province. Demo coverage is limited to the listed areas.";
  if (draft.moisturePercent.trim() && (moisture === null || moisture < 0 || moisture > 100)) errors.moisturePercent = "Moisture must be between 0 and 100%, or left blank.";
  if (draft.qualityNotes.length > 1000) errors.qualityNotes = "Keep quality notes under 1,000 characters.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { ...draft, material: draft.material as MaterialId, quantityTonnes: quantity!, moisturePercent: moisture, location: draft.location.trim(), qualityNotes: draft.qualityNotes.trim() } };
}
export interface BuyerMatch {
  buyer: DemoBuyer;
  regionFits: boolean;
  quantityFits: boolean;
  potentialTonnes: number;
  score: number;
  reasons: string[];
}
export function findMatches(supply: Supply, buyers: DemoBuyer[] = []): BuyerMatch[] {
  return buyers.filter(buyer => buyer.materials.includes(supply.material)).map(buyer => {
    const regionFits = buyer.regions.includes(supply.region);
    const quantityFits = supply.quantityTonnes >= buyer.minimumTonnes;
    return {
      buyer, regionFits, quantityFits,
      potentialTonnes: Math.min(supply.quantityTonnes, buyer.demandTonnes),
      score: Number(regionFits) + Number(quantityFits),
      reasons: [
        "Material appears in this demo listing.",
        regionFits ? "Your selected region is in the demo service area." : "Outside the demo service area: transport and buyer acceptance need discussion.",
        quantityFits ? "Available quantity meets the demo minimum lot." : `Below the demo minimum lot of ${buyer.minimumTonnes} tonnes: aggregation may be needed.`,
        ...(supply.quantityTonnes > buyer.demandTonnes ? ["Only part of the available quantity fits the listed demo demand."] : []),
      ],
    };
  }).sort((a, b) => b.score - a.score || a.buyer.name.localeCompare(b.buyer.name));
}
export interface UseRoute {
  use: IntendedUse;
  outlook: string;
  explanation: string;
  checks: string[];
}
const materialGuidance: Record<MaterialId, [string, string, string]> = {
  "rice-husk": ["Rice husks may be usable in a biomass system designed for their high silica and ash content.", "Rice husks may be a biochar feedstock, but ash-rich char needs testing for its intended application.", "Rice husks may be a compost bulking material; slow decomposition and crop suitability need assessment."],
  "palm-kernel-shell": ["Palm kernel shells may suit compatible biomass boilers after testing.", "Clean palm kernel shells may be feedstock for controlled carbonization or biochar production.", "Shells break down slowly; composting may require crushing and blending, and may not be the best route."],
  "empty-fruit-bunch": ["Fibrous empty fruit bunches may need shredding and significant drying before compatible biomass use.", "Empty fruit bunches may suit biochar processing after drying and feedstock preparation.", "Shredded empty fruit bunches may suit compost or mulch after contamination and agronomic checks."],
  "coconut-shell": ["Coconut shells may suit compatible biomass systems after sizing and testing.", "Clean coconut shells may suit biochar or charcoal production. Activated carbon requires further processing and validation.", "Hard coconut shells degrade slowly; crushing and long decomposition times may be required."],
  "bagasse": ["Bagasse may suit compatible biomass systems, but moisture and storage conditions are important.", "Bagasse may suit biochar processing with suitable drying and handling.", "Bagasse may be composted with appropriate blending, aeration, and contamination checks."],
  "corn-cob": ["Corn cobs may be biomass feedstock after drying and sizing for the equipment.", "Corn cobs may suit controlled biochar processing after feedstock testing.", "Corn cobs may be composted after shredding, with appropriate decomposition conditions."],
  "other": ["Identify the material and its composition before selecting biomass equipment.", "Unknown or mixed material should not be assumed suitable for biochar.", "Identify the material and contaminants before composting, mulch, or another reuse."],
};
export function exploreUses(supply: Supply): UseRoute[] {
  const descriptions = materialGuidance[supply.material];
  const qualityCheck = supply.quality === "contaminated"
    ? "Reported contamination: pause use until contaminants are identified and assessed by a qualified operator."
    : supply.quality === "mixed"
      ? "Mixed material: separate and identify components, including chemical or plastic contaminants."
      : "Check for chemical residues, plastics, soil, and other contaminants; reported cleanliness is not verified.";
  const moistureCheck = supply.moisturePercent === null
    ? "Moisture is not provided. Measure it; do not infer it from the photo."
    : `Reported moisture is ${supply.moisturePercent}% (unverified). ${supply.moisturePercent > 20 ? "Drying may be needed; this is an indicative screening note, not an acceptance limit." : "Confirm by measurement and compare with operator-specific requirements."}`;
  return (["Biomass fuel", "Biochar", "Compost / mulch"] as const).map((use, index) => ({
    use,
    outlook: supply.quality === "contaminated" ? "Pause for contamination checks" : supply.material === "other" ? "Identify material first" : "Potential route — checks required",
    explanation: descriptions[index],
    checks: [
      qualityCheck, moistureCheck,
      ...(use === "Biomass fuel"
        ? ["Lab-test calorific value, ash and relevant contaminants; check boiler compatibility, emissions controls, permits, and transport economics."]
        : use === "Biochar"
          ? ["Check controlled pyrolysis conditions, char contaminants and stability, and suitability for its final application. Do not assume a carbon-credit benefit."]
          : ["Check decomposition, nutrient balance, pathogens where relevant, and suitability for the intended soil or crop."]),
      ...(supply.qualityNotes ? ["User quality notes are context only, not laboratory or safety evidence."] : []),
    ],
  }));
}
export interface ImpactSummary {
  material: string;
  location: string;
  collectedTonnes: number;
  reusedTonnes: number;
  unallocatedTonnes: number;
  reusedSharePercent: number | null;
  intendedUse: IntendedUse;
  massBasis: MassBasis;
  assumptions: string[];
  missingEvidence: string[];
  disclaimer: string;
  reportDate: string | null;
}
export function buildImpactSummary(supply: Supply, draft: ImpactDraft): Validation<ImpactSummary> {
  const errors: Record<string, string> = {};
  if (draft.reportDate && !isDate(draft.reportDate)) errors.reportDate = "Enter a valid report date.";
  const collected = readNumber(draft.collectedTonnes);
  const reused = readNumber(draft.reusedTonnes);
  if (collected === null || collected < 0 || collected > 1_000_000) errors.collectedTonnes = "Enter collected tonnes from 0 to 1,000,000. Blank is not zero.";
  if (reused === null || reused < 0 || reused > 1_000_000) errors.reusedTonnes = "Enter reused tonnes from 0 to 1,000,000. Blank is not zero.";
  if (collected !== null && reused !== null && reused > collected) errors.reusedTonnes = "Reused quantity cannot exceed collected quantity for this summary.";
  if (!(USES as readonly string[]).includes(draft.intendedUse)) errors.intendedUse = "Choose an intended use.";
  if (!["unknown", "as-received", "dry"].includes(draft.massBasis)) errors.massBasis = "Choose a mass basis.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: {
    material: materialLabel(supply.material), location: `${supply.location}, ${supply.region}`, reportDate: draft.reportDate || null,
    collectedTonnes: collected!, reusedTonnes: reused!, unallocatedTonnes: collected! - reused!,
    reusedSharePercent: collected! > 0 ? reused! / collected! * 100 : null,
    intendedUse: draft.intendedUse, massBasis: draft.massBasis,
    assumptions: [
      "All quantities, location, material, quality, and intended use are user-reported and unverified.",
      "Collected and reused quantities describe the same material, reporting scope, and mass basis, with no double counting.",
      "Reuse share = reused tonnes ÷ collected tonnes × 100. It is a mass-flow indicator, not emissions savings.",
      "Unallocated mass = collected minus reused; its fate is unknown. No landfill-diversion claim is made.",
      "Available stock for matching is separate from quantities collected and reused; no sale or reuse is inferred from a demo interest message.",
      draft.massBasis === "unknown" ? "Wet/dry mass basis is unknown; no dry-mass conversion is performed." : "The selected mass basis is user-reported; no moisture correction or dry-mass conversion is performed.",
      "An intended use describes a plan; it does not prove that processing occurred or that the material is suitable.",
    ],
    missingEvidence: [
      ...(draft.reportDate ? [] : ["Reporting date is missing; no timing or reporting period is assumed."]),
      "Verified weighing records and evidence of actual reuse.",
      "Laboratory moisture, quality, contaminants, and energy-value measurements as relevant.",
      "Disposal or use baseline, transport distances and fuel, processing energy, and defensible emissions factors.",
      "For biochar: yield, carbon content, stability, lifecycle emissions, and a defined accounting method.",
      "Social outcomes such as income, jobs, and beneficiary counts are not measured.",
    ],
    disclaimer: "Unverified prototype ESG summary. Not certified, not a compliance report, and not proof of carbon credits. Emissions savings are not calculated because the required evidence is missing.",
  } };
}
