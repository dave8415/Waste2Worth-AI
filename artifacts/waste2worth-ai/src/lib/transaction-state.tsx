import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { z } from "zod";
import { MATERIALS, USES, type Supply } from "./biomass";
import { clearEvidence, deleteEvidence, saveEvidence } from "./evidence-storage";
import { localTransaction } from "./local-transaction";
import type { MaterialRecord } from "./journey";
import { STATUSES, createDemoTransaction, emptyOffer, patchTransaction, recordTransactionReuse, transitionTransaction, type DemoTransaction, type EvidenceMeta, type OfferDraft, type Result, type TransactionDraft, type TransactionStatus } from "./transactions";

const KEY = "waste2worth-transactions-v1";
const text = z.string().max(1000);
const offerShape = {
  village: text, pickupPin: text, privatePickupAddress: text,
  logistics: z.enum(["buyer-pickup", "supplier-delivery", "third-party", "to-be-agreed"]),
  transportPayer: z.enum(["unknown", "buyer", "supplier", "shared"]),
  estimatedTransportCostIdr: text, loadingNeeds: text, unloadingNeeds: text, readyDate: text,
  deliveryWindowStart: text, deliveryWindowEnd: text, askingPricePerTonneIdr: text,
  pricing: z.enum(["negotiable", "fixed"]), minimumOrderTonnes: text,
};
const draftSchema = z.object({
  ...offerShape, orderedTonnes: text, agreedPricePerTonneIdr: text,
  buyerAgreed: z.boolean(), supplierAgreed: z.boolean(), scheduledDate: text, receivedDate: text,
  receivedTonnes: text, actualCollectedTonnes: text, actualReusedTonnes: text,
  destinationUse: z.enum([...USES]), qualityCheck: z.enum(["pending", "accepted", "conditional", "rejected"]),
  receiptNotes: text, varianceAcknowledged: z.boolean(), actualTransportCostIdr: text, cancellationReason: text,
});
const supplySchema = z.object({
  material: z.enum(MATERIALS.map(m => m.id) as [string, ...string[]]), quantityTonnes: z.number().positive().max(1_000_000),
  location: text, region: text, moisturePercent: z.number().min(0).max(100).nullable(),
  quality: z.enum(["unknown", "clean", "mixed", "contaminated"]), qualityNotes: text,
});
const schema = z.object({
  offer: z.object(offerShape),
  transactions: z.array(z.object({
    id: text, offerId: text.optional(), buyerId: text, buyerName: text, message: text, supply: supplySchema, status: z.enum(STATUSES),
    createdAt: z.string().datetime(), updatedAt: z.string().datetime(), draft: draftSchema,
    history: z.array(z.object({ status: z.enum(STATUSES), at: z.string().datetime() })).max(10),
    evidence: z.array(z.object({ id: text, name: text, type: text, size: z.number().positive().max(5 * 1024 * 1024),
      category: z.enum(["delivery", "weighing", "quality"]), attachedAt: z.string().datetime() })).max(5),
  })).max(100),
});
interface TransactionState { offer: OfferDraft; transactions: DemoTransaction[] }
const initial: TransactionState = { offer: emptyOffer, transactions: [] };
function load(): { state: TransactionState; warning: string } {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { state: initial, warning: "" };
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? { state: parsed.data as TransactionState, warning: "" } : { state: initial, warning: "Saved demo transactions could not be read. They have not been treated as verified records." };
  } catch { return { state: initial, warning: "Browser storage is unavailable; demo transactions may not survive reload." }; }
}
interface TransactionContextValue {
  state: TransactionState;
  storageWarning: string;
  startLocalTracking: (record: MaterialRecord) => Result<DemoTransaction>;
  updateOffer: (patch: Partial<OfferDraft>) => void;
  createTransaction: (buyerId: string, message: string, supply: Supply, offerId?: string, terms?: OfferDraft) => Result<DemoTransaction>;
  updateDraft: (id: string, patch: Partial<TransactionDraft>) => void;
  advance: (id: string, target: TransactionStatus) => Result<DemoTransaction>;
  recordReuse: (id: string, patch: Pick<TransactionDraft, "actualCollectedTonnes" | "actualReusedTonnes" | "destinationUse">) => Result<DemoTransaction>;
  attachEvidence: (id: string, file: File, category: EvidenceMeta["category"]) => Promise<void>;
  removeEvidence: (id: string, evidenceId: string) => Promise<void>;
  resetTransactions: () => Promise<void>;
}
const Context = createContext<TransactionContextValue | null>(null);
export function TransactionProvider({ children }: { children: ReactNode }) {
  const [loaded] = useState(load);
  const [state, setState] = useState(loaded.state);
  const [storageWarning, setWarning] = useState(loaded.warning);
  useEffect(() => {
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch { setWarning("Demo transaction storage failed. Current records may not survive reload; download your summary before leaving."); }
  }, [state]);
  const replace = (tx: DemoTransaction) => setState(prev => ({ ...prev, transactions: prev.transactions.map(t => t.id === tx.id ? tx : t) }));
  const value: TransactionContextValue = {
    state, storageWarning,
    startLocalTracking: (record): Result<DemoTransaction> => {
      if (!record.offer) return { ok: false, errors: { offer: "Submit an offer first." } };
      const existing = state.transactions.find(t => t.offerId === record.id && t.status !== "cancelled");
      if (existing) return { ok: true, value: existing };
      if (state.transactions.length >= 100) return { ok: false, errors: { limit: "Limit of 100 local records reached." } };
      const tx = localTransaction(record, crypto.randomUUID(), new Date().toISOString());
      setState(prev => prev.transactions.some(t => t.offerId === record.id && t.status !== "cancelled") ? prev : { ...prev, transactions: [tx, ...prev.transactions] });
      return { ok: true, value: tx };
    },
    updateOffer: patch => setState(prev => ({ ...prev, offer: { ...prev.offer, ...patch } })),
    createTransaction: (buyerId, message, supply, offerId, terms) => {
      if (state.transactions.length >= 100) return { ok: false, errors: { limit: "Limit of 100 local demo records reached." } };
      if (offerId && state.transactions.some(tx => tx.offerId === offerId && tx.status !== "cancelled")) return { ok: false, errors: { offer: "This offer already has a demo transaction. Continue that record; availability is not reserved twice." } };
      const result = createDemoTransaction(buyerId, message, supply, terms ?? state.offer, crypto.randomUUID(), new Date().toISOString());
      if (result.ok && offerId) result.value.offerId = offerId;
      if (result.ok) setState(prev => ({ ...prev, transactions: [result.value, ...prev.transactions] }));
      return result;
    },
    updateDraft: (id, patch) => setState(prev => ({ ...prev, transactions: prev.transactions.map(tx => tx.id === id ? patchTransaction(tx, patch, new Date().toISOString()) : tx) })),
    advance: (id, target) => {
      const tx = state.transactions.find(t => t.id === id);
      if (!tx) return { ok: false, errors: { id: "Demo record not found." } };
      const result = transitionTransaction(tx, target, new Date().toISOString());
      if (result.ok) replace(result.value);
      return result;
    },
    recordReuse: (id, patch) => {
      const tx = state.transactions.find(t => t.id === id);
      if (!tx) return { ok: false, errors: { id: "Demo record not found." } };
      const result = recordTransactionReuse(tx, patch, new Date().toISOString());
      if (result.ok) replace(result.value);
      return result;
    },
    attachEvidence: async (id, file, category) => {
      const tx = state.transactions.find(t => t.id === id);
      if (!tx || tx.evidence.length >= 5) throw new Error("Use at most five attachments per demo transaction.");
      const meta = await saveEvidence(file, category);
      setState(prev => ({ ...prev, transactions: prev.transactions.map(t => t.id === id ? { ...t, evidence: [...t.evidence, meta], updatedAt: new Date().toISOString() } : t) }));
    },
    removeEvidence: async (id, evidenceId) => {
      if (!state.transactions.find(t => t.id === id)?.evidence.some(e => e.id === evidenceId)) throw new Error("Evidence record not found.");
      await deleteEvidence(evidenceId);
      setState(prev => ({ ...prev, transactions: prev.transactions.map(t => t.id === id ? { ...t, evidence: t.evidence.filter(e => e.id !== evidenceId), updatedAt: new Date().toISOString() } : t) }));
    },
    resetTransactions: async () => {
      await clearEvidence();
      setState({ offer: { ...emptyOffer }, transactions: [] });
    },
  };
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useTransactions() {
  const value = useContext(Context);
  if (!value) throw new Error("TransactionProvider is required.");
  return value;
}
