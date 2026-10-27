import assert from "node:assert/strict";
import { test } from "node:test";
import { photoObservation } from "../src/lib/photo-observations.ts";
test("photo descriptions cannot supply numeric quality or grades", () => {
  for (const line of ["Moisture about 12%", "Ash content 3.1%", "Calorific value: 4,000 kcal/kg", "Twelve percent moisture", "18000 kJ/kg", "Moisture １２％", "Grade premium", "Fuel class II", "Quality grade A", "Certified quality fuel"]) assert.equal(photoObservation(line), null);
  for (const line of ["Appears dry", "Fibrous stalks", "Possible plastic fragments", "No obvious contamination is visible in this photo. Physical inspection may still be needed."]) assert.equal(photoObservation(line), line);
});
