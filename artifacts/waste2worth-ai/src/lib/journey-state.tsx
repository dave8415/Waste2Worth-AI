import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import { assessmentSchema, connectedReportText, prepareConnectedOffer, reportVersion, type Assessment, type MaterialRecord, type ShortOffer } from "./journey";
import { MATERIALS } from "./biomass";
import { type DemoTransaction, type Result } from "./transactions";
import { USES } from "./biomass";
import { actualQuantitiesSchema, buildEstimationReport, impactReportSchema, validateActualQuantities, type ActualQuantityDraft, type ImpactEstimationReport, type ReportMethod } from "./impact-estimation";
import { materialQualitySchema, validateQuality, type QualityDraft } from "./material-quality";
import { emissionsInputsSchema, parseEmissionsDraft, type EmissionsDraft } from "./emissions";
import { useTransactions } from "./transaction-state";
import { validateTestResults, type TestResultsDraft } from "./test-results";

const KEY = "waste2worth-connected-journey-v1";
const bounded = z.string().max(1000);
const termsSchema = z.object({
  village: bounded, pickupPin: bounded, privatePickupAddress: bounded,
  logistics: z.enum(["buyer-pickup", "supplier-delivery", "third-party", "to-be-agreed"]),
  transportPayer: z.enum(["unknown", "buyer", "supplier", "shared"]), estimatedTransportCostIdr: bounded,
  loadingNeeds: bounded, unloadingNeeds: bounded, readyDate: bounded, deliveryWindowStart: bounded,
  deliveryWindowEnd: bounded, askingPricePerTonneIdr: bounded, pricing: z.enum(["negotiable", "fixed"]), minimumOrderTonnes: bounded,
});
const recordSchema = z.object({
  id: bounded, source: z.enum(["photo", "manual"]), scan: assessmentSchema, createdAt: z.string().datetime(),
  offer: z.object({
    supply: z.object({
      material: z.enum(MATERIALS.map(m => m.id) as [string, ...string[]]),
      quantityTonnes: z.number().positive().max(1_000_000), location: bounded, region: bounded,
      moisturePercent: z.number().min(0).max(100).nullable(), quality: z.enum(["unknown", "clean", "mixed", "contaminated"]), qualityNotes: bounded,
    }),
    terms: termsSchema, notes: z.string().max(500), submittedAt: z.string().datetime(),
  }).nullable(),
  report: z.object({ generatedAt: z.string().datetime(), sourceVersion: z.string().max(20000), text: z.string().max(100000) }).nullable(),
  intendedUse: z.union([z.literal(""), z.enum([...USES])]).optional(),
  actualQuantities: actualQuantitiesSchema.optional(),
  impactReports: z.array(impactReportSchema).max(50).optional(),
  quality: materialQualitySchema.optional(),
  emissionsInputs: emissionsInputsSchema.optional(),
});
interface JourneyState { records: MaterialRecord[]; activeId: string | null }
const schema = z.object({ records: z.array(recordSchema).max(100), activeId: bounded.nullable() });
const initial: JourneyState = { records: [], activeId: null };
function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { state: initial, warning: "" };
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success
      ? { state: parsed.data as JourneyState, warning: "" }
      : { state: initial, warning: "Saved material records could not be read. Existing browser data has not been treated as verified." };
  } catch { return { state: initial, warning: "Browser storage is unavailable. Your material records may not survive reload." }; }
}
interface JourneyContextValue {
  state: JourneyState; active: MaterialRecord | undefined; storageWarning: string;
  startScan: (result: Assessment, source?: "photo" | "manual") => Result<MaterialRecord>;
  selectRecord: (id: string) => void;
  submitOffer: (id: string, draft: ShortOffer) => Result<MaterialRecord>;
  generateReport: (id: string, transactions: DemoTransaction[]) => Result<MaterialRecord>;
  resetJourney: () => void;
  photos: Record<string, string>;
  rememberPhoto: (id: string, jpegDataUrl: string) => void;
  setIntendedUse: (id: string, method: ReportMethod) => void;
  saveActualQuantities: (id: string, draft: ActualQuantityDraft) => Result<MaterialRecord>;
  generateImpactReport: (id: string) => Result<ImpactEstimationReport>;
  saveQuality: (id: string, draft: QualityDraft) => Result<MaterialRecord>;
  saveTestResults: (id: string, draft: TestResultsDraft) => Result<MaterialRecord>;
  saveEmissions: (id: string, draft: EmissionsDraft) => Result<MaterialRecord>;
}
const Context = createContext<JourneyContextValue | null>(null);
export function JourneyProvider({ children }: { children: ReactNode }) {
  const { state: txState } = useTransactions();
  const [loaded] = useState(load);
  const [state, setState] = useState<JourneyState>(loaded.state);
  const [storageWarning, setWarning] = useState(loaded.warning);
  const [photos, setPhotos] = useState<Record<string, string>>({});
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { setWarning("Local material record storage failed. Current records may not survive reload. Download your report before leaving."); }
  }, [state]);
  const value: JourneyContextValue = {
    state, active: state.records.find(r => r.id === state.activeId), storageWarning,
    photos,
    saveTestResults: (id, draft): Result<MaterialRecord> => {
      const record = state.records.find(r => r.id === id);
      if (!record?.offer) return { ok: false, errors: { record: "Create an offer before adding optional test results." } };
      const parsed = validateTestResults(draft, new Date().toISOString());
      if (!parsed.ok) return parsed;
      const previousFiles = [
        ...(record.quality?.legacyEvidence ?? []),
        ...(["moisture", "calorific", "ash"] as const).flatMap(k => {
          const evidence = record.quality?.[k].evidence;
          return evidence ? [evidence] : [];
        }),
        ...(record.quality?.testResult?.evidence ? [record.quality.testResult.evidence] : []),
      ];
      const legacyEvidence = [...new Map(previousFiles.filter(e => e.id !== parsed.value.testResult?.evidence?.id).map(e => [e.id, e])).values()];
      const updated = { ...record, quality: { ...parsed.value, ...(legacyEvidence.length ? { legacyEvidence } : {}) } };
      setState(prev => ({ ...prev, records: prev.records.map(r => r.id === id ? updated : r) }));
      return { ok: true, value: updated };
    },
    saveQuality: (id, draft) => {
      const record = state.records.find(r => r.id === id);
      if (!record) return { ok: false, errors: { record: "Material record not found." } };
      const parsed = validateQuality(draft);
      if (!parsed.ok) return parsed;
      const updated = { ...record, quality: parsed.value };
      setState(prev => ({ ...prev, records: prev.records.map(r => r.id === id ? updated : r) }));
      return { ok: true, value: updated };
    },
    saveEmissions: (id, draft): Result<MaterialRecord> => {
      const record = state.records.find(r => r.id === id);
      if (!record) return { ok: false, errors: { record: "Material record not found." } };
      const parsed = parseEmissionsDraft(draft);
      if (!parsed.success) return { ok: false, errors: { emissions: "Enter finite non-negative emissions and quantities, or leave unknown. Check source/assumption lengths." } };
      const updated = { ...record, emissionsInputs: parsed.data };
      setState(prev => ({ ...prev, records: prev.records.map(r => r.id === id ? updated : r) }));
      return { ok: true, value: updated };
    },
    rememberPhoto: (id, jpegDataUrl) => {
      if (jpegDataUrl.startsWith("data:image/jpeg;base64,") && jpegDataUrl.length <= 8 * 1024 * 1024) setPhotos(prev => ({ ...prev, [id]: jpegDataUrl }));
    },
    setIntendedUse: (id, method) => {
      if (method && !(USES as readonly string[]).includes(method)) return;
      setState(prev => ({ ...prev, records: prev.records.map(r => r.id === id ? { ...r, intendedUse: method } : r) }));
    },
    saveActualQuantities: (id, draft): Result<MaterialRecord> => {
      const record = state.records.find(r => r.id === id);
      if (!record) return { ok: false, errors: { record: "Material record not found." } };
      const result = validateActualQuantities(record, draft, new Date().toISOString());
      if (!result.ok) return result;
      const updated = { ...record, actualQuantities: result.value };
      setState(prev => ({ ...prev, records: prev.records.map(r => r.id === id ? updated : r) }));
      return { ok: true, value: updated };
    },
    generateImpactReport: (id): Result<ImpactEstimationReport> => {
      const record = state.records.find(r => r.id === id);
      if (!record) return { ok: false, errors: { record: "Material record not found." } };
      if ((record.impactReports?.length || 0) >= 50) return { ok: false, errors: { limit: "This material has 50 saved reports. Download your existing reports before creating more." } };
      const result = buildEstimationReport(record, crypto.randomUUID(), new Date().toISOString(), txState.transactions);
      if (!result.ok) return result;
      setState(prev => ({ ...prev, records: prev.records.map(r => r.id === id ? { ...r, impactReports: [result.value, ...(r.impactReports || [])] } : r) }));
      return result;
    },
    startScan: (result, source = "photo"): Result<MaterialRecord> => {
      if (state.records.length >= 100) return { ok: false, errors: { limit: "Limit of 100 local material records reached. Download your reports before resetting local records." } };
      const scan = assessmentSchema.safeParse(result);
      if (!scan.success) return { ok: false, errors: { scan: "This scan result could not be saved. Try another photo." } };
      const record: MaterialRecord = { id: crypto.randomUUID(), source, scan: scan.data, createdAt: new Date().toISOString(), offer: null, report: null };
      setState(prev => ({ records: [record, ...prev.records], activeId: record.id }));
      return { ok: true, value: record };
    },
    selectRecord: id => setState(prev => prev.records.some(r => r.id === id) ? { ...prev, activeId: id } : prev),
    submitOffer: (id, draft): Result<MaterialRecord> => {
      const record = state.records.find(r => r.id === id);
      if (!record) return { ok: false, errors: { record: "Material record not found. Start from Scan." } };
      // The same ID is retained. Repeated navigation/submission cannot create another offer.
      if (record.offer) return { ok: true, value: record };
      const result = prepareConnectedOffer(record.scan, draft, new Date().toISOString());
      if (!result.ok) return result;
      const updated = { ...record, offer: result.value, report: null };
      setState(prev => ({ activeId: id, records: prev.records.map(r => r.id === id ? updated : r) }));
      return { ok: true, value: updated };
    },
    generateReport: (id, transactions): Result<MaterialRecord> => {
      const record = state.records.find(r => r.id === id);
      if (!record?.offer) return { ok: false, errors: { record: "Submit this offer before generating a report." } };
      const now = new Date().toISOString();
      const updated: MaterialRecord = { ...record, report: { generatedAt: now, sourceVersion: reportVersion(record, transactions), text: connectedReportText(record, transactions, now) } };
      setState(prev => ({ activeId: id, records: prev.records.map(r => r.id === id ? updated : r) }));
      return { ok: true, value: updated };
    },
    resetJourney: () => { setState({ ...initial }); setPhotos({}); },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useJourney() {
  const value = useContext(Context);
  if (!value) throw new Error("JourneyProvider is required.");
  return value;
}
