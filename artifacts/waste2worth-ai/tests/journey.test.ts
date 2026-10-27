import assert from "node:assert/strict";
import { test } from "node:test";
import { DEMO_BUYERS } from "./fixtures/buyers";
import { assessmentSchema, connectedReportText, prepareConnectedOffer, relatedTransactions, reportVersion, type MaterialRecord, type ShortOffer } from "../src/lib/journey";
import { createDemoTransaction, recordTransactionReuse, transitionTransaction, type DemoTransaction, type Result } from "../src/lib/transactions";

const now = "2026-10-13T04:00:00.000Z";
const scan = assessmentSchema.parse({
  wasteType: "Likely rice husks", confidence: "medium", visibleClues: ["Small golden husks"],
  visibleQualityIndicators: ["Mixed particle sizes"], possibleContamination: ["Possible dark foreign particles; inspect"],
  possibleUses: ["Biochar after testing"], limitationNote: "A photo cannot confirm moisture, quality or energy value; lab testing may be needed.",
});
const draft: ShortOffer = { quantityTonnes: "10", askingPricePerTonneIdr: "120000", province: "West Java", city: "Bandung", logistics: "to-be-agreed", notes: "Demo batch" };
function value<T>(result: Result<T>): T {
  if (!result.ok) throw new Error(JSON.stringify(result.errors));
  return result.value;
}
function record(): MaterialRecord {
  return { id: "same-material-id", source: "photo", scan, createdAt: now, offer: value(prepareConnectedOffer(scan, draft, now)), report: null };
}
function transaction(): DemoTransaction {
  const r = record();
  return { ...value(createDemoTransaction("demo-heat", "Demo interest only, no message sent", r.offer!.supply, r.offer!.terms, "tx-1", now, DEMO_BUYERS)), offerId: r.id };
}
test("scan findings carry through offer without claiming measured quality or moisture", () => {
  const r = record();
  assert.equal(r.offer!.supply.material, "rice-husk");
  assert.equal(r.offer!.supply.quality, "unknown");
  assert.equal(r.offer!.supply.moisturePercent, null);
  assert.match(r.offer!.supply.qualityNotes, /Mixed particle sizes/);
  assert.match(r.offer!.supply.qualityNotes, /Possible dark foreign particles/);
  assert.equal(r.scan, scan);
  assert.equal(r.offer!.terms.logistics, "to-be-agreed");
  for (const field of ["pickupPin", "privatePickupAddress", "readyDate", "estimatedTransportCostIdr", "loadingNeeds"] as const) assert.equal(r.offer!.terms[field], "");
});
test("short offer validates geography, quantity, price, notes and logistics", () => {
  for (const patch of [
    { city: "Jakarta" }, { quantityTonnes: "" }, { quantityTonnes: "-1" }, { quantityTonnes: "Infinity" },
    { askingPricePerTonneIdr: "" }, { askingPricePerTonneIdr: "-1" }, { askingPricePerTonneIdr: "NaN" }, { notes: "x".repeat(501) },
  ]) assert.equal(prepareConnectedOffer(scan, { ...draft, ...patch }, now).ok, false);
  assert.equal(prepareConnectedOffer(scan, { ...draft, province: "DKI Jakarta", city: "Jakarta", askingPricePerTonneIdr: "0" }, now).ok, true);
});
test("unrecognized scanned classification is retained and matched only to uncertain category", () => {
  const uncertain = { ...scan, wasteType: "Unidentified brown residue" };
  assert.equal(value(prepareConnectedOffer(uncertain, draft, now)).supply.material, "other-agricultural-residue");
});
test("older API result can be normalized without invented visible condition findings", () => {
  const { visibleQualityIndicators, possibleContamination, ...old } = scan;
  const parsed = assessmentSchema.parse(old);
  assert.deepEqual(parsed.visibleQualityIndicators, []);
  assert.deepEqual(parsed.possibleContamination, []);
});
test("preliminary reports separate offered volume from unknown actual impact", () => {
  const text = connectedReportText(record(), [], now);
  assert.match(text, /PRELIMINARY OFFER SUMMARY/);
  assert.match(text, /Quantity OFFERED: 10 tonnes/);
  for (const name of ["Actual collected quantity", "Actual received weight", "Actual reused quantity"]) assert.match(text, new RegExp(`${name}: UNKNOWN`));
  assert.match(text, /Emissions savings: NOT CALCULATED/);
  assert.match(text, /Possible dark foreign particles/);
});
test("transactions are linked by offer ID and drafts cannot count as actual quantities", () => {
  const tx = transaction();
  tx.draft.receivedTonnes = "10"; tx.draft.actualCollectedTonnes = "10"; tx.draft.actualReusedTonnes = "10";
  assert.equal(relatedTransactions(record(), [tx, { ...tx, id: "unrelated", offerId: "other" }]).length, 1);
  const text = connectedReportText(record(), [tx], now);
  assert.match(text, /Actual reused quantity: UNKNOWN/);
  assert.match(text, /Draft receipt quantities are NOT counted/);
  assert.match(text, /PRELIMINARY/);
});
test("to-be-agreed logistics cannot pass agreement even with all other terms", () => {
  const tx = transaction();
  tx.status = "quote_requested";
  tx.draft = { ...tx.draft, orderedTonnes: "5", agreedPricePerTonneIdr: "120000", minimumOrderTonnes: "1", transportPayer: "buyer",
    estimatedTransportCostIdr: "0", loadingNeeds: "None", unloadingNeeds: "None", readyDate: "2026-10-12",
    deliveryWindowStart: "2026-10-12", deliveryWindowEnd: "2026-10-13", buyerAgreed: true, supplierAgreed: true };
  const result = transitionTransaction(tx, "agreed", now);
  assert.equal(result.ok, false);
  if (!result.ok) assert.match(result.errors.logistics, /Agree/);
});
test("received records may record reuse later, and report updates do not infer collected or reuse", () => {
  const tx = transaction();
  tx.status = "received";
  tx.history.push({ status: "received", at: now });
  tx.draft.receivedTonnes = "4.9"; tx.draft.receivedDate = "2026-10-13"; tx.draft.qualityCheck = "accepted";
  const before = connectedReportText(record(), [tx], now);
  assert.match(before, /PRELIMINARY/);
  assert.match(before, /Actual received weight: 4.9 tonnes/);
  assert.match(before, /Actual reused quantity: UNKNOWN/);
  const updated = value(recordTransactionReuse(tx, { actualCollectedTonnes: "5", actualReusedTonnes: "4", destinationUse: "Biochar" }, "2026-10-13T05:00:00.000Z"));
  const text = connectedReportText(record(), [updated], now);
  assert.match(text, /USER-REPORTED ACTUAL IMPACT/);
  assert.match(text, /Actual reused quantity: 4 tonnes/);
  assert.match(text, /Actual collected quantity: 5 tonnes/);
  assert.notEqual(reportVersion(record(), [tx]), reportVersion(record(), [updated]));
  assert.equal(updated.draft.receivedTonnes, "4.9");
});
test("reuse validation rejects impossible quantities, preserves explicit zero, and restricts status", () => {
  const tx = transaction();
  const patch = { actualCollectedTonnes: "5", actualReusedTonnes: "4", destinationUse: "Biochar" as const };
  assert.equal(recordTransactionReuse(tx, patch, now).ok, false);
  tx.status = "received"; tx.draft.receivedTonnes = "4.9"; tx.draft.qualityCheck = "accepted";
  for (const extra of [{ actualReusedTonnes: "6" }, { actualCollectedTonnes: "" }, { actualReusedTonnes: "" }, { actualCollectedTonnes: "11" }]) assert.equal(recordTransactionReuse(tx, { ...patch, ...extra }, now).ok, false);
  const zero = value(recordTransactionReuse(tx, { ...patch, actualReusedTonnes: "0" }, now));
  zero.history.push({ status: "received", at: now });
  assert.match(connectedReportText(record(), [zero], now), /Actual reused quantity: 0 tonnes/);
  tx.status = "cancelled"; assert.equal(recordTransactionReuse(tx, patch, now).ok, false);
});
test("report snapshots exclude private pickup address and coordinates", () => {
  const tx = transaction();
  tx.draft.privatePickupAddress = "PRIVATE-HIDDEN-ADDRESS";
  tx.draft.pickupPin = "-6.91234, 107.61234";
  assert.doesNotMatch(connectedReportText(record(), [tx], now), /PRIVATE-HIDDEN-ADDRESS|-6.91234/);
});
