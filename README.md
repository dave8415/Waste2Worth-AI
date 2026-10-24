# Waste2Worth AI

Waste2Worth AI helps farmers and collectors identify agricultural or plantation waste, save material offers, and create an unverified Impact Estimation report. It is a focused prototype: photo analysis is not a substitute for laboratory testing.

## Prototype user flow

The home page uses three real uploaded agricultural photos, optimized for web delivery while preserving their proportions. They are served as static JPEG assets from `artifacts/waste2worth-ai/public/images/`: `farmer-field.jpg`, `rice-husk.jpg`, and `rice-straw.jpg`. These are illustrative website photos, separate from private scan uploads, and are included in the normal web build.

1. **Scan — `/scan`:** upload or take a photo for Gemini analysis. Review classification, confidence, visible clues, visible condition indicators, possible contamination, possible uses, and photo limitations. Empty findings mean unknown, not proof of cleanliness. A successful analysis creates one local material record; its original assessment remains unchanged. Manual identification is available as a clearly labelled fallback.
2. **Offer this material — on the Scan result:** the material and scan findings are carried forward automatically. Enter only available tonnes, asking price in IDR per tonne, province, city/regency, preferred logistics (buyer pickup, supplier delivery, third party, or to be agreed), and short notes. No address, coordinates, transport cost or delivery scheduling is required at this stage. Submit once to turn the same material record into an offer and open Market. The curated location list has limited demo coverage; incompatible combinations are not accepted.
3. **Market — `/market`:** see your own offers, material, quantity, location and status. There are currently no real buyer listings. The empty state says “Belum ada permintaan dari industri”; no sample companies or simulated matches are exposed. Open an offer's Impact report directly. Synthetic buyer fixtures exist only in automated tests. Earlier simulation records are retained privately for compatibility but have no public route and are not used as evidence of real impact.
4. **Transactions — within Market:** Track transaction creates a local prototype record for your own batch, not fictional industry demand. Existing quote, agreement, scheduling, receipt, completion/cancellation and reuse controls remain local and send no messages. Completion never fills reused quantity automatically.
5. **Reports — `/reports`:** classification, quality measurements, offered tonnes and location remain linked to the same material record. Collected, received and reused quantities stay separate. Blank is unknown; explicit zero is zero. Link a transaction explicitly to use its live receipt/reuse quantities, or enter a manual summary. Declare one wet/dry basis for actual quantities; do not combine incompatible weighing bases. The linked transaction's recorded destination use takes precedence over a different intended-use plan for emissions estimation. Generate creates an immutable snapshot. Quantity, quality, assumption and linked-transaction changes mark historical reports outdated; old PDF exports are explicitly labelled OUTDATED. PDFs include sources, dates, units, formulas, assumptions, missing inputs and the session scan photo when available.

### Material quality and optional emissions

Scan contains identification and visible observations, followed by **Offer this material**; it has no test-result forms. Photos do not produce numeric moisture, calorific value, ash content or certified grades. Unsupported provider claims are filtered on the server. Offering never requires test results; the material shows **Quality not yet tested** until results or evidence are recorded.

After creating an offer, open **Market → Material details → Add test results (optional)**. This section starts collapsed. Either attach a lab report/COA as evidence, enter measured moisture (%), calorific value (kcal/kg) and ash (%) manually, or do both. Use **one shared source, test date and evidence file** for this result; optional per-value mass bases remain available. Explicit confirmation is required before saving. Files are evidence only: this version does **not** run Gemini extraction or populate numeric fields from an uploaded document. Enter printed values manually and review them. A document-only save leaves every unentered value **Not measured**, not zero.

Market and Reports distinguish measured/user-confirmed test results from visible photo observations. Sources and files are not independently verified. Current and earlier evidence use private browser IndexedDB storage (5 MB per file, 50 MB total), not server uploads; earlier evidence is retained when a result is replaced. Existing records and historical reports remain readable. Changes to saved test results still mark linked report snapshots outdated without changing transaction or emissions formulas.

The optional **biomass-fuel** estimate becomes available after actual receipt and reuse are recorded. It requires the documented displaced baseline fuel/activity and quantity, an emission factor and source in **kg CO2e per selected baseline unit**, transport, processing and other project emissions in **kg CO2e**, their sources (including an explicit-zero rationale where appropriate), and boundary/displacement assumptions. Blank emissions are never treated as zero. For mass-based baseline units, the quantity and factor must declare the same wet/dry basis. No automatic wet/dry or energy-equivalence conversion is performed.

Baseline kg CO2e = baseline quantity × emission factor. Project kg CO2e = transport + processing + other project emissions. Provisional net kg CO2e = baseline − project; divide by 1,000 for tCO2e. Negative means an increase within the entered boundary. Required inputs missing or incompatible means **Not calculated**, with reasons. No fixed biomass-tonnage multiplier, default emissions factor, automatic credit price or monetary benefit is used. Biochar and compost remain separate, unavailable methodologies.

All estimation outputs are labelled **Preliminary estimate — not verified carbon credits.** These changes do not deploy or update a Cloud Run service.
5. **Profile — `/profile`:** optional role, business type and province/city are stored only in this browser, not an account or backend-connected identity. Home, Market, prominent Scan, Reports and Profile share desktop and mobile bottom navigation.

Older `/analyze`, `/exchange` and `/impact` links open Scan, Market and Reports. `/reports/legacy` also opens the clean Reports page. Raw legacy report text, simulated transactions and sample buyer names are not shown or exported.

Saving an offer does not contact a buyer or create a sale. There is no buyer onboarding, real inventory reservation or marketplace backend yet. Actual quantities are user-reported, not independently verified. Old simulated transaction quantities are never silently imported into the new Impact Estimation report.

Drafts, status history and demo records use browser local storage. Evidence file copies use browser IndexedDB, not server uploads, localStorage base64, or external storage. Supported types: JPEG, PNG, WebP, PDF, TXT and CSV; maximum 5 MB per file, five files per transaction and 50 MB in this browser. Attachments can be downloaded after reload or removed. Their existence is not verification of delivery, weighing or quality.

Pickup privacy is a **demonstration**, not production authorization: the supplier can edit their own address/pin, but the buyer preview hides those fields until both simulated parties agree and the transaction reaches agreed status. Cancellation hides them again. No pickup details are sent to a server or company. Dedicated private pickup fields are excluded from impact reports/downloads. With no accounts, this cannot enforce privacy between real people sharing a browser. A future real exchange requires authenticated parties, access controls and protected durable storage before accepting real private addresses.

Records and attachments remain on the same browser/origin only, not across users, devices or development/published domains. Clearing browser storage removes them. The reset action confirms deletion of local scans/offers/reports, supply, interest, impact, transaction and evidence data; profile has its own clear action. Storage failures show a warning; current-session data should not be assumed saved.

Photos are sent to Google for analysis. The resized scan photo is kept only in memory during the current app session so it can appear in the connected report and PDF. Reloading removes the photo; the saved material, offer and report history remain and show “Photo not available.” No photo bytes are placed in localStorage. No server database, login, payments, email delivery, live marketplace, external file storage or managed AI billing has been added.

The ESG summary is not certified, not a compliance report, and not proof of carbon credits. It makes no verified emissions or social-benefit claims. Provisional biomass-fuel results require a documented baseline, transport/processing/other emissions inventory (including applicable combustion), emission factor sources, actual receipt/reuse and compatible mass bases. Biomass is not automatically treated as carbon-neutral. An intended use is a plan, not evidence that reuse has happened.

## Configure Gemini

The API server reads `GEMINI_API_KEY` only on the server. Never add it to frontend code or a `VITE_` variable.

- **Replit:** add `GEMINI_API_KEY` under the project’s Secrets. The app will show a setup message if the secret is missing.
- **Local development:** provide `GEMINI_API_KEY` to the API server process through your local environment or a secret manager.
- **Google Cloud Run:** store the key in Google Secret Manager and expose it to the single runtime service as `GEMINI_API_KEY`. Do not bake it into an image or source file.

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

## Production: one Google Cloud Run service

The repository-root `Dockerfile` builds both workspace packages using Node.js 22
and pnpm 10.26.1, installing from the root `pnpm-lock.yaml` with
`--frozen-lockfile`. The final image contains only the bundled API and compiled
frontend, runs as the non-root `node` user, and starts **one Node process**.
There is no Vite server, pnpm process, reverse proxy, database, or Replit-managed
AI service in the runtime image.

- `POST /api/waste/analyze` remains the real server-side Google Gemini handler.
- `/api/healthz` returns `{"status":"ok"}`; it does not call Gemini.
- Unknown `/api/*` requests return an API 404, never the frontend.
- The same Express server serves the frontend and static photos. Direct visits
  to `/scan`, `/market`, `/reports`, and `/profile` serve the SPA entry.
- Hashed `/assets/*` files are cached immutably. The SPA entry is revalidated.
  Missing assets return 404 rather than HTML.
- The server listens on `0.0.0.0` using runtime `PORT`, falling back to `8080`,
  and handles Cloud Run's termination signal.
- `GEMINI_API_KEY` is a **runtime-only** environment variable. Do not use a Docker
  build argument, `VITE_` variable, committed `.env` file, or literal key in a
  command. Startup logs expose only `geminiApiKeyConfigured: true/false`.

### Build and verify locally

Run from the repository root with Docker installed. Cloud Run requires an
`linux/amd64` image; this also matters when building on an ARM laptop.

```sh
docker build --platform=linux/amd64 --tag waste2worth-ai:local .
docker run --detach --rm --name waste2worth-local \
  --publish 8080:8080 waste2worth-ai:local
node scripts/verify-cloud-run.mjs http://127.0.0.1:8080
docker stop waste2worth-local
```

If host port 8080 is occupied, use `--publish 18081:8080` and run the checker
against `http://127.0.0.1:18081`; the container still listens on 8080.
The checker verifies SPA deep links, JavaScript/photo delivery, asset caching,
health checks, analyze request validation, and API/SPA separation. It makes no
Gemini request and needs no key.

For an actual local photo analysis, first make `GEMINI_API_KEY` available in your
local shell using your own secure environment setup, then add
`--env GEMINI_API_KEY` to `docker run`. That passes the existing variable at
runtime without putting its value into the command or image. Without a key,
pages and health checks still work and photo analysis shows the existing setup
message. The health check is liveness, not proof of Gemini access or quota.

To run the same production build without Docker (Node.js 22 and pnpm 10.26.1):

```sh
pnpm install --frozen-lockfile
PORT=8080 BASE_PATH=/ NODE_ENV=production pnpm --filter @workspace/waste2worth-ai run build
NODE_ENV=production pnpm --filter @workspace/api-server run build
NODE_ENV=production PORT=8080 node --enable-source-maps artifacts/api-server/dist/index.mjs
# In another terminal:
node scripts/verify-cloud-run.mjs http://127.0.0.1:8080
```

### Google Cloud setup and deployment

These are **manual deployment instructions**, not commands automatically run by
this project. Cloud Build, Artifact Registry, Secret Manager, Cloud Run, and
Gemini may incur Google charges. Review billing and quotas before proceeding.
Use a billing-enabled Google Cloud project and an up-to-date `gcloud` CLI
(Google Cloud Shell is suitable). Initial setup requires project administration
permissions, including enabling APIs, creating service accounts, granting IAM
roles, and making the Cloud Run service public.

1. Set the project and region. Replace `YOUR_PROJECT_ID` with your project ID.
   `asia-southeast2` is Jakarta; choose a supported region appropriate for you.

   ```sh
   export PROJECT_ID="YOUR_PROJECT_ID"
   export REGION="asia-southeast2"
   export SERVICE="waste2worth-ai"
   export REPOSITORY="waste2worth"
   export SECRET_NAME="waste2worth-gemini-api-key"
   export RUNTIME_SA="waste2worth-runtime@${PROJECT_ID}.iam.gserviceaccount.com"
   export BUILD_SA="waste2worth-build@${PROJECT_ID}.iam.gserviceaccount.com"
   export IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${REPOSITORY}/${SERVICE}:$(date -u +%Y%m%d%H%M%S)"

   gcloud auth login
   gcloud config set project "$PROJECT_ID"
   gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
     artifactregistry.googleapis.com secretmanager.googleapis.com iam.googleapis.com
   ```

2. Create an image repository and separate build/runtime service accounts
   (one-time setup; reuse existing resources on later deployments).

   ```sh
   gcloud artifacts repositories create "$REPOSITORY" \
     --repository-format=docker --location="$REGION"
   gcloud iam service-accounts create waste2worth-runtime \
     --display-name="Waste2Worth runtime"
   gcloud iam service-accounts create waste2worth-build \
     --display-name="Waste2Worth image builder"
   gcloud projects add-iam-policy-binding "$PROJECT_ID" \
     --member="serviceAccount:${BUILD_SA}" \
     --role="roles/cloudbuild.builds.builder"
   ```

   The user submitting the build must be allowed to act as the build service
   account; the user deploying must be allowed to act as the runtime service
   account (`roles/iam.serviceAccountUser` on the respective account). Project
   owners generally have this permission; an organization administrator should
   grant it explicitly to a restricted deployer.

3. Create the Gemini secret:

   ```sh
   gcloud secrets create "$SECRET_NAME" --replication-policy=automatic
   ```

   In **Google Cloud Console → Secret Manager → waste2worth-gemini-api-key**,
   add a secret version containing your own Gemini API key using the secure
   console form. For a new secret, this is version **1**. Do not paste the value
   into GitHub, this README, Docker arguments, frontend settings, or chat.
   The Replit secret does not transfer to Google automatically.

   Grant only the runtime account access to this secret:

   ```sh
   gcloud secrets add-iam-policy-binding "$SECRET_NAME" \
     --member="serviceAccount:${RUNTIME_SA}" \
     --role="roles/secretmanager.secretAccessor"
   ```

4. From this repository's root, build and upload the image. The explicit ignore
   file excludes local dependencies, generated output, uploads, development
   tools, and secret files from the Cloud Build source upload as well as the
   Docker build context. No Gemini secret is available to the build account.

   ```sh
   gcloud builds submit . \
     --region="$REGION" \
     --ignore-file=.dockerignore \
     --service-account="projects/${PROJECT_ID}/serviceAccounts/${BUILD_SA}" \
     --default-buckets-behavior=regional-user-owned-bucket \
     --tag="$IMAGE"
   ```

5. Deploy **one public service**, injecting the versioned secret only at runtime:

   ```sh
   gcloud run deploy "$SERVICE" \
     --image="$IMAGE" \
     --region="$REGION" \
     --platform=managed \
     --allow-unauthenticated \
     --service-account="$RUNTIME_SA" \
     --port=8080 \
     --set-secrets="GEMINI_API_KEY=${SECRET_NAME}:1" \
     --cpu=1 --memory=512Mi \
     --concurrency=4 --timeout=120 \
     --min-instances=0 --max-instances=2
   ```

   Cloud Run supplies `PORT`; do not configure it as a secret. The 120-second
   service timeout accommodates the existing 90-second Gemini timeout.
   Public access can be blocked by organization IAM policies; an administrator
   must permit public invocation. Instance limits are not a spending cap or an
   API rate limiter: anyone reaching the public scan endpoint can consume Gemini
   quota. This preparation does not add authentication or rate limiting.

6. Obtain the assigned HTTPS URL and verify the deployed service:

   ```sh
   SERVICE_URL="$(gcloud run services describe "$SERVICE" --region="$REGION" \
     --format='value(status.url)')"
   node scripts/verify-cloud-run.mjs "$SERVICE_URL"
   ```

   Then open the URL, visit a deep link directly, and manually test one photo
   if desired. The automated checks deliberately do not spend Gemini quota.
   If analysis fails, review the safely redacted Cloud Run logs and the runtime
   account's secret access, Gemini API permissions, and quota. Never log the key.
   To rotate the key, add a new Secret Manager version and deploy a revision
   referencing its number instead of `:1`; do not rebuild with a key.

No Cloud Run deployment is performed by these changes. Development still uses
the existing two Replit workflows. Production uses the single container above.
Browser localStorage/IndexedDB records remain local to their origin: moving to
the Cloud Run URL does not transfer existing Replit browser records. Cloud Run's
ephemeral filesystem stores no offers, evidence, private pickup details, or scan
uploads. A shared multi-user exchange would require a separate secured storage
and authentication design, intentionally outside this deployment preparation.

References: [Cloud Run container contract](https://cloud.google.com/run/docs/container-contract),
[runtime secrets](https://cloud.google.com/run/docs/configuring/services/secrets),
[Cloud Build submit](https://cloud.google.com/sdk/gcloud/reference/builds/submit).
