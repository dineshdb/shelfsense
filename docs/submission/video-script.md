# ShelfSense AI — demo video script (target 2:40)

Deliverable: <3 min, English, screen recording. Record at 1440p, cursor visible,
mic clean. One take per scene, stitch. Put the URL in the top corner from scene 2 on.

## Scene 1 — The problem (0:00–0:25)

- Screen: a cluttered paper stock register beside a shop counter (stock photo or
  staged notebook).
- VO: "Small grocery stores track stock on paper. It's slow, it drifts from
  reality, and reordering is guesswork. Shopkeepers don't have time for
  software with training manuals."
- On-screen text: "Manual stock tracking → shrinkage, stockouts, lost sales."

## Scene 2 — The product, 20 seconds in (0:25–0:55)

- Screen: the deployed ShelfSense URL loading for the first time — show the
  first-run **AI Backend setup** wizard.
- VO: "ShelfSense AI is a single-page store assistant. First run: pick your AI
  backend — Gemini in the cloud, or a local Gemma server for full offline
  privacy. Paste a key or a URL, hit Test — done."
- Do: choose Gemini, paste key, click Test & continue (show the green pass).

## Scene 3 — The core loop: speak, it stocks (0:55–1:40)

- Screen: dashboard → Stock tab.
- VO: "The core loop is a sentence. 'Sold 2 kilograms of rice and 3 packets of
  noodles.'"
- Do: type/speak that into the AI box. Show the parsed draft card(s) — two
  items, quantities, units — then Apply. Stock bars drop. Movement ledger shows
  both entries.
- VO (over the result): "One utterance, two line items — quantity, unit, and
  product resolved by Gemini with structured output, applied to inventory, and
  every move is a ledger entry you can audit."

## Scene 4 — Inventory management, not just a chat box (1:40–2:15)

- Screen: dashboard stats, product history, low-stock highlight.
- VO: "Around that loop: live stock levels with low-stock thresholds, per-product
  history, stock adjustments with reasons, and a CSV export for accountants."
- Do: open a product (history panel), adjust stock (+10 with note "new crate"),
  show dashboard numbers change; flip a sort chip.

## Scene 5 — Multi-device + the offline story (2:15–2:40)

- Screen: same URL on a phone-sized window; then the AI settings flipped to
  "Local Gemma server".
- VO: "State syncs live across devices through Firebase — anonymous auth, one
  doc per device, newest-wins merge. And because the AI backend is swappable,
  the same app runs against a local Gemma model — no cloud, no per-request
  cost, same structured results."
- Do: show the local-Gemma parse of "5 salt restocked" working.
- Closing card: repo URL + deployed URL + "Built with Gemini / Gemma, Firebase,
  Astro."

## Shot checklist

- [ ] Scene 2: blur/generate a throwaway API key — never show a real one in full
- [ ] Cursor: slow deliberate clicks; zoom (125%) on draft cards
- [ ] Total VO word budget ≈ 380 words
