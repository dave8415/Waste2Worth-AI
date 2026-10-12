# Waste2Worth AI

Waste2Worth AI helps farmers and collectors identify agricultural or plantation waste, save material offers, and create an unverified Impact Estimation report. It is a focused prototype: photo analysis is not a substitute for laboratory testing.

## Prototype user flow

The home page uses three real uploaded agricultural photos, optimized for web delivery while preserving their proportions. They are served as static JPEG assets from `artifacts/waste2worth-ai/public/images/`: `farmer-field.jpg`, `rice-husk.jpg`, and `rice-straw.jpg`. These are illustrative website photos, separate from private scan uploads, and are included in the normal web build.

1. **Scan — `/scan`:** upload or take a photo for Gemini analysis. Review classification, confidence, visible clues, visible condition indicators, possible contamination, possible uses, and photo limitations. Empty findings mean unknown, not proof of cleanliness. A successful analysis creates one local material record; its original assessment remains unchanged. Manual identification is available as a clearly labelled fallback.
2. **Offer this material — on the Scan result:** the material and scan findings are carried forward automatically. Enter only available tonnes, asking price in IDR per tonne, province, city/regency, preferred logistics (buyer pickup, supplier delivery, third party, or to be agreed), and short notes. No address, coordinates, transport cost or delivery scheduling is required at this stage. Submit once to turn the same material record into an offer and open Market. The curated location list has limited demo coverage; incompatible combinations are not accepted.
3. **Market — `/market`:** see your own offers, material, quantity, location and status. There are currently no real buyer listings. The empty state says “Belum ada permintaan dari industri”; no sample companies or simulated matches are exposed. Open an offer's Impact report directly. Synthetic buyer fixtures exist only in automated tests. Earlier simulation records are retained privately for compatibility but have no public route and are not used as evidence of real impact.
4. **Reports — `/reports`:** the Impact Estimation page carries the same material record's classification, scan findings, offered tonnes and location automatically. Choose an intended use once; it is saved on that record. Optionally record actual collected, received and reused tonnes only after material movement. Blank stays unknown, explicit 0 means zero, and reuse cannot exceed collected or received quantities. Offered tonnes never become actual quantities automatically. Generate saves a dated immutable report snapshot; history includes date, material, method, offered quantity and status. Source changes prompt a new report. Download PDF exports exactly the selected historical snapshot using the free, client-side jsPDF library, including its scan photo when available. There are no emissions, carbon-credit or monetary environmental-benefit calculations.
5. **Profile — `/profile`:** optional role, business type and province/city are stored only in this browser, not an account or backend-connected identity. Home, Market, prominent Scan, Reports and Profile share desktop and mobile bottom navigation.

Older `/analyze`, `/exchange` and `/impact` links open Scan, Market and Reports. `/reports/legacy` also opens the clean Reports page. Raw legacy report text, simulated transactions and sample buyer names are not shown or exported.

Saving an offer does not contact a buyer or create a sale. There is no buyer onboarding, real inventory reservation or marketplace backend yet. Actual quantities are user-reported, not independently verified. Old simulated transaction quantities are never silently imported into the new Impact Estimation report.

Drafts, status history and demo records use browser local storage. Evidence file copies use browser IndexedDB, not server uploads, localStorage base64, or external storage. Supported types: JPEG, PNG, WebP, PDF, TXT and CSV; maximum 5 MB per file, five files per transaction and 50 MB in this browser. Attachments can be downloaded after reload or removed. Their existence is not verification of delivery, weighing or quality.

Pickup privacy is a **demonstration**, not production authorization: the supplier can edit their own address/pin, but the buyer preview hides those fields until both simulated parties agree and the transaction reaches agreed status. Cancellation hides them again. No pickup details are sent to a server or company. Dedicated private pickup fields are excluded from impact reports/downloads. With no accounts, this cannot enforce privacy between real people sharing a browser. A future real exchange requires authenticated parties, access controls and protected durable storage before accepting real private addresses.

Records and attachments remain on the same browser/origin only, not across users, devices or development/published domains. Clearing browser storage removes them. The reset action confirms deletion of local scans/offers/reports, supply, interest, impact, transaction and evidence data; profile has its own clear action. Storage failures show a warning; current-session data should not be assumed saved.

Photos are sent to Google for analysis. The resized scan photo is kept only in memory during the current app session so it can appear in the connected report and PDF. Reloading removes the photo; the saved material, offer and report history remain and show “Photo not available.” No photo bytes are placed in localStorage. No server database, login, payments, email delivery, live marketplace, external file storage or managed AI billing has been added.

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
