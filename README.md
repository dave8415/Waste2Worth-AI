# Waste2Worth AI

Waste2Worth AI helps farmers and collectors get a cautious first look at agricultural or plantation waste from a photo and explore possible reuse options. It is an MVP: it does not store uploaded images, and photo analysis is not a substitute for laboratory testing.

## Configure Gemini

The API server reads `GEMINI_API_KEY` only on the server. Never add it to frontend code or a `VITE_` variable.

- **Replit:** add `GEMINI_API_KEY` under the project’s Secrets. The app will show a setup message if the secret is missing.
- **Local development:** provide `GEMINI_API_KEY` to the API server process through your local environment or a secret manager.
- **Google Cloud Run later:** store the key in Google Secret Manager and expose it to the API service as `GEMINI_API_KEY`. Do not bake it into an image or source file.

This app calls Google’s Gemini API directly with your key; it does not use Replit-managed AI billing. Google account quotas and any Google billing settings still apply to your key.

### Troubleshooting analysis errors

Restart the API workflow after adding or changing a secret. Its startup log reports only `geminiApiKeyConfigured: true/false`.
The server uses the Google Gemini REST `v1beta` endpoint with `gemini-2.5-flash`, authenticating through the server-only `x-goog-api-key` header.
Provider failures log the upstream HTTP status, model, and redacted Google error message; they do not log the key, request headers, or photo.
The app distinguishes rejected keys, denied API access, missing models, quota/rate limits, and invalid requests.
It does not automatically retry, switch models, enable billing, or retain uploaded photos.

## Run in this workspace

Install workspace dependencies with `pnpm install`. Start the API server and web app using their existing workflows. The web app calls the API at `/api/waste/analyze`.

## Cloud Run deployment notes

The frontend and API are separate services in this project. For a later Cloud Run deployment, build and deploy both, route `/api/*` to the API service and the app’s other paths to the web service, and attach `GEMINI_API_KEY` only to the API service through Secret Manager. No database is required for this MVP.
