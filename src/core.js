/* ShelfSense Core — pure functions, no DOM, no network: product matching,
   model-output normalization and sales analytics. Unit-tested in
   tests/core.test.mjs; the AI model proposes, these functions dispose. */

const DAY = 864e5;

const strip = (s) =>
  (s || "")
    .toString()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

// Cross-language product words → canonical English token, so a Hindi/Nepali
// answer ("दूध", "चिनी", "अन्डा") can land on the inventory entry.
const XL = {
  chini: "sugar",
  cheeni: "sugar",
  चिनी: "sugar",
  चीनी: "sugar",
  शक्खर: "sugar",
  shakkar: "sugar",
  chamal: "rice",
  चामल: "rice",
  chawal: "rice",
  चावल: "rice",
  bhaat: "rice",
  भात: "rice",
  doodh: "milk",
  dudh: "milk",
  दूध: "milk",
  दुध: "milk",
  leche: "milk",
  अन्डा: "egg",
  अंडा: "egg",
  अंडे: "egg",
  अन्डे: "egg",
  anda: "egg",
  ande: "egg",
  huevo: "egg",
  huevos: "egg",
  ब्रेड: "bread",
  पाउरोटी: "bread",
  pauroti: "bread",
  chiya: "tea",
  चिया: "tea",
  chai: "tea",
  चाय: "tea",
  te: "tea",
  nun: "salt",
  नुन: "salt",
  नमक: "salt",
  namak: "salt",
  sal: "salt",
  tel: "oil",
  तेल: "oil",
  aceite: "oil",
  dal: "lentils",
  दाल: "lentils",
  lenteja: "lentils",
  कोका: "cola",
  koka: "cola",
  कोकाकोला: "cola",
  gaseosa: "cola",
  kera: "banana",
  केरा: "banana",
  kela: "banana",
  केला: "banana",
  banana: "banana",
  platano: "banana",
  aloo: "tomato",
  alu: "tomato",
  आलु: "potato",
  आलू: "potato",
  patata: "potato",
  golbheda: "tomato",
  गोलभेडा: "tomato",
  टमाटर: "tomato",
  tamatar: "tomato",
  tomate: "tomato",
};
const xt = (t) => XL[t] || t;

const UNIT_RULES = [
  [/^(kilograms?|kilos?|kgs?|kilogramos?)$/, "kg"],
  [/^(grams?|grammes?|g|gr|grs|gramos?)$/, "g"],
  [/^(liters?|litres?|l|lts?|litros?)$/, "L"],
  [/^(milliliters?|millilitres?|ml|mililitros?)$/, "ml"],
  [/^(packs?|packets?|packages?|paquetes?|bags?|bolsas?|boxes?|cajas?)$/, "pack"],
  [
    /^(units?|pieces?|pcs|unidades?|bottles?|botellas?|cans?|latas?|loaves|loaf|bars?|barras?)$/,
    "unit",
  ],
  [/^(dozens?|docenas?)$/, "dozen"],
];
const STOP = new Set([
  "of",
  "de",
  "del",
  "the",
  "el",
  "la",
  "los",
  "las",
  "i",
  "we",
  "yo",
  "just",
  "have",
  "has",
  "been",
  "was",
  "were",
  "se",
  "please",
  "por",
  "favor",
  "for",
  "to",
  "customer",
  "cliente",
  "today",
  "hoy",
  "more",
  "mas",
  "stock",
  "inventory",
  "inventario",
  "some",
  "unos",
  "unas",
  "que",
  "and",
  "y",
  "with",
  "con",
  "en",
  "in",
  "it",
  "is",
  "are",
  "my",
  "mi",
  "al",
  "lo",
  "le",
  "les",
  "item",
  "items",
  "product",
  "producto",
  "plushalf",
]);

const unitOf = (tok) => {
  for (const [re, u] of UNIT_RULES) if (re.test(tok)) return u;
  return null;
};

function lev(a, b) {
  const m = a.length,
    n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++)
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}
const sim = (a, b) => {
  if (a === b) return 1;
  if (a.length > 3 && b.length > 3 && (a.startsWith(b) || b.startsWith(a))) return 0.9;
  return 1 - lev(a, b) / Math.max(a.length, b.length);
};
// \p{M} keeps Devanagari vowel signs attached — without it "चिनी" shatters
// into consonant fragments and the Devanagari keys in XL never match.
const toks = (s) =>
  strip(s)
    .replace(/[^\p{L}\p{N}\p{M}\s]/gu, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !/[\d०-९]/.test(t) && !STOP.has(t) && !unitOf(t))
    .map(xt);

function matchProduct(query, products = []) {
  const q = toks(query);
  if (!q.length || !products.length) return { product: null, score: 0 };
  let best = null,
    bestScore = 0;
  for (const p of products) {
    for (const cand of [p.name, ...(p.aliases || [])]) {
      const c = toks(cand);
      if (!c.length) continue;
      const recall = q.reduce((s, t) => s + Math.max(...c.map((x) => sim(t, x))), 0) / q.length;
      const prec = c.reduce((s, t) => s + Math.max(...q.map((x) => sim(t, x))), 0) / c.length;
      const sc = 0.65 * recall + 0.35 * prec;
      if (sc > bestScore) {
        bestScore = sc;
        best = p;
      }
    }
  }
  return { product: bestScore >= 0.62 ? best : null, score: bestScore };
}

function convertQty(qty, said, pu) {
  if (!said || said === pu) return qty;
  if (said === "dozen") return pu === "unit" ? qty * 12 : qty;
  if (said === "g" && pu === "kg") return qty / 1000;
  if (said === "kg" && pu === "g") return qty * 1000;
  if (said === "ml" && pu === "L") return qty / 1000;
  if (said === "L" && pu === "ml") return qty * 1000;
  return qty;
}

/* Normalize a model's command-parse answer into bill lines. Anything the
   model gets wrong (shape, units, quantities, product names) degrades to a
   safe value here — never into a thrown error or a bad stock write. */
const VALID_UNITS = new Set(["unit", "kg", "g", "L", "ml", "pack", "dozen"]);
function normalizeModelParse(r, text, products) {
  const defIntent = r && r.intent === "restock" ? "restock" : "sale";
  const raw = r && Array.isArray(r.items) ? r.items : [];
  const items = raw.map((it) => {
    it = it && typeof it === "object" ? it : {};
    const p =
      (typeof it.product === "string" && products.find((x) => x.name === it.product)) ||
      (it.product && matchProduct(it.product, products).product) ||
      (it.heard && matchProduct(it.heard, products).product);
    const q = +it.qty;
    return {
      intent: it.intent === "restock" ? "restock" : it.intent === "sale" ? "sale" : defIntent,
      query: it.heard || it.product || "?",
      qty: q > 0 ? q : 1,
      unit: VALID_UNITS.has(it.unit) ? it.unit : null,
      productId: p ? p.id : null,
    };
  });
  return { text, intent: defIntent, items };
}

function dailySeries(moves, days, now = Date.now()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  const out = [];
  for (let i = days - 1; i >= 0; i--) {
    const d0 = start.getTime() - i * DAY,
      d1 = d0 + DAY;
    const rev = moves
      .filter((m) => m.type === "sale" && m.ts >= d0 && m.ts < d1)
      .reduce((s, m) => s + (m.total || 0), 0);
    out.push({
      label: new Date(d0).toLocaleDateString(undefined, { month: "short", day: "numeric" }),
      value: +rev.toFixed(2),
    });
  }
  return out;
}

function analyze(products, moves, s, now = Date.now()) {
  const sales = moves.filter((m) => m.type === "sale");
  const first = sales.length ? Math.min(...sales.map((m) => m.ts)) : now;
  const windowDays = Math.max(1, Math.min(s.windowDays || 28, Math.floor((now - first) / DAY) + 1));
  const lead = +s.leadDays || 0,
    cover = +s.coverDays || 0,
    safety = +s.safetyDays || 0;
  const rows = products.map((p) => {
    const ps = sales.filter((m) => m.productId === p.id);
    const win = ps.filter((m) => m.ts >= now - windowDays * DAY);
    const last7 = ps.filter((m) => m.ts >= now - 7 * DAY);
    const sold = win.reduce((a, m) => a + m.qty, 0);
    const qty7 = last7.reduce((a, m) => a + m.qty, 0);
    const rev7 = last7.reduce((a, m) => a + (m.total || 0), 0);
    const revWin = win.reduce((a, m) => a + (m.total || 0), 0);
    const avgDaily = sold / windowDays;
    const recentDaily = qty7 / Math.min(7, windowDays);
    const daysLeft = avgDaily > 0 ? p.stock / avgDaily : Infinity;
    const lastSale = ps.length ? Math.max(...ps.map((m) => m.ts)) : null;
    const rop =
      p.minStock !== null && p.minStock !== undefined && p.minStock !== ""
        ? +p.minStock
        : avgDaily * (lead + safety);
    const target = avgDaily * (lead + cover + safety);
    let reorderQty = Math.ceil(Math.max(0, target - p.stock));
    let status = "ok";
    if (p.stock <= 0) status = "out";
    else if (p.stock <= rop && (avgDaily > 0 || rop > 0)) status = "low";
    // "slow" needs 14 days on the shelf — a product added yesterday simply
    // hasn't had the chance to sell yet
    else if (
      ((!lastSale || now - lastSale > 14 * DAY) && now - (p.createdAt || 0) > 14 * DAY) ||
      (avgDaily > 0 && daysLeft > 60)
    )
      status = "slow";
    if ((status === "low" || status === "out") && reorderQty === 0)
      reorderQty = Math.max(1, Math.ceil(rop - p.stock + 1));
    const trend = avgDaily > 0 ? (recentDaily - avgDaily) / avgDaily : 0;
    return {
      id: p.id,
      p,
      sold,
      qty7,
      rev7,
      revWin,
      avgDaily,
      recentDaily,
      daysLeft,
      lastSale,
      rop,
      reorderQty,
      status,
      trend,
      reorderCost: reorderQty * (p.cost || p.price * 0.75 || 0),
    };
  });
  return { windowDays, rows };
}

export const Core = { strip, matchProduct, convertQty, normalizeModelParse, analyze, dailySeries };
