import assert from "node:assert/strict";
import { test } from "node:test";
import { buildImpactSummary, emptyImpact, emptySupply, parseSupply } from "../src/lib/biomass";
import { isDate, isValidLocation, PROVINCE_CITIES } from "../src/lib/locations";
import {
  createDemoTransaction, emptyOffer, patchTransaction, pickupForBuyer, transactionImpactText,
  transitionTransaction, validateOffer, type DemoTransaction, type Result, type TransactionDraft, type TransactionStatus,
} from "../src/lib/transactions";
const now = "2026-10-11T04:00:00.000Z";
function value<T>(result: Result<T>): T {
  assert.equal(result.ok, true, !result.ok ? JSON.stringify(result.errors) : undefined);
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}
const supply = value(parseSupply({ ...emptySupply, material: "rice-husk", quantityTonnes: "10", region: "West Java", location: "Bandung" }));
const offer = {
  ...emptyOffer, village: "Demo village", pickupPin: "-6.91, 107.61", privatePickupAddress: "PRIVATE pickup gate 123",
  askingPricePerTonneIdr: "120000", minimumOrderTonnes: "1", transportPayer: "buyer" as const,
  estimatedTransportCostIdr: "500000", loadingNeeds: "Supplier forklift", unloadingNeeds: "Buyer unloading crew",
  readyDate: "2026-01-10", deliveryWindowStart: "2026-01-10", deliveryWindowEnd: "2026-01-12",
};
function fresh(): DemoTransaction { return value(createDemoTransaction("demo-heat", "Please discuss this demo lot.", supply, offer, "demo-test-id", now)); }
function edit(tx: DemoTransaction, patch: Partial<TransactionDraft>) { return patchTransaction(tx, patch, now); }
function move(tx: DemoTransaction, status: TransactionStatus) { return value(transitionTransaction(tx, status, now)); }
function agreed() {
  let tx = move(fresh(), "quote_requested");
  tx = edit(tx, { orderedTonnes: "5", agreedPricePerTonneIdr: "120000" });
  tx = edit(tx, { supplierAgreed: true, buyerAgreed: true });
  return move(tx, "agreed");
}
function scheduled() { return move(edit(agreed(), { scheduledDate: "2026-01-11" }), "scheduled"); }
function received(patch: Partial<TransactionDraft> = {}) {
  return move(edit(scheduled(), { receivedDate: "2026-01-11", receivedTonnes: "4.9", actualCollectedTonnes: "5", actualReusedTonnes: "4", destinationUse: "Biochar", qualityCheck: "accepted", ...patch }), "received");
}
test("province/city validation rejects Jakarta in West Java and validates all listed combinations", () => {
  assert.equal(isValidLocation("West Java", "Jakarta"), false);
  assert.equal(parseSupply({ ...emptySupply, material: "rice-husk", quantityTonnes: "10", location: "Jakarta", region: "West Java" }).ok, false);
  assert.equal(isValidLocation("DKI Jakarta", "Jakarta"), true);
  assert.equal(isValidLocation("West Java", "Bandung"), true);
  assert.equal(isValidLocation("DKI Jakarta", "Bandung"), false);
  assert.equal(isValidLocation("Other region", "Any village"), false);
  for (const [province, cities] of Object.entries(PROVINCE_CITIES)) for (const city of cities) assert.ok(isValidLocation(province, city));
});
test("date validation rejects nonexistent dates and invalid formats", () => {
  for (const date of ["2026-02-29", "2026-04-31", "2026-13-01", "tomorrow", "2026-1-1", ""]) assert.equal(isDate(date), false);
  assert.ok(isDate("2028-02-29"));
});
test("interest creates a snapshot, does not send messages, and never accepts invalid supply/offer", () => {
  const tx = fresh();
  assert.equal(tx.status, "interested"); assert.equal(tx.history.length, 1);
  assert.notEqual(tx.supply, supply);
  assert.equal(tx.draft.actualReusedTonnes, "");
  assert.equal(createDemoTransaction("real-company", "Not an actual buyer.", supply, offer, "id", now).ok, false);
  assert.equal(createDemoTransaction("demo-heat", "Hi", supply, offer, "id", now).ok, false);
  assert.equal(createDemoTransaction("demo-heat", "Please discuss the lot.", { ...supply, location: "Jakarta" }, offer, "id", now).ok, false);
  assert.equal(createDemoTransaction("demo-heat", "Please discuss the lot.", supply, { ...offer, minimumOrderTonnes: "11" }, "id", now).ok, false);
});
test("offer keeps unknown separate from zero and checks pins, ready dates and delivery window", () => {
  assert.deepEqual(validateOffer(emptyOffer, supply), {});
  assert.ok(Object.keys(validateOffer(emptyOffer, supply, true)).length);
  assert.deepEqual(validateOffer({ ...offer, askingPricePerTonneIdr: "0", estimatedTransportCostIdr: "0" }, supply, true), {});
  for (const pickupPin of ["http://example.com", "91,107", "-6,181", ",107", "-6,"]) assert.ok(validateOffer({ ...offer, pickupPin }, supply).pickupPin);
  assert.ok(validateOffer({ ...offer, deliveryWindowEnd: "2026-01-09" }, supply).deliveryWindowEnd);
  assert.ok(validateOffer({ ...offer, readyDate: "2026-01-11" }, supply).deliveryWindowStart);
  assert.ok(validateOffer({ ...offer, deliveryWindowEnd: "" }, supply).deliveryWindowEnd);
});
test("transaction follows every status in order and rejects status skips", () => {
  assert.equal(transitionTransaction(fresh(), "scheduled", now).ok, false);
  const completed = move(received(), "completed");
  assert.deepEqual(completed.history.map(h => h.status), ["interested", "quote_requested", "agreed", "scheduled", "received", "completed"]);
  assert.equal(transitionTransaction(completed, "cancelled", now).ok, false);
  assert.equal(transitionTransaction(completed, "interested", now).ok, false);
});
test("both parties consent after quote edits; fixed price and order constraints are enforced", () => {
  let tx = move(fresh(), "quote_requested");
  tx = edit(tx, { orderedTonnes: "5", agreedPricePerTonneIdr: "120000", buyerAgreed: true });
  assert.equal(transitionTransaction(tx, "agreed", now).ok, false);
  tx = edit(tx, { supplierAgreed: true });
  assert.equal(transitionTransaction(tx, "agreed", now).ok, true);
  tx = edit(tx, { orderedTonnes: "6" });
  assert.equal(tx.draft.buyerAgreed, false); assert.equal(tx.draft.supplierAgreed, false);
  tx = edit(tx, { pricing: "fixed", agreedPricePerTonneIdr: "110000", buyerAgreed: true, supplierAgreed: true });
  assert.equal(transitionTransaction(tx, "agreed", now).ok, false);
  for (const orderedTonnes of ["0", "0.5", "11", "not a number"]) {
    const bad = edit(move(fresh(), "quote_requested"), { orderedTonnes, agreedPricePerTonneIdr: "120000", buyerAgreed: true, supplierAgreed: true });
    assert.equal(transitionTransaction(bad, "agreed", now).ok, false);
  }
});
test("buyer preview withholds full address and pin until both simulated parties agree", () => {
  const initial = pickupForBuyer(fresh());
  assert.equal(initial.address, null); assert.equal(initial.pin, null);
  assert.ok(initial.area.includes("Demo village"));
  assert.equal(pickupForBuyer(edit(fresh(), { buyerAgreed: true, supplierAgreed: true })).address, null);
  assert.equal(pickupForBuyer(agreed()).address, offer.privatePickupAddress);
  assert.equal(pickupForBuyer(agreed()).pin, offer.pickupPin);
  assert.equal(pickupForBuyer(move(edit(agreed(), { cancellationReason: "Demo cancelled by supplier." }), "cancelled")).address, null);
});
test("agreed terms are locked; scheduling needs an in-window date", () => {
  const tx = agreed();
  assert.equal(edit(tx, { agreedPricePerTonneIdr: "0", buyerAgreed: false }).draft.agreedPricePerTonneIdr, "120000");
  assert.equal(edit(tx, { buyerAgreed: false }).draft.buyerAgreed, true);
  for (const scheduledDate of ["", "2026-01-09", "2026-01-13", "2026-02-30"]) assert.equal(transitionTransaction(edit(tx, { scheduledDate }), "scheduled", now).ok, false);
  assert.equal(scheduled().status, "scheduled");
});
test("receipt needs received weight, a valid nonfuture date and a quality check", () => {
  const valid = { receivedDate: "2026-01-11", receivedTonnes: "4.9", qualityCheck: "accepted" as const };
  for (const patch of [{ receivedTonnes: "" }, { receivedTonnes: "0" }, { receivedTonnes: "NaN" }, { receivedDate: "2026-01-09" }, { receivedDate: "2030-01-01" }, { qualityCheck: "pending" as const }]) {
    assert.equal(transitionTransaction(edit(scheduled(), { ...valid, ...patch }), "received", now).ok, false);
  }
});
test("actual quantities remain optional but reuse cannot exceed collected or received weight", () => {
  const unknown = received({ actualCollectedTonnes: "", actualReusedTonnes: "" });
  assert.equal(unknown.draft.actualReusedTonnes, "");
  assert.equal(move(unknown, "completed").draft.actualReusedTonnes, "");
  for (const patch of [{ actualCollectedTonnes: "", actualReusedTonnes: "1" }, { actualCollectedTonnes: "5", actualReusedTonnes: "5" }, { actualCollectedTonnes: "3", actualReusedTonnes: "4" }, { actualCollectedTonnes: "-1" }, { actualCollectedTonnes: "11" }]) {
    assert.equal(transitionTransaction(edit(scheduled(), { receivedDate: "2026-01-11", receivedTonnes: "4.9", qualityCheck: "accepted", ...patch }), "received", now).ok, false);
  }
  assert.equal(received({ actualCollectedTonnes: "0", actualReusedTonnes: "0" }).draft.actualReusedTonnes, "0");
});
test("excess received weight needs explicit variance acknowledgement and explanation", () => {
  const d = { receivedDate: "2026-01-11", receivedTonnes: "5.1", qualityCheck: "accepted" as const };
  assert.equal(transitionTransaction(edit(scheduled(), d), "received", now).ok, false);
  assert.equal(transitionTransaction(edit(scheduled(), { ...d, varianceAcknowledged: true, receiptNotes: "Extra weight reviewed in this demo." }), "received", now).ok, true);
});
test("rejected and conditional quality outcomes need notes; rejection prevents completion", () => {
  const tx = received({ qualityCheck: "rejected", receiptNotes: "Plastic contamination observed." });
  assert.equal(transitionTransaction(tx, "completed", now).ok, false);
  assert.equal(move(edit(tx, { cancellationReason: "Rejected after quality inspection." }), "cancelled").status, "cancelled");
  assert.equal(move(received({ qualityCheck: "conditional", receiptNotes: "User-reported acceptance after screening." }), "completed").status, "completed");
  assert.equal(transitionTransaction(edit(scheduled(), { receivedDate: "2026-01-11", receivedTonnes: "4", qualityCheck: "conditional" }), "received", now).ok, false);
});
test("every active status can cancel with a reason; cancelled records are terminal and immutable", () => {
  for (const tx of [fresh(), move(fresh(), "quote_requested"), agreed(), scheduled(), received()]) {
    assert.equal(transitionTransaction(tx, "cancelled", now).ok, false);
    const cancelled = move(edit(tx, { cancellationReason: "User cancelled this simulation." }), "cancelled");
    assert.equal(cancelled.status, "cancelled");
    assert.equal(transitionTransaction(cancelled, "interested", now).ok, false);
    assert.deepEqual(edit(cancelled, { actualReusedTonnes: "999" }), cancelled);
  }
});
test("impact details distinguish estimates/actuals, unknowns, privacy and demo evidence", () => {
  const initial = transactionImpactText(fresh());
  assert.ok(initial.includes("Missing; completion does not imply reuse"));
  assert.ok(!initial.includes(offer.privatePickupAddress)); assert.ok(!initial.includes(offer.pickupPin));
  const text = transactionImpactText(move(received(), "completed"));
  for (const fragment of ["FICTIONAL DEMO", "2026-01-11", "Bandung", "Actual collected: 5 t", "Actual reused: 4 t", "Received weight: 4.9", "Biochar", "Estimated transport cost", "actual cost (IDR): Missing", "Evidence: Missing", "NOT CALCULATED", "not proof of carbon credits"]) assert.ok(text.includes(fragment), fragment);
  assert.ok(!text.includes(offer.privatePickupAddress)); assert.ok(!text.includes(offer.pickupPin));
  assert.ok(text.includes("verified wet/dry mass basis"));
  assert.ok(text.includes("Do not double-count"));
  assert.ok(transactionImpactText(received({ actualCollectedTonnes: "", actualReusedTonnes: "" })).includes("not inferred"));
  const cancelledAfterReceipt = move(edit(received(), { cancellationReason: "Cancelled after receipt in the demo." }), "cancelled");
  assert.ok(transactionImpactText(cancelledAfterReceipt).includes("Actual reused: 4 t"));
  assert.ok(transactionImpactText(cancelledAfterReceipt).includes("Demo cancelled"));
});
test("impact date is optional, validates when supplied and never manufactures a date", () => {
  const input = { ...emptyImpact, collectedTonnes: "5", reusedTonnes: "4" };
  assert.equal(value(buildImpactSummary(supply, input)).reportDate, null);
  assert.equal(value(buildImpactSummary(supply, { ...input, reportDate: "2026-01-11" })).reportDate, "2026-01-11");
  assert.equal(buildImpactSummary(supply, { ...input, reportDate: "2026-02-30" }).ok, false);
});
