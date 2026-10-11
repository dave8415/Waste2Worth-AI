import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import { DEMO_BUYERS, MATERIALS, USES, buildImpactSummary, emptyImpact, emptySupply, inferMaterial, parseSupply, type Supply, type SupplyDraft, type ImpactDraft } from "./biomass";

export interface DemoInterest {
  id: string;
  buyerId: string;
  buyerName: string;
  message: string;
  createdAt: string;
  supply: Supply;
}
interface PrototypeState {
  supply: SupplyDraft;
  impact: ImpactDraft;
  identifiedWasteType: string;
  interests: DemoInterest[];
  reportCreatedAt: string | null;
}
const KEY = "waste2worth-prototype-v1";
const materialEnum = z.enum(MATERIALS.map(item => item.id) as [string, ...string[]]);
const qualityEnum = z.enum(["unknown", "clean", "mixed", "contaminated"]);
const supplySchema = z.object({
  // Invalid form drafts must survive reload without discarding valid interest records.
  material: materialEnum.or(z.literal("")), quantityTonnes: z.string().max(1000),
  location: z.string().max(1000), region: z.string().max(100), moisturePercent: z.string().max(1000),
  quality: qualityEnum, qualityNotes: z.string().max(10000),
});
const stateSchema = z.object({
  supply: supplySchema,
  impact: z.object({
    collectedTonnes: z.string().max(1000), reusedTonnes: z.string().max(1000),
    intendedUse: z.enum([...USES]), massBasis: z.enum(["unknown", "as-received", "dry"]),
  }),
  identifiedWasteType: z.string().max(1000),
  interests: z.array(z.object({
    id: z.string().max(100), buyerId: z.string().max(100), buyerName: z.string().max(100),
    message: z.string().min(10).max(1000), createdAt: z.string().datetime(),
    supply: supplySchema.extend({ material: materialEnum, quantityTonnes: z.number().positive().max(1_000_000), moisturePercent: z.number().min(0).max(100).nullable() }),
  })).max(100),
  reportCreatedAt: z.string().datetime().nullable(),
});
const initialState: PrototypeState = { supply: emptySupply, impact: emptyImpact, identifiedWasteType: "", interests: [], reportCreatedAt: null };
function loadState(): { state: PrototypeState; warning: string } {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { state: initialState, warning: "" };
    const parsed = stateSchema.safeParse(JSON.parse(raw));
    if (parsed.success) return { state: parsed.data as PrototypeState, warning: "" };
    return { state: initialState, warning: "Saved prototype data could not be read. Start a new entry." };
  } catch {
    return { state: initialState, warning: "Browser storage is unavailable. Entries will only last for this session." };
  }
}
interface BiomassContextValue {
  state: PrototypeState;
  storageWarning: string;
  updateSupply: (patch: Partial<SupplyDraft>) => void;
  updateImpact: (patch: Partial<ImpactDraft>) => void;
  adoptIdentification: (wasteType: string) => void;
  recordInterest: (buyerId: string, message: string, supply: Supply) => boolean;
  generateReport: () => void;
  resetPrototype: () => void;
}
const BiomassContext = createContext<BiomassContextValue | null>(null);
export function BiomassProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(loadState);
  const [state, setState] = useState<PrototypeState>(loaded.state);
  const [storageWarning, setStorageWarning] = useState(loaded.warning);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { setStorageWarning("Browser storage is unavailable. Entries will only last for this session."); }
  }, [state]);
  const value: BiomassContextValue = {
    state, storageWarning,
    updateSupply: patch => setState(previous => ({ ...previous, supply: { ...previous.supply, ...patch }, reportCreatedAt: null })),
    updateImpact: patch => setState(previous => ({ ...previous, impact: { ...previous.impact, ...patch }, reportCreatedAt: null })),
    adoptIdentification: wasteType => setState(previous => ({
      ...previous, identifiedWasteType: wasteType.slice(0, 1000),
      supply: { ...previous.supply, material: inferMaterial(wasteType) }, reportCreatedAt: null,
    })),
    recordInterest: (buyerId, message, supply) => {
      const buyer = DEMO_BUYERS.find(item => item.id === buyerId);
      if (!buyer || !buyer.materials.includes(supply.material) || message.trim().length < 10 || message.trim().length > 1000 || state.interests.length >= 100) return false;
      const interest: DemoInterest = { id: crypto.randomUUID(), buyerId, buyerName: buyer.name, message: message.trim(), createdAt: new Date().toISOString(), supply };
      setState(previous => ({ ...previous, interests: [interest, ...previous.interests] }));
      return true;
    },
    generateReport: () => {
      const supply = parseSupply(state.supply);
      if (!supply.ok || !buildImpactSummary(supply.value, state.impact).ok) return;
      setState(previous => ({ ...previous, reportCreatedAt: new Date().toISOString() }));
    },
    resetPrototype: () => setState({ ...initialState }),
  };
  return <BiomassContext.Provider value={value}>{children}</BiomassContext.Provider>;
}
export function useBiomass() {
  const value = useContext(BiomassContext);
  if (!value) throw new Error("BiomassProvider is required.");
  return value;
}
