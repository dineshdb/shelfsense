// ShelfSense AI — Core Constants & Configurations

export const DAY = 864e5;
export const KEY = "shelfsense_v1";

export const CAT = {
  Produce: "🥬",
  Fruits: "🍌",
  Vegetables: "🥕",
  Dairy: "🥛",
  Bakery: "🍞",
  Beverages: "🥤",
  Grains: "🌾",
  Pantry: "🥫",
  Snacks: "🍪",
  Household: "🧴",
  "Personal Care": "🧼",
  Meat: "🥩",
  Frozen: "🧊",
  Other: "📦",
};

export const NAME_EMOJI = [
  [/sugar|azucar/, "🍬"],
  [/rice|arroz/, "🍚"],
  [/milk|leche/, "🥛"],
  [/bread|\bpan\b/, "🍞"],
  [/egg|huevo/, "🥚"],
  [/oil|aceite/, "🫗"],
  [/cola|coke|soda/, "🥤"],
  [/banana|banano/, "🍌"],
  [/tomato|tomate/, "🍅"],
  [/pasta|spaghetti/, "🍝"],
  [/coffee|cafe/, "☕"],
  [/soap|jabon/, "🧼"],
  [/salt|\bsal\b/, "🧂"],
  [/bean|frijol/, "🫘"],
  [/apple|manzana/, "🍎"],
  [/orange|naranja/, "🍊"],
  [/water|agua/, "💧"],
  [/cheese|queso/, "🧀"],
  [/chicken|pollo/, "🍗"],
  [/carrot|zanahoria/, "🥕"],
  [/broccoli/, "🥦"],
  [/beer|cerveza/, "🍺"],
  [/chip|snack/, "🍟"],
];

export const UNITS = ["unit", "kg", "g", "L", "ml", "pack"];

export const MAX_SCAN_IMAGES = 5;

export const DEF = {
  storeName: "My Grocery Store",
  currency: "$",
  apiKey: "",
  model: "gemini-3.8-flash",
  aiMode: "gemini",
  aiProvider: "gemini",
  aiApiKey: "",
  aiBaseUrl: "",
  aiModel: "gemma-4-e4b",
  voiceEngine: "auto",
  setupDone: false,
  handsFreeEnabled: false,
  localAiEnabled: false,
  localAiModel: "gemma3-1b-it-q4f16_1-MLC",
  maxScanImages: 5,
  lang: "en-US",
  autoApply: true,
  speak: true,
  leadDays: 3,
  coverDays: 7,
  safetyDays: 2,
  windowDays: 28,
};

export const MODEL_GUIDE = {
  "gemini-3.8-flash": {
    name: "Gemini 3.8 Flash",
    tag: "⭐ Recommended · High Speed · Free Tier",
    cost: "Free tier eligible (15 RPM / 1,500 RPD) · ~$0.10 / 1M tokens",
    speed: "⚡⚡⚡ Very Fast (~0.8s)",
    useCase:
      "Best all-rounder for ShelfSense: real-time voice POS, camera shelf scan, and handwritten bills.",
  },
  "gemini-2.0-flash": {
    name: "Gemini 2.0 Flash",
    tag: "⚡ Ultra-Fast · Native Vision & Audio · Low Cost",
    cost: "Free tier eligible · ~$0.10 / 1M tokens",
    speed: "⚡⚡⚡⚡ Sub-second (~0.5s)",
    useCase:
      "Next-gen multimodal architecture with lightning fast latency. Great for camera & voice.",
  },
  "gemini-2.0-flash-lite": {
    name: "Gemini 2.0 Flash Lite",
    tag: "💸 Cheapest & Fastest · High Throughput",
    cost: "Lowest cost tier · ~$0.075 / 1M tokens",
    speed: "⚡⚡⚡⚡ Lightning Fast (<0.5s)",
    useCase:
      "Extremely lightweight and inexpensive. Ideal for high-frequency voice cashier billing.",
  },
  "gemini-1.5-flash": {
    name: "Gemini 1.5 Flash",
    tag: "🛡️ Battle-tested · 1M Context · Free Tier",
    cost: "Free tier eligible · ~$0.075 / 1M tokens",
    speed: "⚡⚡ Fast (~1.1s)",
    useCase:
      "Widely deployed, highly reliable for structured receipt OCR and multi-lingual voice translation.",
  },
  "gemini-1.5-flash-8b": {
    name: "Gemini 1.5 Flash 8B",
    tag: "📦 Micro Model · Budget Friendly",
    cost: "Ultra low cost · ~$0.0375 / 1M tokens",
    speed: "⚡⚡⚡ Very Fast",
    useCase: "Compact model designed for simple extractions and quick inventory lookups.",
  },
  "gemini-1.5-pro": {
    name: "Gemini 1.5 Pro",
    tag: "🧠 Deep Reasoning · 2M Context",
    cost: "Higher tier · ~$1.25 / 1M tokens",
    speed: "🐢 Moderate (~2.5s)",
    useCase:
      "Deep analytical synthesis: evaluating months of sales history and complex profit optimization.",
  },
  "gemini-3.8-pro": {
    name: "Gemini 3.8 Pro",
    tag: "🚀 Frontier Pro · Complex Audits",
    cost: "Premium tier",
    speed: "🐢 Complex Reasoning (~3s)",
    useCase:
      "Maximum intelligence for multi-page complex logistics documents and advanced predictive forecasting.",
  },
};

export const ICONS = {
  logo: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20.5" r="1.3"/><circle cx="17" cy="20.5" r="1.3"/><path d="M12 8.5l1 2 2 .4-1.5 1.4.4 2-1.9-1-1.9 1 .4-2-1.5-1.4 2-.4z" fill="currentColor" stroke="none"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/></svg>',
  scan: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="2"/></svg>',
  mic: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v4M8 21h8"/></svg>',
  stop: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="6" width="12" height="12" rx="3"/></svg>',
  box: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8M12 13v8"/></svg>',
  gear: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>',
  cart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 4h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.5L21 8H6.2"/><circle cx="10" cy="20.5" r="1.3"/><circle cx="17" cy="20.5" r="1.3"/></svg>',
  search:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="M21 21l-4.3-4.3"/></svg>',
};
