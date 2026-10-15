# ShelfSense AI — the Firebase app

Astro + Vite + Tailwind CSS toolchain (one client-rendered page — no SSR by
design); Firebase from npm; hosting serves the built `dist/`.

The AI-powered smart retail assistant (AI Builder Cup 2026, Retail &
Commerce): single-file web app — shelf scanning (Gemini Vision / on-device
COCO-SSD), voice sales with composite notes, AI reorder forecasting, AI
business advisor, inventory management — now a Firebase app:

- **Auth**: anonymous sign-in (zero-friction, per-device identity)
- **Firestore**: state synced to `users/{uid}` — newest-wins on boot, live
  multi-device sync after; localStorage remains the offline fallback
- **Hosting**: deployed on Firebase (the cup's Google Cloud requirement)

## Deploy (10 minutes)

1. [console.firebase.google.com](https://console.firebase.google.com) →
   **Add project** → free tier is fine.
2. **Build → Authentication → Get started → Anonymous → Enable.**
3. **Build → Firestore Database → Create database** (production mode, any
   region — the rules below scope each user to their own doc).
4. **Project settings → Your apps → Web app (</>)** → copy the `firebaseConfig`
   object → paste it as `window.FIREBASE_CONFIG` in
   `src/pages/index.astro` (the `is:inline` script in `<head>`). Committing a web config is safe
   by design; restrict via the console's authorized domains if you like.
5. Paste the project id into `.firebaserc` (replace `YOUR_PROJECT_ID`).
6. Deploy:

       npm i -g firebase-tools   # once
       firebase login
       firebase deploy           # hosting + firestore rules

The deployed URL is the cup submission link.

## Build

    npm install
    npm run dev        # http://localhost:4321 (config empty = local-only)
    npm run build      # -> dist/  (firebase deploy ships this) For the demo: Settings → paste
a free Gemini API key (aistudio.google.com) to light up Gemini Vision shelf
scanning, AI voice parsing and the business advisor — the "Gen AI
Implementation" that is 40% of the judging.

## Dev

No build step — open `index.html`, or `npx serve .`. Without a Firebase
config the app runs local-only (the cloud pill stays hidden); with config
but no network it degrades to localStorage and says "Cloud offline".
