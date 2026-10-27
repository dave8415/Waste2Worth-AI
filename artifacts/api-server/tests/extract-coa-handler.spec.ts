import assert from "node:assert/strict";
import { test } from "node:test";
import { extractCoaFromDocument } from "../src/lib/extract-coa.ts";

const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);
const webp = Buffer.from("RIFF....WEBP....", "ascii");
const pdf = Buffer.from("%PDF-1.4 sample laboratory report", "ascii");
const b64 = (bytes: Buffer) => bytes.toString("base64");

function printed(overrides: Record<string, unknown> = {}) {
  return {
    documentType: "Certificate of Analysis",
    laboratoryName: "Example Laboratory",
    reportNumber: "COA-100",
    sampleId: "S-22",
    testDate: "2026-03-01",
    moisture: { value: 12.5, unit: "%", massBasis: "wet", method: "oven", printedText: "Moisture 12.5 %" },
    calorificValue: { value: 3800, unit: "kcal/kg", calorificType: "gross", massBasis: "dry", method: null, printedText: "GCV 3800 kcal/kg" },
    ash: { value: 4.2, unit: "%", massBasis: "dry", method: null, printedText: "Ash 4.2 %" },
    warnings: [],
    documentLooksLikeLabReport: true,
    ...overrides,
  };
}

function geminiOk(payload: unknown) {
  return async () => new Response(JSON.stringify({
    candidates: [{ content: { parts: [{ text: JSON.stringify(payload) }] } }],
  }), { status: 200, headers: { "content-type": "application/json" } });
}

test("extract-coa validates input before calling Gemini", async () => {
  const calls: unknown[] = [];
  const fetchImpl = (async (...args: unknown[]) => {
    calls.push(args);
    return new Response("{}", { status: 200 });
  }) as typeof fetch;
  const logs: unknown[] = [];
  const missing = await extractCoaFromDocument({}, { apiKey: "secret-key", fetchImpl, log: { warn: (obj) => logs.push(obj) } });
  assert.equal(missing.status, 400);
  const empty = await extractCoaFromDocument({ documentBase64: b64(Buffer.alloc(0)), mimeType: "application/pdf" }, {
    apiKey: "secret-key", fetchImpl, log: { warn: (obj) => logs.push(obj) },
  });
  assert.equal(empty.status, 400);
  const noKey = await extractCoaFromDocument({ documentBase64: b64(pdf), mimeType: "application/pdf" }, {
    apiKey: "", fetchImpl, log: { warn: (obj) => logs.push(obj) },
  });
  assert.equal(noKey.status, 503);
  assert.match((noKey.json as { error: string }).error, /GEMINI_API_KEY/);
  assert.equal(calls.length, 0);
});

test("valid Gemini JSON is returned and invalid JSON is rejected", async () => {
  const logs: string[] = [];
  const ok = await extractCoaFromDocument(
    { documentBase64: b64(jpeg), mimeType: "image/jpeg" },
    { apiKey: "secret-key", fetchImpl: geminiOk(printed()), log: { warn: (obj, msg) => logs.push(JSON.stringify({ obj, msg })) } },
  );
  assert.equal(ok.status, 200);
  if (ok.status === 200 && !("error" in ok.json)) {
    assert.equal(ok.json.laboratoryName, "Example Laboratory");
    assert.equal(ok.json.moisture?.value, 12.5);
  }
  const invalid = await extractCoaFromDocument(
    { documentBase64: b64(png), mimeType: "image/png" },
    {
      apiKey: "secret-key",
      fetchImpl: async () => new Response(JSON.stringify({ candidates: [{ content: { parts: [{ text: "not-json" }] } }] }), { status: 200 }),
      log: { warn: (obj, msg) => logs.push(JSON.stringify({ obj, msg })) },
    },
  );
  assert.equal(invalid.status, 502);
  assert.doesNotMatch(JSON.stringify(ok.json), /secret-key/);
  assert.doesNotMatch(logs.join("\n"), /secret-key|ffd8ff|RIFF|%PDF/i);
});

test("quota and provider failures use the safe mapper", async () => {
  const quota = await extractCoaFromDocument(
    { documentBase64: b64(webp), mimeType: "image/webp" },
    {
      apiKey: "secret-key",
      fetchImpl: async () => new Response(JSON.stringify({ error: { message: "private quota text", details: [{ reason: "RESOURCE_EXHAUSTED" }] } }), { status: 429 }),
      log: { warn() {} },
    },
  );
  assert.equal(quota.status, 503);
  assert.match((quota.json as { error: string }).error, /quota/);
  assert.doesNotMatch((quota.json as { error: string }).error, /private quota text|secret-key/);
});
