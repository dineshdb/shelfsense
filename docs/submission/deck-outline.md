# ShelfSense AI — PDF deck outline (10 slides)

Export at 16:9. Judge rubric mapping noted per slide (GenAI 40 · Problem 25 ·
Innovation 25 · UX 10).

## 1. Title

ShelfSense AI — the AI stock clerk for small grocery stores.
Team · track · deployed URL · repo URL.

## 2. Problem (Problem/Impact)

Paper registers drift from reality. Stockouts and dead stock both cost margin;
owners reconcile weekly from memory. (One stat or two quotes from shopkeeper
conversations if available.)

## 3. Solution in one sentence (Problem/Impact)

"Say what sold — ShelfSense updates inventory, keeps the audit trail, and tells
you what to reorder."

## 4. How the GenAI works — THE rubric slide (GenAI 40)

- Gemini (cloud) **or** Gemma (local, OpenAI-compatible) — user picks at setup.
- One utterance → structured JSON: action, per-item product/qty/unit —
  schema-constrained output, deterministic validation, fuzzy product match with
  Nepali aliases (chini→Sugar, bhat→Rice) behind the model.
- Composite sentences: "2kg rice, 3 noodles" → two line items, one apply.
- Receipt intake: one photo of a supplier receipt → delivery lines
  (qty, unit cost) the owner confirms; stock, cost prices and the ledger
  update together. Same vision dispatcher, same validation.
- Every model answer is validated before it touches stock; the model proposes,
  the ledger disposes.

## 5. Architecture (GenAI + Innovation)

Single Astro/Vite page → Firebase Hosting; anonymous auth + Firestore sync
(newest-wins merge, live onSnapshot); swappable AI dispatcher (Gemini native ↔
local OpenAI-compatible); model output is normalized and validated by unit-
tested pure functions before it touches stock; the advisor alone keeps a
built-in offline fallback.

## 6. Why it's different (Innovation 25)

- Setup-first, key-in-user's-hands (no vendor lock-in, no embedded secrets).
- One app, two AI worlds: cloud Gemini for scale, local Gemma for
  privacy/offline/zero marginal cost.
- Ledger, not mutation: every stock change is an auditable movement with a reason.

## 7. UX walkthrough (UX 10)

4–5 screenshots: setup wizard → dashboard → one-shot voice/text sale →
low-stock view → CSV export.

## 8. Impact & market (Problem/Impact)

SMB grocery density in South Asia; low end of market has no software at all;
runs on a decade-old phone browser; data per device, exportable.

## 9. Roadmap

Voice-native flow, Nepali ASR, multi-store roll-ups, supplier reorder
drafts. (Receipt-scan intake shipped — see slide 4.)

## 10. What's built today

Live URL + QR, repo link, stack badges, 30-second demo loop GIF.
