# Waste2Worth AI

Waste2Worth AI helps farmers and collectors identify agricultural or plantation waste, explore fictional buyer demand, and create an unverified ESG summary. It is a focused prototype: photo analysis is not a substitute for laboratory testing.

## Prototype user flow

1. **Identify — `/analyze`:** upload or take a photo for Gemini analysis. Review the likely material, visible clues, possible uses, and photo limitations. Continue with the suggested material and confirm it, or enter a material manually if photo analysis is unavailable.
2. **Find a use or buyer — `/exchange`:** enter material, available tonnes, city/locality, and a region for the demo matching rules. Optionally enter measured moisture and reported quality. Fictional industry listings are ranked by material, minimum lot, and explicit service region; transport, actual demand, and acceptance are not verified.
3. **Explore and summarize — `/impact`:** review material-specific use routes and required checks. Enter collected and reused tonnes separately from available stock, intended use, and mass basis. Generate and download an unverified summary of user-reported mass flow with assumptions and missing evidence.

All demand listings are **demo data**, not real companies or orders. Expressing interest records a message only in this browser; it does not contact a buyer, create a deal, or prove reuse. Drafts and demo interest records use browser local storage and can be cleared with the reset action. They are not shared across devices or users. Storage failures fall back to the current session with a visible warning.

Photos are sent to Google for analysis but are not retained by the app or stored in browser persistence. No database, login, payments, email delivery, live marketplace, or managed AI billing has been added.

The ESG summary is not certified, not a compliance report, and not proof of carbon credits. It makes no claim of avoided emissions or verified social benefits. Emissions savings are **not calculated** without a defensible baseline, transport and processing data, emissions factors, and relevant material measurements. An intended use is a plan, not evidence that reuse has happened.

## Configure Gemini

The API server reads `GEMINI_API_KEY` only on the server. Never add it to frontend code or a `VITE_` variable.

- **Replit:** add `GEMINI_API_KEY` under the project’s Secrets. The app will show a setup message if the secret is missing.
- **Local development:** provide `GEMINI_API_KEY` to the API server process through your local environment or a secret manager.
- **Google Cloud Run later:** store the key in Google Secret Manager and expose it to the API service as `GEMINI_API_KEY`. Do not bake it into an image or source file.

This app calls Google’s Gemini API directly with your key; it does not use Replit-managed AI billing. Google account quotas and any Google billing settings still apply to your key.

### Troubleshooting analysis errors

Restart the API workflow after adding or changing a secret. Its startup log reports only `geminiApiKeyConfigured: true/false`.
The server uses the Google Gemini REST `v1beta` endpoint with `gemini-3.8-flash`, authenticating through the server-only `x-goog-api-key` header.
Provider failures log the upstream HTTP status, model, and redacted Google error message; they do not log the key, request headers, or photo.
The app distinguishes rejected keys, denied API access, missing models, quota/rate limits, and invalid requests.
It does not automatically retry, switch models, enable billing, or retain uploaded photos.

## Run in this workspace

Install workspace dependencies with `pnpm install`. Start the API server and web app using their existing workflows. The web app calls the API at `/api/waste/analyze`.

## Checks

- Frontend: `pnpm --filter @workspace/waste2worth-ai run typecheck`
- API server: `pnpm --filter @workspace/api-server run typecheck`
- Matching, validation, use guidance, and impact calculations: `pnpm --filter @workspace/scripts exec tsx --test ../artifacts/waste2worth-ai/tests/biomass.test.ts`

## Cloud Run deployment notes

The frontend and API are separate services in this project. For a later Cloud Run deployment, build and deploy both, route `/api/*` to the API service and the app’s other paths to the web service, and attach `GEMINI_API_KEY` only to the API service through Secret Manager. No database is required for this MVP.
