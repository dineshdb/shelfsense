// ShelfSense AI — Multimodal AI Client (Gemini & Local Gemma / Custom / WebLLM)
import { CAT } from "./constants.js";
import { S, set, save } from "./state.js";
import { toast } from "./utils.js";
import { isLocalEngineReady, webllmParseVoiceCommand } from "./webllm.js";

// Which remote transport the settings point at. gemini/vertex speak Google's
// generateContent shape; openrouter/custom speak OpenAI chat-completions.
// Legacy sessions have no aiProvider — derive it from the old aiMode flag.
export const remoteProvider = () =>
  set().aiProvider || (set().aiMode === "custom" ? "custom" : "gemini");

export const remoteReady = () => {
  const p = remoteProvider();
  if (p === "openrouter") return !!set().aiApiKey; // OpenRouter auths every call with the user's key
  if (p === "custom") return !!set().aiBaseUrl;
  return !!set().apiKey; // gemini | vertex
};

export const aiReady = () => remoteReady() || isLocalEngineReady();

// The label reflects the EXPLICIT backend selection, not whichever engine
// happens to be loaded. A selected remote backend stays "remote" even if the
// on-device model is cached/loaded; the on-device model only shows when the
// user actually chose it (localAiEnabled).
export const aiLabel = () =>
  set().localAiEnabled
    ? "On-Device AI"
    : remoteProvider() === "openrouter"
      ? set().aiModel || OPENROUTER_MODEL
      : remoteProvider() === "vertex"
        ? "Vertex AI"
        : remoteProvider() === "custom"
          ? `Local ${set().aiModel}`
          : "Gemini AI";

export const fetchT = (url, opts, ms = 90000) => {
  return fetch(url, { ...opts, signal: AbortSignal.timeout(ms) }).catch((e) => {
    throw new Error(
      e && (e.name === "TimeoutError" || /timed?\s?out/i.test(e.message || ""))
        ? "AI backend timed out — try again"
        : e.message || String(e),
    );
  });
};

// Connectivity probe: uses the SELECTED model so a green test means the model
// the owner actually picked works. Google transports force Gemini Flash, and
// custom endpoints answer a model-less /v1/models ping.
export async function testConnection() {
  const p = remoteProvider();
  if (p === "openrouter") {
    // Test the chosen model (like aiCustom does), falling back to the pinned
    // default only if the selection isn't in the proxy's allow-list.
    const model = OPENROUTER_MODELS.includes(set().aiModel) ? set().aiModel : OPENROUTER_MODEL;
    const r = await fetchT(OPENROUTER_PROXY + "/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(set().aiApiKey ? { Authorization: "Bearer " + set().aiApiKey } : {}),
      },
      body: JSON.stringify({ model, max_tokens: 1, messages: [{ role: "user", content: "hi" }] }),
    });
    if (!r.ok) throw new Error("HTTP " + r.status + ": " + (await r.text()).slice(0, 140));
    return "ok";
  }
  if (p === "custom") {
    const base = (set().aiBaseUrl || "").replace(/\/+$/, "").replace(/\/v1\/?$/, "");
    if (!base) throw new Error("Enter the server URL first");
    const r = await fetchT(base + "/v1/models", {
      headers: set().aiApiKey ? { Authorization: "Bearer " + set().aiApiKey } : {},
    });
    if (!r.ok)
      throw new Error(
        "Server responded HTTP " +
          r.status +
          " — check the URL" +
          (set().aiApiKey ? " and key" : ""),
      );
    return "ok";
  }
  if (p === "gemini") {
    if (!set().apiKey) throw new Error("Paste your Google AI key first");
    const r = await fetchT(
      `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(set().apiKey)}`,
    );
    if (!r.ok) throw new Error("Google rejected the key (HTTP " + r.status + ")");
    return "ok";
  }
  // vertex: express mode has no key-authed model list — minimal Flash probe
  return !!(await gemini([{ text: 'Reply with JSON {"ok":true}' }], true, MULTIMODAL_MODEL));
}

// The app is public, so OpenRouter is never called from the browser —
// requests go through this stateless proxy, which enforces this model list
// and forwards the caller's key per request without storing anything.
const OPENROUTER_PROXY = "https://shelfsense-ai-proxy.dineshdb.workers.dev";
export const OPENROUTER_MODEL = "google/gemma-4-26b-a4b-it:free";
export const OPENROUTER_MODELS = [
  OPENROUTER_MODEL,
  "google/gemma-4-31b-it:free",
  "google/gemini-3.8-flash",
  "google/gemini-3.7-flash",
  "google/gemini-3.6-flash",
  "google/gemini-3.5-flash",
  "google/gemini-3.5-flash-lite",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
];
// Only Gemini Flash takes photos/audio; every other backend is text-only.
export const MULTIMODAL_MODEL = "gemini-3.8-flash";

export async function aiCustom(parts, json = true) {
  const p = remoteProvider();
  const base =
    p === "openrouter"
      ? OPENROUTER_PROXY
      : (set().aiBaseUrl || "").replace(/\/+$/, "").replace(/\/v1\/?$/, "");
  if (!base) throw new Error("No server URL configured — Settings → AI backend");
  const content = [];
  let text = "";
  for (const part of parts) {
    if (part && part.inline_data) {
      content.push({
        type: "image_url",
        image_url: { url: `data:${part.inline_data.mime_type};base64,${part.inline_data.data}` },
      });
    } else if (part && part.audio) {
      content.push({ type: "input_audio", input_audio: { data: part.audio.data, format: "wav" } });
    } else {
      text += ((part && part.text) || String(part ?? "")) + "\n";
    }
  }
  content.unshift({
    type: "text",
    text: text.trim() + (json ? "\nAnswer ONLY with JSON. No prose, no code fences." : ""),
  });

  const key = set().aiApiKey;
  const r = await fetchT(base + "/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(key ? { Authorization: "Bearer " + key } : {}),
    },
    body: JSON.stringify({
      model:
        p === "openrouter"
          ? OPENROUTER_MODELS.includes(set().aiModel)
            ? set().aiModel
            : OPENROUTER_MODEL
          : set().aiModel,
      temperature: json ? 0.2 : 0.5,
      messages: [{ role: "user", content }],
    }),
  });

  if (!r.ok) throw new Error("local AI HTTP " + r.status + ": " + (await r.text()).slice(0, 150));
  const d = await r.json();
  const m0 = (d.choices || [])[0]?.message || {};
  let t = (m0.content ?? "").trim();
  if (!t && m0.reasoning_content) {
    t = (m0.reasoning_content.match(/\{[\s\S]*\}/) || [""])[0].trim();
  }
  if (!t) throw new Error("local AI returned no content");
  return json ? JSON.parse(t.replace(/```json|```/g, "").trim()) : t;
}

export async function gemini(parts, json = true, modelOverride = null) {
  parts = parts.map((p) =>
    p && p.audio ? { inline_data: { mime_type: "audio/wav", data: p.audio.data } } : p,
  );
  // Photos/audio need a Flash-class model: a selected Flash model serves
  // them directly (openrouter Flash rides the proxy), otherwise force the
  // Gemini API default — Gemma and custom endpoints are text-only.
  const multimodal = parts.some((p) => p && p.inline_data);
  let p = remoteProvider();
  let forced = false;
  if (multimodal) {
    const selected = p === "openrouter" ? set().aiModel || "" : set().model || "";
    const selectedIsFlash =
      p === "openrouter"
        ? OPENROUTER_MODELS.includes(selected) && /flash/i.test(selected)
        : /flash/i.test(selected);
    if (p === "openrouter" && selectedIsFlash) return aiCustom(parts, json);
    if (!selectedIsFlash) {
      p = "gemini";
      forced = true;
    }
  }
  if (!multimodal && (p === "openrouter" || p === "custom")) return aiCustom(parts, json);

  const model = encodeURIComponent(
    forced ? MULTIMODAL_MODEL : modelOverride || set().model || MULTIMODAL_MODEL,
  );
  let url,
    headers = { "Content-Type": "application/json" };
  if (p === "vertex") {
    if (!set().apiKey)
      throw new Error("No Vertex AI express key configured — Settings → AI backend");
    // Vertex AI in express mode: same generateContent shape, API-key auth.
    url = `https://aiplatform.googleapis.com/v1/publishers/google/models/${model}:generateContent`;
    headers["x-goog-api-key"] = set().apiKey;
  } else {
    if (!set().apiKey)
      throw new Error(
        multimodal
          ? "Photos and voice need a (free) Gemini API key — Settings → AI backend → Google Gemini"
          : "No AI backend configured",
      );
    url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(set().apiKey)}`;
  }
  const r = await fetchT(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      contents: [{ role: "user", parts }],
      generationConfig: json
        ? { responseMimeType: "application/json", temperature: 0.2 }
        : { temperature: 0.5 },
    }),
  });

  if (!r.ok) {
    let m = "HTTP " + r.status;
    try {
      m = (await r.json()).error.message;
    } catch (e) {}
    throw new Error("Gemini: " + m);
  }

  const d = await r.json();
  const t = (d.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
  return json ? JSON.parse(t.replace(/```json|```/g, "").trim()) : t.trim();
}

export async function aiTranscribe(wavB64, lang) {
  const engine = set().voiceEngine || "auto";
  if (engine === "gemma") {
    throw new Error(
      "Cloud transcription disabled in ⚡ Gemma ($0) mode. Please use Web Speech in Chrome/Edge or type command.",
    );
  }
  const langName = (lang || "").startsWith("ne")
    ? "Nepali"
    : (lang || "").startsWith("hi")
      ? "Hindi"
      : (lang || "").startsWith("es")
        ? "Spanish"
        : "";
  const prompt = `Transcribe this audio recording exactly as spoken, keeping the original language${langName ? " — it is " + langName : ""}. Output only the transcript text and nothing else.`;
  return (await gemini([{ text: prompt }, { audio: { data: wavB64 } }], false)).trim();
}

/**
 * Resolves active voice engine mode based on store settings and network conditions.
 */
export function resolveVoiceEngine() {
  const engine = set().voiceEngine || "auto";
  const onDevice = isLocalEngineReady();
  const isOnline = typeof navigator === "undefined" || navigator.onLine !== false;

  // Explicit voice-engine picks win.
  if (engine === "gemma") {
    const label = onDevice ? "On-Device Mobile AI ($0 Cost)" : "Local Gemma ($0 Cost)";
    return { engine: "gemma", label, isOffline: true };
  }
  if (engine === "gemini") return { engine: "gemini", label: "Gemini Cloud Pro", isOffline: false };

  // 'auto': use a ready remote backend as-is — it is never silently swapped for
  // the on-device model. The on-device model only wins when it is actually
  // LOADED and the owner explicitly chose On-Device; otherwise a configured
  // remote backend is used (fixes audio/voice falling to "Local Gemma not
  // configured" just because localAiEnabled was set but the model wasn't loaded).
  if (isOnline && remoteReady()) {
    if (set().localAiEnabled && onDevice) {
      return { engine: "gemma", label: "Smart Auto · On-Device AI", isOffline: false };
    }
    const p = remoteProvider();
    const label =
      "Smart Auto · " +
      (p === "custom"
        ? `Local ${set().aiModel}`
        : p === "openrouter"
          ? set().aiModel || OPENROUTER_MODEL
          : p === "vertex"
            ? "Vertex AI"
            : "Gemini Cloud");
    return { engine: "gemini", label, isOffline: false };
  }
  const label = onDevice ? "Smart Auto · On-Device AI" : "Smart Auto · Local Gemma";
  return { engine: "gemma", label, isOffline: !isOnline };
}

/**
 * Parses voice commands using either Local Gemma (zero cost/offline) or Cloud Gemini,
 * with strict adherence to the user's selected engine and no unauthorized cloud fallbacks.
 */
export async function parseVoiceCommand(text, productNames = [], forceEngine = null) {
  const resolved = forceEngine ? { engine: forceEngine } : resolveVoiceEngine();
  const primaryEngine = resolved.engine;

  const prompt = `You are the conversational voice POS parser for a small grocery store.
Store Inventory Product Catalog: ${JSON.stringify(productNames)}.

Owner Voice/Typed Command: "${text}"

Instructions:
1. CUSTOMER & PAYMENT DETECTION:
   - Identify customer name if mentioned (e.g., "Ramesh ko...", "Amit bhai ka...", "sell to Sarah", "Rohan ke khate me", "Pooja ji ko") -> customer: string or null
   - Detect payment method: if on credit / store tab / udhaar / khata (e.g., "udhaar", "khata", "khate me likho", "on credit", "tab", "paise baad me", "likh lo", "hisab me") -> paymentMode: "khata", else "cash".

2. MULTILINGUAL & REGIONAL SEMANTIC GROUNDING:
   - The command can be in English, Hindi (हिन्दी), Hinglish, Devanagari script (e.g. "शक्खर", "शक्कर", "आटा", "इलायची", "दाल", "तेल", "दूध", "चावल"), Nepali, Spanish, or regional dialects.
   - Fractional quantities: "aadha kilo" / "आधा किलो" = 0.5 kg, "ek paav" / "paav" / "एक पाव" = 0.25 kg, "dhai sau gram" = 0.25 kg, "dedh kilo" = 1.5 kg, "dhai kilo" = 2.5 kg, "ek darjan" / "dozen" = 1 dozen.
   - SEMANTIC MAPPING RULE: Compare the meaning of the spoken product against the Store Inventory Product Catalog.
     Translate and semantically map regional names to the matching catalog product!
     For example:
     - "शक्खर" / "शक्कर" / "चीनी" / "cheeni" / "azucar" -> Match with "Sugar" (or similar catalog name)
     - "आटा" / "atta" / "gehun ka aata" -> Match with "Wheat Flour" / "Flour" (or similar catalog name)
     - "इलायची" / "elaichi" -> Match with "Cardamom" (or similar catalog name)
     - "दाल" / "dal" -> Match with "Lentils" / "Beans" / specific pulse
     - "तेल" / "tel" -> Match with "Cooking Oil"
     - "दूध" / "doodh" -> Match with "Milk"
     - "अंडा" / "अन्डा" / "anda" -> Match with "Eggs"
   - In the "product" field, you MUST return the EXACT verbatim string from the Store Inventory Product Catalog that corresponds to that item.
   - If absolutely NO product in the inventory matches the conceptual item, set "product": null.
   - In "heard", preserve the exact word spoken by the owner (e.g. "शक्खर", "आटा", "इलायची").

3. OUTPUT FORMAT:
Return ONLY a valid JSON object (no Markdown code fences):
{
  "customer": string or null,
  "paymentMode": "cash" or "khata",
  "items": [
    {
      "intent": "sale" or "restock",
      "product": string from inventory catalog or null,
      "heard": string spoken by owner,
      "qty": number,
      "unit": "kg" | "g" | "L" | "ml" | "unit" | "pack" | "dozen" | null,
      "cost": number (purchase/kharid cost if spoken) or null,
      "price": number (selling/bechna price/mrp if spoken) or null
    }
  ]
}
Note: sold / becha / bikri / diya / sell / de do = "sale"; received / aaya / stock aaya / mangwaya / naya item = "restock".`;

  if (primaryEngine === "gemma") {
    // STRICT GEMMA / ON-DEVICE MODE: Guarantee zero cloud costs and zero Gemini quota usage!
    if (isLocalEngineReady()) {
      try {
        const res = await webllmParseVoiceCommand(text, productNames);
        if (
          res &&
          (res.items?.length ||
            res.product ||
            res.heard ||
            res.name ||
            res.order?.length ||
            res.sales?.length ||
            res.cart?.length)
        ) {
          return res;
        }
      } catch (e) {
        console.warn("On-device WebLLM parse error, checking local server fallback:", e.message);
      }
    }
    if (!set().aiBaseUrl) {
      throw new Error(
        "Local Gemma server not configured — shifting to Built-in Smart Offline Parser ($0 Cost, No quota used)",
      );
    }
    try {
      return await aiCustom([{ text: prompt }], true);
    } catch (err) {
      throw new Error(
        "Local Gemma server unreachable at " +
          set().aiBaseUrl +
          " — shifting to Built-in Smart Offline Parser ($0 Cost, No quota used)",
      );
    }
  } else if (primaryEngine === "gemini") {
    // REMOTE MODE: use the selected remote backend (gemini / vertex / openrouter / custom).
    // The gemini() dispatcher routes openrouter & custom to aiCustom automatically.
    if (!remoteReady())
      throw new Error(
        "No remote AI backend configured — add a key or server URL in Settings, or switch to ⚡ Gemma ($0)",
      );
    try {
      return await gemini([{ text: prompt }], true);
    } catch (err) {
      const msg = err.message || "";
      if (msg.includes("429") || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("quota")) {
        throw new Error(
          "Remote AI quota exhausted (HTTP 429) — shifting to Built-in Free Offline Parser",
        );
      }
      throw err;
    }
  } else {
    // AUTO MODE: Smart Adaptive fallback with explicit notifications when shifting
    const hasLocal = !!set().aiBaseUrl;
    const hasCloud = !!set().apiKey;

    if (hasLocal) {
      try {
        return await aiCustom([{ text: prompt }], true);
      } catch (err) {
        if (hasCloud) {
          toast("🔄 Auto Mode: Local Gemma unreachable — shifting to Gemini Cloud", "warn", 3000);
          try {
            return await gemini([{ text: prompt }], true);
          } catch (cloudErr) {
            toast(
              "🔄 Auto Mode: Gemini Cloud error — shifting to Built-in Offline Parser",
              "warn",
              3000,
            );
            throw cloudErr;
          }
        }
      }
    } else if (hasCloud) {
      try {
        return await gemini([{ text: prompt }], true);
      } catch (err) {
        toast(
          "🔄 Auto Mode: Gemini Cloud quota reached — shifting to Built-in Offline Parser",
          "warn",
          3000,
        );
        throw err;
      }
    }
    throw new Error("Auto Mode: Shifting to Built-in Offline Parser");
  }
}

export async function geminiDetect(imgs) {
  const prompt = `You are the inventory vision system of a small grocery store. ${imgs.length > 1 ? `These ${imgs.length} images are frames from one video sweep of the same shelves; merge them and do NOT double-count items seen in several frames.` : "Analyze the shelf image."}
Identify every distinct retail product. Read brand and size from packaging when legible (e.g. "Coca-Cola 600ml"), else use a clear generic name ("Bananas", "White Sugar 1kg").
Return ONLY a JSON array, one object per distinct product: {"name": string, "category": one of ${JSON.stringify(Object.keys(CAT))}, "count": integer visible units (estimate kg for loose produce), "unit": "unit"|"kg"|"L"|"pack", "confidence": 0-1, "price_guess": typical local retail price number or null, "box_2d": [ymin,xmin,ymax,xmax] normalized 0-1000 around all units of that product in this image, or null}.`;

  const r = await gemini([
    { text: prompt },
    ...imgs.map((d) => ({ inline_data: { mime_type: "image/jpeg", data: d.split(",")[1] } })),
  ]);
  const list = Array.isArray(r)
    ? r
    : r.products ||
      r.items ||
      (typeof r === "object" && r !== null ? Object.values(r).find(Array.isArray) : []) ||
      [];
  return list
    .filter((x) => x && x.name)
    .map((x) => ({
      name: x.name,
      category: x.category,
      count: Math.round(+x.count || 1),
      unit: x.unit,
      confidence: x.confidence,
      price: x.price_guess,
      box: x.box_2d || null,
    }));
}

export async function receiptParse(imgs) {
  const prompt = `You are an expert OCR & invoice parsing system for a grocery store. ${imgs.length > 1 ? `These ${imgs.length} images are photos of ONE invoice or bill — merge them and do not double-count lines.` : "Read this wholesale delivery bill, distributor invoice, or purchase slip."}
It may be printed or handwritten, in English, Hindi/Hinglish, or Spanish.
Extract:
- store: supplier/wholesaler/distributor name if legible (e.g. "Metro Cash & Carry", "Patel Traders") or null
- invoiceNo: invoice/bill number if visible, or null
- date: date of invoice (YYYY-MM-DD or as written) or null
- total: grand total amount paid/due, or null
- items: array of product lines received:
  [{"name": short product name with brand & pack size (e.g. "Fortune Oil 1L", "White Sugar 1kg"),
    "qty": number,
    "unit": "unit"|"kg"|"g"|"L"|"ml"|"pack",
    "cost": number (purchase cost paid per unit),
    "mrp": number or null (printed MRP or retail sale price),
    "confidence": number 0-1}]
Skip tax summaries, signatures, and terms. Return ONLY JSON: {"store": string|null, "invoiceNo": string|null, "date": string|null, "total": number|null, "items": [...]}. If unreadable, return empty items array.`;

  const r = await gemini([
    { text: prompt },
    ...imgs.map((d) => ({ inline_data: { mime_type: "image/jpeg", data: d.split(",")[1] } })),
  ]);
  return {
    store: r.store || null,
    invoiceNo: r.invoiceNo || null,
    date: r.date || null,
    total: r.total != null ? +r.total : null,
    items: (Array.isArray(r) ? r : r.items || [])
      .filter((x) => x && x.name)
      .map((x) => ({
        name: x.name,
        count: +x.qty || 1,
        unit: x.unit,
        cost: x.cost != null ? +x.cost : null,
        mrp: x.mrp != null ? +x.mrp : null,
        confidence: x.confidence,
      })),
  };
}

export async function fetchActiveModels() {
  if (!set().apiKey) {
    toast("Enter your Gemini API key in Settings first", "warn");
    return null;
  }
  toast("🔄 Querying Google API for active models…", "ok", 2000);
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(set().apiKey)}`;
    const r = await fetchT(url, { method: "GET" }, 12000);
    if (!r.ok) {
      let m = "HTTP " + r.status;
      try {
        m = (await r.json()).error.message;
      } catch (e) {}
      throw new Error(m);
    }
    const d = await r.json();
    const list = (d.models || []).filter((x) =>
      (x.supportedGenerationMethods || []).includes("generateContent"),
    );
    if (!list.length) throw new Error("No generateContent models found for this key");
    S.fetchedModels = list.map((x) => ({
      id: x.name.replace(/^models\//, ""),
      name: x.displayName || x.name.replace(/^models\//, ""),
      description: x.description || "",
    }));
    save();
    toast(`✅ Discovered ${S.fetchedModels.length} active models for your key!`, "ok", 3500);
    return S.fetchedModels;
  } catch (e) {
    toast("Model lookup failed: " + e.message, "err", 6000);
    return null;
  }
}
