/* Unit tests for ShelfSense Core (src/core.js) — pure functions only.
   The model is never tested (non-deterministic); everything AROUND it is:
   product matching, unit conversion, model-output normalization and the
   reorder analytics. Run: npm test */
import test from "node:test";
import assert from "node:assert/strict";
import { Core } from "../src/core.js";

const DAY = 864e5;
const PRODUCTS = [
  {
    id: "p1",
    name: "Sugar",
    aliases: ["azucar", "white sugar"],
    unit: "kg",
    stock: 10,
    price: 1.1,
    cost: 0.8,
    minStock: null,
  },
  {
    id: "p2",
    name: "Whole Milk 1L",
    aliases: ["milk", "leche"],
    unit: "unit",
    stock: 7,
    price: 1.25,
    cost: 0.9,
    minStock: null,
  },
  {
    id: "p3",
    name: "Coca-Cola 600ml",
    aliases: ["coke", "soda"],
    unit: "unit",
    stock: 40,
    price: 1.0,
    cost: 0.65,
    minStock: null,
  },
  {
    id: "p4",
    name: "Potato",
    aliases: ["potatoes"],
    unit: "kg",
    stock: 25,
    price: 0.8,
    cost: 0.5,
    minStock: null,
  },
  {
    id: "p5",
    name: "Tomato",
    aliases: ["tomatoes"],
    unit: "kg",
    stock: 15,
    price: 1.5,
    cost: 1.0,
    minStock: null,
  },
];
const sale = (productId, daysAgo, qty, price = 1) => ({
  id: "m" + Math.random().toString(36).slice(2),
  productId,
  type: "sale",
  qty,
  delta: -qty,
  unitPrice: price,
  total: +(qty * price).toFixed(2),
  ts: Date.now() - daysAgo * DAY,
  source: "test",
});

/* ---------- matchProduct ---------- */
test("matchProduct: exact name, units and numbers in the query are ignored", () => {
  assert.equal(Core.matchProduct("2 kg Sugar", PRODUCTS).product.id, "p1");
  assert.equal(Core.matchProduct("3 bread sold").product, null); // empty inventory
});
test("matchProduct: aliases hit (English and Spanish)", () => {
  assert.equal(Core.matchProduct("azucar", PRODUCTS).product.id, "p1");
  assert.equal(Core.matchProduct("leche", PRODUCTS).product.id, "p2");
  assert.equal(Core.matchProduct("coke", PRODUCTS).product.id, "p3");
});
test("matchProduct: cross-language tokens (romanized and Devanagari) land on the product", () => {
  assert.equal(Core.matchProduct("chini", PRODUCTS).product.id, "p1");
  assert.equal(Core.matchProduct("चिनी", PRODUCTS).product.id, "p1");
  assert.equal(Core.matchProduct("doodh", PRODUCTS).product.id, "p2");
  assert.equal(Core.matchProduct("aloo", PRODUCTS).product.id, "p4");
  assert.equal(Core.matchProduct("alu", PRODUCTS).product.id, "p4");
  assert.equal(Core.matchProduct("आलु", PRODUCTS).product.id, "p4");
  assert.equal(Core.matchProduct("tamatar", PRODUCTS).product.id, "p5");
  assert.equal(Core.matchProduct("golbheda", PRODUCTS).product.id, "p5");
});
test("matchProduct: barcode matches deterministically with score 1.0", () => {
  const prods = [{ id: "pb1", name: "Heinz Ketchup", barcode: "013000006408", aliases: [], unit: "unit" }];
  const res = Core.matchProduct("013000006408", prods);
  assert.equal(res.product?.id, "pb1");
  assert.equal(res.score, 1.0);
});
test("matchProduct: typos still match, unrelated words do not", () => {
  assert.equal(Core.matchProduct("suger", PRODUCTS).product.id, "p1");
  const r = Core.matchProduct("laptop", PRODUCTS);
  assert.equal(r.product, null);
  assert.ok(r.score < 0.62);
});
test("matchProduct: empty query or inventory is a safe no-match", () => {
  assert.equal(Core.matchProduct("sold 2 kg", PRODUCTS).product, null);
  assert.equal(Core.matchProduct("sugar", []).product, null);
});

/* ---------- convertQty ---------- */
test("convertQty: weight and volume conversions", () => {
  assert.equal(Core.convertQty(2, "kg", "g"), 2000);
  assert.equal(Core.convertQty(2000, "g", "kg"), 2);
  assert.equal(Core.convertQty(500, "ml", "L"), 0.5);
  assert.equal(Core.convertQty(1.5, "L", "ml"), 1500);
});
test("convertQty: dozen expands to units, same/unknown units pass through", () => {
  assert.equal(Core.convertQty(1, "dozen", "unit"), 12);
  assert.equal(Core.convertQty(2, "kg", "kg"), 2);
  assert.equal(Core.convertQty(2, null, "kg"), 2);
  assert.equal(Core.convertQty(3, "pack", "unit"), 3); // incompatible → unchanged
});

/* ---------- normalizeModelParse ---------- */
const SETTING = { windowDays: 28, leadDays: 3, coverDays: 7, safetyDays: 2 };
test("normalizeModelParse: per-item intents, verbatim names, heard-fallback matching", () => {
  const r = {
    intent: "sale",
    items: [
      { intent: "restock", product: "Sugar", heard: "cheeni", qty: 2, unit: "kg" },
      { product: "Nonexistent Brand 500g", heard: "coke", qty: "3", unit: "dozen" },
    ],
  };
  const P = Core.normalizeModelParse(r, "2kg sugar received and 3 dozen coke sold", PRODUCTS);
  assert.equal(P.intent, "sale");
  assert.equal(P.items[0].intent, "restock");
  assert.equal(P.items[0].productId, "p1");
  assert.equal(P.items[0].query, "cheeni");
  assert.equal(P.items[1].intent, "sale"); // falls back to the command-level intent
  assert.equal(P.items[1].productId, "p3"); // matched via the "heard" words
  assert.equal(P.items[1].qty, 3);
  assert.equal(P.items[1].unit, "dozen");
});
test("normalizeModelParse: extracts customer name and khata/credit paymentMode", () => {
  const r = {
    customer: "Ramesh Kumar",
    paymentMode: "khata",
    items: [
      { intent: "sale", product: "Sugar", heard: "cheeni", qty: 2, unit: "kg" },
    ],
  };
  const P = Core.normalizeModelParse(r, "Ramesh ko 2 kg cheeni udhaar likho", PRODUCTS);
  assert.equal(P.customer, "Ramesh Kumar");
  assert.equal(P.paymentMode, "khata");
  assert.equal(P.items[0].productId, "p1");
});
test("normalizeModelParse: garbage from the model degrades, never throws", () => {
  const P = Core.normalizeModelParse(
    {
      items: [{ intent: "weird", product: "milk", qty: -5, unit: "pounds" }, null, { qty: "two" }],
    },
    "x",
    PRODUCTS,
  );
  assert.equal(P.items[0].intent, "sale");
  assert.equal(P.items[0].qty, 1); // negative/NaN → 1
  assert.equal(P.items[0].unit, null); // invalid unit → null
  assert.equal(P.items[0].productId, "p2");
  assert.equal(P.items[2].qty, 1);
});
test("normalizeModelParse: missing/broken answers produce zero items", () => {
  assert.deepEqual(Core.normalizeModelParse(null, "x", PRODUCTS).items, []);
  assert.deepEqual(Core.normalizeModelParse({ items: "three" }, "x", PRODUCTS).items, []);
  assert.deepEqual(Core.normalizeModelParse({}, "x", PRODUCTS).items, []);
  assert.equal(
    Core.normalizeModelParse({ intent: "restock", items: [] }, "x", PRODUCTS).intent,
    "restock",
  );
});

/* ---------- analyze ---------- */
test("analyze: steady 1/day seller with healthy stock needs a top-up of cover+lead+safety−stock", () => {
  const moves = Array.from({ length: 28 }, (_, i) => sale("p1", i, 1));
  const a = Core.analyze(PRODUCTS, moves, SETTING);
  const r = a.rows.find((x) => x.id === "p1");
  assert.equal(a.windowDays, 28);
  assert.equal(r.avgDaily.toFixed(2), "1.00");
  assert.equal(r.status, "ok");
  assert.equal(r.reorderQty, Math.ceil(12 - 10)); // target 1*(3+7+2)=12, stock 10
});
test("analyze: minStock override flags low even with soft sales", () => {
  const ps = [{ ...PRODUCTS[1], minStock: 20 }];
  const moves = Array.from({ length: 20 }, (_, i) => sale("p2", i, 0.5));
  const r = Core.analyze(ps, moves, SETTING).rows[0];
  assert.equal(r.rop, 20);
  assert.equal(r.status, "low");
});
test("analyze: out of stock always proposes at least 1 to reorder", () => {
  const ps = [{ ...PRODUCTS[0], stock: 0 }];
  const r = Core.analyze(ps, [], SETTING).rows[0];
  assert.equal(r.status, "out");
  assert.ok(r.reorderQty >= 1);
});
test("analyze: products with no recent sales are slow movers", () => {
  const moves = [sale("p3", 20, 2)];
  const r = Core.analyze(PRODUCTS, moves, SETTING).rows.find((x) => x.id === "p3");
  assert.equal(r.status, "slow");
});
test("analyze: a product added yesterday is not a slow mover yet", () => {
  const ps = [{ ...PRODUCTS[0], createdAt: Date.now() - 2 * DAY }];
  const r = Core.analyze(ps, [], SETTING).rows[0];
  assert.equal(r.status, "ok");
});
test("analyze: sales window clamps to the observed history", () => {
  const moves = [sale("p1", 3, 5)];
  const a = Core.analyze(PRODUCTS, moves, { ...SETTING, windowDays: 28 });
  assert.equal(a.windowDays, 4); // first sale 3 days ago → 4 days of history
});

/* ---------- dailySeries ---------- */
test("dailySeries: one sale lands on today\u2019s bucket", () => {
  const s = Core.dailySeries([sale("p1", 0, 2, 2.5)], 14);
  assert.equal(s.length, 14);
  assert.equal(s[13].value, 5);
  assert.equal(s[12].value, 0);
});

/* ---------- localCommandParse ---------- */
test("localCommandParse: parses simple English numeric product and quantity ('2 sugar')", () => {
  const res = Core.localCommandParse("2 sugar", PRODUCTS);
  assert.equal(res.items.length, 1);
  assert.equal(res.items[0].qty, 2);
  assert.equal(res.items[0].productId, "p1");
  assert.equal(res.paymentMode, "cash");
});

test("localCommandParse: parses Hindi/Hinglish with fractions and XL aliases ('aadha kilo shakkar')", () => {
  const res = Core.localCommandParse("aadha kilo shakkar", PRODUCTS);
  assert.equal(res.items.length, 1);
  assert.equal(res.items[0].qty, 0.5);
  assert.equal(res.items[0].unit, "kg");
  assert.equal(res.items[0].productId, "p1"); // "shakkar" -> "sugar" -> p1
});

test("localCommandParse: extracts customer and khata payment mode ('sold 2 milk to Ramesh on credit')", () => {
  const res = Core.localCommandParse("sold 2 milk to Ramesh on credit", PRODUCTS);
  assert.equal(res.customer, "Ramesh");
  assert.equal(res.paymentMode, "khata");
  assert.equal(res.items.length, 1);
  assert.equal(res.items[0].qty, 2);
  assert.equal(res.items[0].productId, "p2");
});

test("localCommandParse: parses multi-item sentences ('2 sugar and 1 milk')", () => {
  const res = Core.localCommandParse("2 sugar and 1 milk", PRODUCTS);
  assert.equal(res.items.length, 2);
  assert.equal(res.items[0].qty, 2);
  assert.equal(res.items[0].productId, "p1");
  assert.equal(res.items[1].qty, 1);
  assert.equal(res.items[1].productId, "p2");
});

test("localCommandParse: handles Hindi word numbers ('do doodh')", () => {
  const res = Core.localCommandParse("do doodh", PRODUCTS);
  assert.equal(res.items.length, 1);
  assert.equal(res.items[0].qty, 2);
  assert.equal(res.items[0].productId, "p2"); // "doodh" -> "milk" -> p2
});

