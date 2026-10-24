import { z } from "zod";
import { massBasisSchema } from "./material-quality";

export const EMISSIONS_LABEL = "Preliminary estimate — not verified carbon credits.";
export const emissionsInputsSchema = z.object({
  baselineActivity: z.string().max(1000), baselineSource: z.string().max(2000),
  baselineQuantity: z.number().finite().min(0).max(1e12).nullable(),
  baselineUnit: z.enum(["kg", "tonnes", "litres", "kWh", "MJ"]),
  baselineFactor: z.number().finite().min(0).max(1e12).nullable(),
  factorSource: z.string().max(2000),
  quantityBasis: massBasisSchema, factorBasis: massBasisSchema,
  transportKg: z.number().finite().min(0).max(1e12).nullable(), transportSource: z.string().max(2000),
  processingKg: z.number().finite().min(0).max(1e12).nullable(), processingSource: z.string().max(2000),
  otherKg: z.number().finite().min(0).max(1e12).nullable(), otherSource: z.string().max(2000),
  assumptions: z.string().max(4000),
});
export type EmissionsInputs = z.infer<typeof emissionsInputsSchema>;
export type EmissionsDraft = { [K in keyof EmissionsInputs]: EmissionsInputs[K] extends number | null ? string : EmissionsInputs[K] };
export const emptyEmissions = (): EmissionsInputs => ({
  baselineActivity: "", baselineSource: "", baselineQuantity: null, baselineUnit: "kg", baselineFactor: null,
  factorSource: "", quantityBasis: "unknown", factorBasis: "unknown",
  transportKg: null, transportSource: "", processingKg: null, processingSource: "", otherKg: null, otherSource: "", assumptions: "",
});
export function parseEmissionsDraft(draft: EmissionsDraft) {
  const value: Record<string, unknown> = { ...draft };
  for (const k of ["baselineQuantity", "baselineFactor", "transportKg", "processingKg", "otherKg"] as const) {
    value[k] = draft[k].trim() === "" ? null : Number(draft[k]);
  }
  return emissionsInputsSchema.safeParse(value);
}
export interface EmissionsResult {
  status: "Not calculated" | "Provisional net result";
  missing: string[];
  baselineKg: number | null; projectKg: number | null; netKg: number | null;
  inputs: EmissionsInputs;
}
export function estimateEmissions(
  inputs: EmissionsInputs | undefined,
  actual: { received: number | null; reused: number | null; massBasis?: string } | undefined,
  method: string,
): EmissionsResult {
  const i = { ...(inputs ?? emptyEmissions()) }, missing: string[] = [];
  if (method !== "Biomass fuel") missing.push("Only the biomass-fuel route is defined. Biochar and compost need separate methodologies.");
  if (actual?.received == null || actual.reused == null) missing.push("Record actual received and reused quantities first.");
  if (actual && ((actual.received !== null && !Number.isFinite(actual.received)) || (actual.reused !== null && !Number.isFinite(actual.reused)))) missing.push("Actual quantities must be finite measured or user-reported numbers.");
  if (actual?.received != null && actual.reused != null && (actual.reused > actual.received || actual.reused < 0 || actual.received < 0)) missing.push("Reused quantity must not exceed received quantity.");
  if (actual?.reused === 0) missing.push("No reuse has been recorded; no fuel displacement is attributed.");
  if (!actual?.massBasis || actual.massBasis === "unknown") missing.push("Declare the wet/dry mass basis of the actual quantities.");
  if (!i.baselineActivity.trim()) missing.push("Name the baseline fuel/activity being displaced.");
  if (!i.baselineSource.trim()) missing.push("Document the displaced quantity and baseline activity source.");
  if (i.baselineQuantity === null) missing.push("Enter the displaced quantity and unit.");
  if (i.baselineFactor === null || !i.factorSource.trim()) missing.push("Enter a documented emission factor in kg CO2e per selected unit and its source.");
  if (["kg", "tonnes"].includes(i.baselineUnit) && (i.quantityBasis === "unknown" || i.factorBasis === "unknown" || i.quantityBasis !== i.factorBasis)) missing.push("Baseline quantity and emission factor must declare the same wet/dry mass basis; no automatic conversion is performed.");
  for (const [key, source, label] of [
    ["transportKg", "transportSource", "Transport"], ["processingKg", "processingSource", "Processing"], ["otherKg", "otherSource", "Other project"],
  ] as const) {
    if (i[key] === null || !i[source].trim()) missing.push(`${label} emissions need a kg CO2e value and documented source. Enter zero explicitly with a rationale if not applicable.`);
  }
  if (!i.assumptions.trim()) missing.push("State the calculation boundary, displacement assumptions and exclusions.");
  if (!emissionsInputsSchema.safeParse(i).success) missing.push("Inputs must be finite non-negative values in the stated units.");
  if (missing.length) return { status: "Not calculated", missing, baselineKg: null, projectKg: null, netKg: null, inputs: i };
  const baselineKg = i.baselineQuantity! * i.baselineFactor!;
  const projectKg = i.transportKg! + i.processingKg! + i.otherKg!;
  return { status: "Provisional net result", missing: [], baselineKg, projectKg, netKg: baselineKg - projectKg, inputs: i };
}
export function emissionsLines(result: EmissionsResult): string[] {
  const i = result.inputs;
  const v = (n: number | null) => n === null ? "Missing" : String(n);
  return [
    EMISSIONS_LABEL, `Emissions estimation: ${result.status}`,
    `Baseline activity: ${i.baselineActivity || "Missing"}; displacement source: ${i.baselineSource || "Missing"}`,
    `Baseline quantity: ${v(i.baselineQuantity)} ${i.baselineUnit}; mass basis: ${i.quantityBasis}`,
    `Emission factor: ${v(i.baselineFactor)} kg CO2e/${i.baselineUnit}; basis: ${i.factorBasis}; source: ${i.factorSource || "Missing"}`,
    `Transport: ${v(i.transportKg)} kg CO2e; source: ${i.transportSource || "Missing"}`,
    `Processing: ${v(i.processingKg)} kg CO2e; source: ${i.processingSource || "Missing"}`,
    `Other project emissions: ${v(i.otherKg)} kg CO2e; source: ${i.otherSource || "Missing"}`,
    "Formula: baseline kg CO2e = displaced quantity x emission factor.",
    "Formula: project kg CO2e = transport + processing + other project emissions.",
    "Include applicable biomass combustion and other project emissions in the stated boundary; biomass is not assumed carbon-neutral.",
    "Formula: net kg CO2e = baseline - project; tCO2e = net kg CO2e / 1000.",
    `Baseline: ${v(result.baselineKg)} kg CO2e; project: ${v(result.projectKg)} kg CO2e; net: ${v(result.netKg)} kg CO2e${result.netKg === null ? "" : ` (${result.netKg / 1000} tCO2e)`}`,
    `Assumptions/boundary: ${i.assumptions || "Missing"}`,
    "A negative net result indicates increased emissions within the entered boundary, not savings.",
    ...result.missing.map(m => `Needed: ${m}`),
    "No fixed biomass-tonnage multiplier, automatic energy equivalence, wet/dry conversion, carbon-credit price or certification is used.",
  ];
}
