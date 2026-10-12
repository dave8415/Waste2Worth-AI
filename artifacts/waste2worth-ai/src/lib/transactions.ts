import { DEMO_BUYERS, USES, parseSupply, type Supply, type IntendedUse } from "./biomass";
import { isDate, isValidLocation } from "./locations";

export const STATUSES = ["interested", "quote_requested", "agreed", "scheduled", "received", "completed", "cancelled"] as const;
export type TransactionStatus = typeof STATUSES[number];
export const STATUS_LABELS: Record<TransactionStatus, string> = {
  interested: "Interest expressed", quote_requested: "Quote requested", agreed: "Terms agreed",
  scheduled: "Pickup / delivery scheduled", received: "Receipt recorded", completed: "Demo completed", cancelled: "Demo cancelled",
};
export interface OfferDraft {
  village: string;
  pickupPin: string;
  privatePickupAddress: string;
  logistics: "buyer-pickup" | "supplier-delivery" | "third-party" | "to-be-agreed";
  transportPayer: "unknown" | "buyer" | "supplier" | "shared";
  estimatedTransportCostIdr: string;
  loadingNeeds: string;
  unloadingNeeds: string;
  readyDate: string;
  deliveryWindowStart: string;
  deliveryWindowEnd: string;
  askingPricePerTonneIdr: string;
  pricing: "negotiable" | "fixed";
  minimumOrderTonnes: string;
}
export interface TransactionDraft extends OfferDraft {
  orderedTonnes: string;
  agreedPricePerTonneIdr: string;
  buyerAgreed: boolean;
  supplierAgreed: boolean;
  scheduledDate: string;
  receivedDate: string;
  receivedTonnes: string;
  actualCollectedTonnes: string;
  actualReusedTonnes: string;
  destinationUse: IntendedUse;
  qualityCheck: "pending" | "accepted" | "conditional" | "rejected";
  receiptNotes: string;
  varianceAcknowledged: boolean;
  actualTransportCostIdr: string;
  cancellationReason: string;
}
export interface EvidenceMeta {
  id: string; name: string; type: string; size: number;
  category: "delivery" | "weighing" | "quality";
  attachedAt: string;
}
export interface DemoTransaction {
  offerId?: string;
  id: string; buyerId: string; buyerName: string; message: string; supply: Supply;
  status: TransactionStatus; createdAt: string; updatedAt: string;
  draft: TransactionDraft; evidence: EvidenceMeta[];
  history: { status: TransactionStatus; at: string }[];
}
export type Result<T> = { ok: true; value: T } | { ok: false; errors: Record<string, string> };
export const emptyOffer: OfferDraft = {
  village: "", pickupPin: "", privatePickupAddress: "", logistics: "buyer-pickup",
  transportPayer: "unknown", estimatedTransportCostIdr: "", loadingNeeds: "", unloadingNeeds: "",
  readyDate: "", deliveryWindowStart: "", deliveryWindowEnd: "",
  askingPricePerTonneIdr: "", pricing: "negotiable", minimumOrderTonnes: "",
};
function number(value: string): number | null {
  if (!value.trim()) return null;
  const result = Number(value);
  return Number.isFinite(result) ? result : null;
}
export function validateOffer(offer: OfferDraft, supply: Supply, required = false): Record<string, string> {
  const errors: Record<string, string> = {};
  for (const field of ["askingPricePerTonneIdr", "estimatedTransportCostIdr"] as const) {
    const n = number(offer[field]);
    if ((required || offer[field].trim()) && (n === null || n < 0 || n > 1e12)) errors[field] = "Enter an IDR amount from 0 to 1,000,000,000,000. Blank means unknown.";
  }
  const minimum = number(offer.minimumOrderTonnes);
  if ((required || offer.minimumOrderTonnes.trim()) && (minimum === null || minimum <= 0 || minimum > supply.quantityTonnes)) errors.minimumOrderTonnes = "Minimum order must be positive and no greater than available tonnes.";
  if (!["buyer-pickup", "supplier-delivery", "third-party", "to-be-agreed"].includes(offer.logistics) || (required && offer.logistics === "to-be-agreed")) errors.logistics = "Agree a logistics option before confirming terms.";
  if (!["unknown", "buyer", "supplier", "shared"].includes(offer.transportPayer) || (required && offer.transportPayer === "unknown")) errors.transportPayer = "Agree who pays transport.";
  if (!["negotiable", "fixed"].includes(offer.pricing)) errors.pricing = "Choose fixed or negotiable.";
  for (const field of ["readyDate", "deliveryWindowStart", "deliveryWindowEnd"] as const) {
    if ((required || offer[field]) && !isDate(offer[field])) errors[field] = "Enter a valid date.";
  }
  if (!!offer.deliveryWindowStart !== !!offer.deliveryWindowEnd) errors.deliveryWindowEnd = "Enter both ends of the delivery window.";
  if (offer.deliveryWindowStart && offer.deliveryWindowEnd && offer.deliveryWindowEnd < offer.deliveryWindowStart) errors.deliveryWindowEnd = "Window end cannot precede its start.";
  if (offer.readyDate && offer.deliveryWindowStart && offer.deliveryWindowStart < offer.readyDate) errors.deliveryWindowStart = "Delivery window cannot start before the ready date.";
  for (const field of ["loadingNeeds", "unloadingNeeds"] as const) {
    if ((required && !offer[field].trim()) || offer[field].length > 1000) errors[field] = "State handling needs, or enter 'None'; at most 1,000 characters.";
  }
  if (offer.village.length > 160) errors.village = "Use at most 160 characters.";
  if (offer.privatePickupAddress.length > 1000) errors.privatePickupAddress = "Use at most 1,000 characters.";
  if (offer.pickupPin.trim()) {
    const parts = offer.pickupPin.split(",").map(s => Number(s.trim()));
    if (parts.length !== 2 || offer.pickupPin.split(",").some(s => !s.trim()) || !parts.every(Number.isFinite) || Math.abs(parts[0]) > 90 || Math.abs(parts[1]) > 180) {
      errors.pickupPin = "Use latitude, longitude (e.g. -6.91, 107.61). Coordinates do not verify a pickup site.";
    }
  }
  return errors;
}
export function createDemoTransaction(buyerId: string, message: string, supply: Supply, offer: OfferDraft, id: string, now: string): Result<DemoTransaction> {
  const buyer = DEMO_BUYERS.find(b => b.id === buyerId && b.materials.includes(supply.material));
  const errors = validateOffer(offer, supply);
  if (!buyer) errors.buyerId = "Select a compatible FICTIONAL DEMO buyer.";
  if (!isValidLocation(supply.region, supply.location)) errors.location = "Invalid province / city combination.";
  const validSupply = parseSupply({ ...supply, quantityTonnes: String(supply.quantityTonnes), moisturePercent: supply.moisturePercent === null ? "" : String(supply.moisturePercent) });
  if (!validSupply.ok) Object.assign(errors, validSupply.errors);
  if (message.trim().length < 10 || message.trim().length > 1000) errors.message = "Use 10–1,000 characters.";
  if (Object.keys(errors).length || !buyer) return { ok: false, errors };
  return { ok: true, value: {
    id, buyerId, buyerName: buyer.name, message: message.trim(), supply: { ...supply },
    status: "interested", createdAt: now, updatedAt: now, evidence: [], history: [{ status: "interested", at: now }],
    draft: { ...offer, orderedTonnes: "", agreedPricePerTonneIdr: "", buyerAgreed: false, supplierAgreed: false,
      scheduledDate: "", receivedDate: "", receivedTonnes: "", actualCollectedTonnes: "", actualReusedTonnes: "",
      destinationUse: buyer.intendedUse, qualityCheck: "pending", receiptNotes: "", varianceAcknowledged: false,
      actualTransportCostIdr: "", cancellationReason: "" },
  }};
}
const next: Partial<Record<TransactionStatus, TransactionStatus>> = {
  interested: "quote_requested", quote_requested: "agreed", agreed: "scheduled", scheduled: "received", received: "completed",
};
export function nextStatus(status: TransactionStatus): TransactionStatus | undefined { return next[status]; }
export function transitionTransaction(tx: DemoTransaction, target: TransactionStatus, now: string): Result<DemoTransaction> {
  const errors: Record<string, string> = {};
  const d = tx.draft;
  if (tx.status === "completed" || tx.status === "cancelled") return { ok: false, errors: { status: "Terminal demo records cannot change status." } };
  if (target === "cancelled") {
    if (d.cancellationReason.trim().length < 5 || d.cancellationReason.length > 1000) errors.cancellationReason = "Give a cancellation reason (5–1,000 characters).";
  } else if (target !== next[tx.status]) errors.status = "Complete the previous transaction step first.";
  else if (target === "agreed") {
    Object.assign(errors, validateOffer(d, tx.supply, true));
    const quantity = number(d.orderedTonnes), price = number(d.agreedPricePerTonneIdr), minimum = number(d.minimumOrderTonnes);
    if (quantity === null || quantity <= 0 || quantity > tx.supply.quantityTonnes || (minimum !== null && quantity < minimum)) errors.orderedTonnes = "Order must meet the supplier minimum and not exceed snapshot availability.";
    if (price === null || price < 0 || price > 1e12) errors.agreedPricePerTonneIdr = "Enter an agreed IDR price per tonne; 0 is explicitly free.";
    if (d.pricing === "fixed" && price !== number(d.askingPricePerTonneIdr)) errors.agreedPricePerTonneIdr = "A fixed asking price must match the agreed price.";
    if (!d.buyerAgreed || !d.supplierAgreed) errors.agreement = "Both simulated parties must explicitly agree. No real company is contacted.";
  } else if (target === "scheduled") {
    if (!isDate(d.scheduledDate) || d.scheduledDate < d.readyDate || d.scheduledDate < d.deliveryWindowStart || d.scheduledDate > d.deliveryWindowEnd) errors.scheduledDate = "Schedule a date on/after readiness and within the agreed delivery window.";
  } else if (target === "received") {
    const received = number(d.receivedTonnes), collected = number(d.actualCollectedTonnes), reused = number(d.actualReusedTonnes);
    const reference = new Date(now);
    const today = `${reference.getFullYear()}-${String(reference.getMonth() + 1).padStart(2, "0")}-${String(reference.getDate()).padStart(2, "0")}`;
    if (!isDate(d.receivedDate) || d.receivedDate < d.scheduledDate || d.receivedDate > today) errors.receivedDate = "Receipt date must be valid, on/after scheduling, and not in the future.";
    if (received === null || received <= 0 || received > 1_000_000) errors.receivedTonnes = "Enter a positive received weight up to 1,000,000 tonnes.";
    if (received !== null && received > Number(d.orderedTonnes) && (!d.varianceAcknowledged || d.receiptNotes.trim().length < 5)) errors.varianceAcknowledged = "Acknowledge excess weight and explain the variance in receipt notes.";
    if (d.actualCollectedTonnes.trim() && (collected === null || collected < 0 || collected > tx.supply.quantityTonnes)) errors.actualCollectedTonnes = "Collected tonnes must be between 0 and snapshot availability.";
    if (d.actualReusedTonnes.trim() && (reused === null || reused < 0 || collected === null || reused > collected || received === null || reused > received)) errors.actualReusedTonnes = "Reuse needs a collected quantity and cannot exceed either collected or received tonnes.";
    if (!["accepted", "conditional", "rejected"].includes(d.qualityCheck)) errors.qualityCheck = "Record a quality-check outcome; it is user-reported, not lab verification.";
    if (d.receiptNotes.length > 1000) errors.receiptNotes = "Use at most 1,000 characters.";
    if (["conditional", "rejected"].includes(d.qualityCheck) && d.receiptNotes.trim().length < 5) errors.receiptNotes = "Explain the conditional or rejected outcome (at least 5 characters).";
    if (!(USES as readonly string[]).includes(d.destinationUse)) errors.destinationUse = "Choose a destination use.";
    const cost = number(d.actualTransportCostIdr);
    if (d.actualTransportCostIdr.trim() && (cost === null || cost < 0 || cost > 1e12)) errors.actualTransportCostIdr = "Actual transport cost must be a nonnegative IDR amount.";
  } else if (target === "completed" && (d.qualityCheck === "pending" || d.qualityCheck === "rejected")) errors.qualityCheck = "Rejected material cannot be marked completed. Resolve it outside this prototype or cancel the demo.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { ...tx, status: target, updatedAt: now, history: [...tx.history, { status: target, at: now }] } };
}
export function editableFields(status: TransactionStatus): readonly (keyof TransactionDraft)[] {
  if (status === "interested" || status === "quote_requested") return [...Object.keys(emptyOffer) as (keyof OfferDraft)[], "orderedTonnes", "agreedPricePerTonneIdr", "buyerAgreed", "supplierAgreed", "cancellationReason"];
  if (status === "agreed") return ["scheduledDate", "cancellationReason"];
  if (status === "scheduled") return ["receivedDate", "receivedTonnes", "actualCollectedTonnes", "actualReusedTonnes", "destinationUse", "qualityCheck", "receiptNotes", "varianceAcknowledged", "actualTransportCostIdr", "cancellationReason"];
  if (status === "received") return ["cancellationReason"];
  return [];
}
export function patchTransaction(tx: DemoTransaction, patch: Partial<TransactionDraft>, now: string): DemoTransaction {
  const allowed = editableFields(tx.status);
  const filtered = Object.fromEntries(Object.entries(patch).filter(([key]) => allowed.includes(key as keyof TransactionDraft)));
  if (!Object.keys(filtered).length) return tx;
  // Editing quote terms voids prior consent; new consent must follow the edits.
  const termsEdited = Object.keys(filtered).some(key => key !== "buyerAgreed" && key !== "supplierAgreed" && key !== "cancellationReason");
  return { ...tx, updatedAt: now, draft: { ...tx.draft, ...(termsEdited && (tx.status === "interested" || tx.status === "quote_requested") ? { buyerAgreed: false, supplierAgreed: false } : {}), ...filtered } };
}
export function recordTransactionReuse(
  tx: DemoTransaction,
  patch: Pick<TransactionDraft, "actualCollectedTonnes" | "actualReusedTonnes" | "destinationUse">,
  now: string,
): Result<DemoTransaction> {
  if (!["received", "completed"].includes(tx.status)) return { ok: false, errors: { status: "Record receipt before updating actual reuse. Cancelled records cannot add reuse." } };
  const collected = number(patch.actualCollectedTonnes), reused = number(patch.actualReusedTonnes);
  const received = number(tx.draft.receivedTonnes);
  const errors: Record<string, string> = {};
  if (collected === null || collected < 0 || collected > tx.supply.quantityTonnes) errors.actualCollectedTonnes = "Enter collected tonnes between 0 and offered availability.";
  if (reused === null || reused < 0 || collected === null || reused > collected || received === null || reused > received) errors.actualReusedTonnes = "Enter reused tonnes no greater than collected or received weight (0 means none reused).";
  if (!(USES as readonly string[]).includes(patch.destinationUse)) errors.destinationUse = "Choose a destination use.";
  if (tx.draft.qualityCheck === "rejected" && reused !== null && reused > 0) errors.actualReusedTonnes = "Resolve the rejected quality outcome before claiming reuse of this batch.";
  if (Object.keys(errors).length) return { ok: false, errors };
  return { ok: true, value: { ...tx, updatedAt: now, draft: { ...tx.draft, ...patch } } };
}
export function pickupForBuyer(tx: DemoTransaction): { area: string; address: string | null; pin: string | null; released: boolean } {
  const consent = tx.draft.buyerAgreed && tx.draft.supplierAgreed && ["agreed", "scheduled", "received", "completed"].includes(tx.status);
  return { area: [tx.draft.village, tx.supply.location, tx.supply.region].filter(Boolean).join(", "), address: consent ? tx.draft.privatePickupAddress || null : null, pin: consent ? tx.draft.pickupPin || null : null, released: consent };
}
export function transactionImpactText(tx: DemoTransaction): string {
  const hasReceipt = tx.history.some(step => step.status === "received");
  const d = tx.draft;
  return [
    "FICTIONAL DEMO TRANSACTION — no real sale, delivery, buyer consent or certified evidence",
    `Record: ${tx.id}; status: ${STATUS_LABELS[tx.status]}`,
    `Origin area: ${[d.village, tx.supply.location, tx.supply.region].filter(Boolean).join(", ")}`,
    `Receipt date: ${hasReceipt ? d.receivedDate : "Missing — no receipt recorded"}`,
    `Received weight: ${hasReceipt ? `${d.receivedTonnes} t (not proof of reuse)` : "Missing"}`,
    `Actual collected: ${hasReceipt && d.actualCollectedTonnes.trim() ? `${d.actualCollectedTonnes} t, user-reported demo entry` : "Missing; not inferred from ordered or received weight"}`,
    `Actual reused: ${hasReceipt && d.actualReusedTonnes.trim() ? `${d.actualReusedTonnes} t, user-reported demo entry` : "Missing; completion does not imply reuse"}`,
    `Destination use: ${d.destinationUse} (${hasReceipt && d.actualReusedTonnes.trim() ? "user-reported" : "intended, not confirmed"})`,
    `Logistics: ${d.logistics}; transport payer: ${d.transportPayer}`,
    `Estimated transport cost (IDR): ${d.estimatedTransportCostIdr || "Missing"}; actual cost (IDR): ${hasReceipt ? d.actualTransportCostIdr || "Missing" : "Missing"}`,
    `Ready date: ${d.readyDate || "Missing"}; window: ${d.deliveryWindowStart || "Missing"} to ${d.deliveryWindowEnd || "Missing"}; scheduled: ${d.scheduledDate || "Missing"}`,
    `Loading: ${d.loadingNeeds || "Missing"}; unloading: ${d.unloadingNeeds || "Missing"}`,
    `Quality check: ${hasReceipt ? d.qualityCheck : "Missing"} (unverified); notes: ${hasReceipt ? d.receiptNotes || "Missing" : "Missing"}`,
    `Evidence: ${tx.evidence.length ? tx.evidence.map(e => `${e.category}: ${e.name} (unverified local attachment)`).join("; ") : "Missing — no files attached"}`,
    "Missing: verified wet/dry mass basis for this receipt. Linking alone does not reconcile these snapshot quantities or reporting scope with the manual summary. Do not double-count this record.",
    "Assumptions: all entries are simulated/user-reported; attachment presence is not verification. No transport distance, fuel use or emissions factors are inferred. Private address and pin are excluded.",
    "Emissions savings: NOT CALCULATED. Not certified, not proof of compliance, and not proof of carbon credits.",
  ].join("\n");
}
