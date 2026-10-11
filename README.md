# Waste2Worth AI

Waste2Worth AI helps farmers and collectors identify agricultural or plantation waste, explore fictional buyer demand, and create an unverified ESG summary. It is a focused prototype: photo analysis is not a substitute for laboratory testing.

## Prototype user flow

1. **Identify — `/analyze`:** upload or take a photo for Gemini analysis. Review the likely material, visible clues, possible uses, and photo limitations. Continue with the suggested material and confirm it, or enter a material manually if photo analysis is unavailable.
2. **Find a use or buyer — `/exchange`:** enter material, available tonnes, a province and a city/regency from that province, optional measured moisture and reported quality. The curated location list has limited demo coverage; arbitrary or incompatible combinations are not accepted. Add an optional village, private pickup address/pin, asking price in IDR/tonne, fixed/negotiable terms, minimum order, logistics, transport payer and estimated total transport cost, handling needs, ready date, and delivery window. Fictional demand is ranked by material, lot size and province; matching does not verify quality or acceptance.
3. **Simulate a transaction — `/exchange`:** express interest → request a quote → agree on terms → schedule pickup/delivery → record received weight and a user-reported quality check → mark demo completed or cancelled. Both simulated parties must agree explicitly. Terms then become read-only; the schedule must fit readiness and the agreed window. Received weight is not automatically collected or reused quantity. Rejected receipts cannot be completed; cancellation needs a reason. Attach local delivery, weighing, or quality evidence.
4. **Explore and summarize — `/impact`:** review use routes and required checks. Enter actual collected and reused tonnes independently, intended use, mass basis and an optional report date. Optionally include a transaction and explicitly import its actual quantities only when both have been entered; import resets mass basis to unknown because the receipt does not establish wet/dry basis. The report and text download include transaction dates, origin area, destination use, transport estimates versus actual costs, and unverified evidence references when available. Missing values remain missing. Linking alone does not reconcile reporting scope or prevent double-counting; the user must check these. Editing a source transaction makes an existing linked report stale and requires regeneration.

All buyer listings are **FICTIONAL DEMO**, not real companies or orders. Every action is a local simulation: no real message, quote, buyer consent, sale, payment, delivery, or reuse is asserted. Supply and offer snapshots stay fixed for each transaction; the prototype does not reserve stock or reconcile inventory across records. Existing legacy interest records are retained separately.

Drafts, status history and demo records use browser local storage. Evidence file copies use browser IndexedDB, not server uploads, localStorage base64, or external storage. Supported types: JPEG, PNG, WebP, PDF, TXT and CSV; maximum 5 MB per file, five files per transaction and 50 MB in this browser. Attachments can be downloaded after reload or removed. Their existence is not verification of delivery, weighing or quality.

Pickup privacy is a **demonstration**, not production authorization: the supplier can edit their own address/pin, but the buyer preview hides those fields until both simulated parties agree and the transaction reaches agreed status. Cancellation hides them again. No pickup details are sent to a server or company. Dedicated private pickup fields are excluded from impact reports/downloads. With no accounts, this cannot enforce privacy between real people sharing a browser. A future real exchange requires authenticated parties, access controls and protected durable storage before accepting real private addresses.

Records and attachments remain on the same browser/origin only, not across users, devices or development/published domains. Clearing browser storage removes them. The reset action confirms deletion of local supply, interest, impact, transaction and evidence data. Storage failures show a warning; current-session data should not be assumed saved.

Photos are sent to Google for analysis but are not retained by the app or stored in browser persistence. No server database, login, payments, email delivery, live marketplace, external file storage or managed AI billing has been added.

The ESG summary is not certified, not a compliance report, and not proof of carbon credits. It makes no claim of avoided emissions or verified social benefits. Emissions savings are **not calculated** without a defensible baseline, transport and processing data, emissions factors, and relevant material measurements. An intended use is a plan, not evidence that reuse has happened.

## Configure Gemini

The API server reads `GEMINI_API_KEY` only on the server. Never add it to frontend code or a `VITE_` variable.

- **Replit:** add `GEMINI_API_KEY` under the project’s Secrets. The app will show a setup message if the secret is missing.
- **Local development:** provide `GEMINI_API_KEY` to the API server process through your local environment or a secret manager.
- **Google Cloud Run later:** store the key in Google Secret Manager and expose it to the API service as `GEMINI_API_KEY`. Do not bake it into an image or source file.

This app calls Google’s Gemini API directly with your key; it does not use Replit-managed AI billing. Google account quotas and any Google billing settings still apply to your key.

Photo analysis uses `gemini-3.1-flash-lite`. The previous `gemini-2.5-flash` model rejected requests from new users with a model-unavailable response; the provider-recommended `gemini-3.8-flash` returned high-demand errors during verification. Flash-Lite successfully handled the sample photo. The key is sent in a server-only request header, never a browser request or URL. The app does not silently switch models on failure.


### If analysis fails

- **Key or permission error:** the app owner should check the server's `GEMINI_API_KEY` secret and its access to the Gemini API.
- **Request limit or quota reached:** wait before retrying; if it persists, check the Gemini project's quota and billing.
- **Model unavailable:** update the server to a supported image-analysis model.
- **Temporary service or connection error:** wait and retry. Requests have a 90-second timeout so the app does not wait indefinitely.

The app shows safe guidance rather than raw provider diagnostics. Every successful result includes the warning that a photo cannot confirm moisture, quality, or energy value and lab testing may still be needed.

Run provider-error regression checks with `node --test artifacts/api-server/tests/gemini-errors.test.ts`.

### Troubleshooting analysis errors

Restart the API workflow after adding or changing a secret. Its startup log reports only `geminiApiKeyConfigured: true/false`.
The server uses the Google Gemini REST `v1beta` endpoint with `gemini-3.1-flash-lite`, authenticating through the server-only `x-goog-api-key` header.
Provider failures log the upstream HTTP status, model, and redacted Google error message; they do not log the key, request headers, or photo.
The app distinguishes rejected keys, denied API access, missing models, quota/rate limits, and invalid requests.
It does not automatically retry, switch models, enable billing, or retain uploaded photos.

## Run in this workspace

Install workspace dependencies with `pnpm install`. Start the API server and web app using their existing workflows. The web app calls the API at `/api/waste/analyze`.

## Checks

- Frontend: `pnpm --filter @workspace/waste2worth-ai run typecheck`
- API server: `pnpm --filter @workspace/api-server run typecheck`
- Location validation, transaction status/consent/receipt/privacy rules, matching and impact calculations: `pnpm --filter @workspace/scripts exec tsx --test ../artifacts/waste2worth-ai/tests/*.test.ts`
- Production frontend build: `PORT=8080 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/waste2worth-ai run build` (the existing Vite configuration requires these non-secret build settings; `PORT` is supplied by Cloud Run at runtime).

## Cloud Run deployment notes

The frontend and API are separate services in this project. For a later Cloud Run deployment, build both, serve the built frontend with SPA fallback, route `/api/*` to the API service and other paths to the web service, and attach `GEMINI_API_KEY` only to the API service through Secret Manager. Services bind to `0.0.0.0` using `PORT`; do not run the development server as the production web service. The new transaction journey requires no server filesystem writes or server database, so Cloud Run's ephemeral filesystem does not hold demo records. Keep a stable HTTPS origin for browser persistence. Shared, backed-up multi-user evidence and private addresses require a separate secured storage/authentication design; this prototype intentionally does not add it. No deployment has been performed.
