import assert from "node:assert/strict";

// Run against either a production Node process or the mapped container port.
// This check deliberately makes no Gemini request and needs no API key.
const base = process.argv[2] || "http://127.0.0.1:8080";
const request = (route, options) => fetch(new URL(route, base), {
  signal: AbortSignal.timeout(10_000),
  ...options,
});

const home = await request("/");
assert.equal(home.status, 200);
assert.match(home.headers.get("content-type"), /text\/html/);
const html = await home.text();
assert.match(html, /<div id="root"><\/div>/);
assert.match(home.headers.get("cache-control"), /no-cache/);

for (const route of ["/scan", "/market", "/reports", "/profile"]) {
  const response = await request(route);
  assert.equal(response.status, 200, route);
  assert.equal(await response.text(), html, `${route} must serve the SPA entry`);
  console.log(`PASS ${route}: SPA fallback`);
}

const script = html.match(/src="([^"]+\/assets\/[^"]+\.js)"/)?.[1]
  || html.match(/src="(\/assets\/[^"]+\.js)"/)?.[1];
assert.ok(script, "Built JavaScript entry must exist");
const asset = await request(script);
assert.equal(asset.status, 200);
assert.match(asset.headers.get("content-type"), /javascript/);
assert.match(asset.headers.get("cache-control"), /immutable/);
const photo = await request("/images/rice-husk.jpg");
assert.equal(photo.status, 200);
assert.match(photo.headers.get("content-type"), /image\/jpeg/);
const missingAsset = await request("/assets/does-not-exist.js");
assert.equal(missingAsset.status, 404, "Missing assets must not return SPA HTML");
console.log("PASS built JavaScript, photo assets, caching and missing-asset handling");

const health = await request("/api/healthz");
assert.equal(health.status, 200);
assert.deepEqual(await health.json(), { status: "ok" });
const invalidScan = await request("/api/waste/analyze", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: "{}",
});
assert.equal(invalidScan.status, 400);
assert.match(invalidScan.headers.get("content-type"), /application\/json/);
const unknownApi = await request("/api/does-not-exist", {
  headers: { Accept: "text/html" },
});
assert.equal(unknownApi.status, 404);
assert.match(unknownApi.headers.get("content-type"), /application\/json/);
console.log("PASS API health, analyze validation and API/SPA separation");
console.log(`Production checks passed against ${base}; no Gemini call was made.`);
