import type { MaterialRecord } from "./journey";
import type { DemoTransaction } from "./transactions";

// A user's own local tracking record, not a buyer listing or fabricated demand.
export function localTransaction(record: MaterialRecord, id: string, now: string): DemoTransaction {
  if (!record.offer) throw new Error("Submit an offer first.");
  return {
    id, offerId: record.id, buyerId: "local-unverified", buyerName: "Unverified counterparty",
    message: "Local prototype tracking only. No company contacted and no real sale claimed.",
    supply: { ...record.offer.supply, moisturePercent: record.quality?.moisture.value ?? null },
    status: "interested", createdAt: now, updatedAt: now, evidence: [], history: [{ status: "interested", at: now }],
    draft: {
      ...record.offer.terms, orderedTonnes: "", agreedPricePerTonneIdr: "",
      buyerAgreed: false, supplierAgreed: false, scheduledDate: "", receivedDate: "", receivedTonnes: "",
      actualCollectedTonnes: "", actualReusedTonnes: "", destinationUse: record.intendedUse || "Biomass fuel",
      qualityCheck: "pending", receiptNotes: "", varianceAcknowledged: false, actualTransportCostIdr: "", cancellationReason: "",
    },
  };
}
