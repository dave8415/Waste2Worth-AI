import assert from "node:assert/strict";
import test from "node:test";
import { geminiErrorMessage } from "../src/lib/gemini-errors.ts";

test("invalid key gets specific guidance, without exposing provider text", () => {
  const message = geminiErrorMessage(400, {
    error: {
      message: "private provider diagnostics",
      details: [{ reason: "API_KEY_INVALID" }],
    },
  });
  assert.match(message, /rejected the API key/);
  assert.match(message, /server Secrets/);
  assert.doesNotMatch(message, /private provider diagnostics/);
});

test("unauthorized and forbidden responses explain permissions", () => {
  for (const status of [401, 403]) {
    assert.match(geminiErrorMessage(status, null), /permissions/);
  }
});

test("expired keys retain specific guidance even without structured reasons", () => {
  assert.match(geminiErrorMessage(400, {
    error: { message: "API key expired. Please renew the API key." },
  }), /rejected the API key/);
  assert.match(geminiErrorMessage(400, {
    error: { details: [{ reason: "API_KEY_EXPIRED" }] },
  }), /rejected the API key/);
});

test("quota guidance explains waiting and checking billing", () => {
  const message = geminiErrorMessage(429, null);
  assert.match(message, /quota/);
  assert.match(message, /Wait/);
  assert.match(message, /billing/);
  assert.doesNotMatch(message, /rejected the API key/);
});

test("retired model is not incorrectly reported as an invalid key", () => {
  assert.match(geminiErrorMessage(404, null), /supported image-analysis model/);
});

test("invalid photo and temporary outage have distinct guidance", () => {
  assert.match(geminiErrorMessage(400, { error: { details: null } }), /Try another clear/);
  for (const payload of [null, "not JSON", {}, { error: "invalid" }]) {
    assert.match(geminiErrorMessage(500, payload), /temporarily unavailable/);
  }
});
