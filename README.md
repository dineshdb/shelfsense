# ShelfSense AI — your AI store employee

The AI-powered smart retail assistant (AI Builder Cup 2026, Retail &
Commerce): **shelf scanning** (Gemini Vision or local Gemma vision),
**receipt intake** (photograph a supplier receipt → editable delivery
lines → stock, cost prices and ledger), **voice sales** with composite
sentences ("2kg rice, 3 noodles" → two line items), **AI reorder
forecasting**, an **AI business advisor**, and full **inventory
management** — as one client-rendered page on Firebase.

Speaks English, Spanish, Hindi (हिन्दी) and Nepali (नेपाली) — Devanagari
script, Devanagari digits and romanized words all parse, and product
names match by meaning across languages (chini → Sugar, चामल → Rice,
अन्डा → Eggs). One sentence can mix intents ("5 kg rice sold and 12 eggs
arrived") — each bill line keeps its own Sold/Received. Every model
answer is validated before it touches stock; every stock change is an
auditable ledger entry.

## The AI backend — yours to pick, first run

The app opens with a setup wizard:

- **Google Gemini API** — paste a free [aistudio.google.com](https://aistudio.google.com)
  key. Cloud, works from any device; the key stays on your device.
- **Local Gemma / own server** — any OpenAI-compatible endpoint, e.g.
  `llama-server -hf google/gemma-4-e4a --port 8080` then `http://localhost:8080`.
  Fully offline AI. (ollama needs `OLLAMA_ORIGINS=*`; llama.cpp allows
  browser origins by default.)

One dispatcher fronts both backends — vision shelf scans, voice-command
parsing and the business advisor all follow the setting — and it's
swappable anytime in Settings. The model proposes, code disposes: every
answer is normalized and validated in pure, unit-tested functions before
it touches stock, and if the model is unreachable the advisor falls back
to built-in arithmetic. Gemma keeps the cup's "Gemini or Gemma" rule
honest either way.

### The one-port local mode (recommended for local Gemma)

`local/merve-cors-proxy.mjs` is a tiny node shim (launchd plist included)
that serves **the app and the AI on one origin**:

    node local/merve-cors-proxy.mjs    # http://localhost:8283

`/v1/*` forwards to a merve gateway (`127.0.0.1:8282`) with the CORS +
Private-Network headers browsers demand; everything else serves `dist/`.
Open `http://localhost:8283`, pick Local Gemma, base URL
`http://localhost:8283` — same origin as the AI, so no browser
(Firefox's Local Network Access, Chrome's PNA) can block the call. The
public https site + `http://localhost:8283` also works in Chrome-family
browsers; Firefox users should use the one-port mode (Firefox blocks
public→localhost calls outright). Thinking models are handled too: if a
server reasons before answering, the JSON is recovered from its
reasoning trace.

## Design

Wears the **Qreta design system** — the shared token block carried
verbatim from the house repos (shadcn-svelte preset `b4XecdV1gO`: Rhea
style, Mist base, Cyan theme; Inter body + Merriweather headings; radius
0.45rem) with light / dark / auto theming set before first paint.
Components are plain CSS over semantic tokens — no component library.

## Deploy (one command)

    npx firebase-tools login          # once — approve in the browser
    ./scripts/deploy-firebase.sh

The script is idempotent and does the whole chain: creates the project,
enables anonymous sign-in, registers the web app and wires its SDK config
into `src/pages/index.astro`, provisions Firestore, builds, deploys
hosting + security rules, and verifies the live URL.

One manual step on free (Spark) projects: first-time **Authentication →
Get started → Anonymous → Enable** in the console (the API gate for
first-time activation requires billing; the click doesn't).

### Autodeploy on push (GitHub Actions)

Every push to `main` builds and deploys hosting + Firestore rules, then
smoke-checks the live URL (`.github/workflows/deploy.yml`; also runnable
by hand via workflow_dispatch). One-time credential wiring — creates the
dedicated `shelfsense-deploy` service account, grants it Hosting + Rules
admin, and rotates its key into the
`FIREBASE_SERVICE_ACCOUNT_SHELFSENSE_DF2265` repo secret. Reuses the
firebase-tools session from above; needs `gh` logged in:

    ./scripts/setup-ci-deploy.sh

Re-running it rotates the key.

### Manual path

1. [console.firebase.google.com](https://console.firebase.google.com) →
   Add project → free tier is fine.
2. **Build → Authentication → Get started → Anonymous → Enable.**
3. **Build → Firestore Database → Create database** (production mode).
4. **Project settings → Your apps → Web app (</>)** → paste the
   `firebaseConfig` as `window.FIREBASE_CONFIG` in `src/pages/index.astro`.
   Committing a web config is safe by design; restrict via authorized
   domains if you like.
5. Put the project id in `.firebaserc`, then `firebase deploy`.

## Build & develop

    npm install
    npm run dev        # http://localhost:4321 (empty config = local-only)
    npm run build      # -> dist/  (firebase deploy ships this)
    npm run preview

## How the cloud sync works

Anonymous sign-in gives every device a zero-friction identity; the whole
store state lives in `users/{uid}` — newest-wins merge on boot, live
`onSnapshot` sync after, localStorage as the offline fallback. Firestore
rules scope each user to exactly their own doc:

    match /users/{uid} {
      allow read, write: if request.auth != null && request.auth.uid == uid;
    }
