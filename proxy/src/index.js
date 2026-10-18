// ShelfSense AI — OpenRouter proxy.
// Browsers on the hosted app can't call OpenRouter directly (site CSP +
// key exposure), so the app posts here and we forward to OpenRouter.
// Only the enabled Google flash/gemma models may pass; anything else is
// routed to the free Gemma default. The caller's Authorization header
// (their OpenRouter key) is passed through untouched, never stored.
const UPSTREAM = "https://openrouter.ai/api/v1/chat/completions";
const DEFAULT_MODEL = "google/gemma-4-26b-a4b-it:free";
const ALLOWED_MODELS = new Set([
  DEFAULT_MODEL,
  "google/gemma-4-31b-it:free",
  "google/gemini-3.8-flash",
  "google/gemini-3.7-flash",
  "google/gemini-3.6-flash",
  "google/gemini-3.5-flash",
  "google/gemini-3.5-flash-lite",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
]);
const ORIGIN =
  /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$|https:\/\/shelfsense-df2265\.(web\.app|firebaseapp\.com)$/;

const cors = (req) => {
  const h = {
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  const o = req.headers.get("Origin") || "";
  if (ORIGIN.test(o)) h["Access-Control-Allow-Origin"] = o;
  return h;
};

export default {
  async fetch(req) {
    const url = new URL(req.url);
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(req) });
    if (req.method !== "POST" || url.pathname !== "/v1/chat/completions") {
      return new Response("not found", { status: 404, headers: cors(req) });
    }

    let body;
    try {
      body = await req.json();
    } catch {
      return json(req, 400, { error: { message: "body must be JSON" } });
    }
    body.model = ALLOWED_MODELS.has(body.model) ? body.model : DEFAULT_MODEL;

    const auth = req.headers.get("Authorization");
    if (!auth)
      return json(req, 401, {
        error: { message: "missing Authorization: Bearer <openrouter key>" },
      });

    const up = await fetch(UPSTREAM, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: auth,
        "HTTP-Referer": "https://shelfsense-df2265.web.app",
        "X-Title": "ShelfSense AI",
      },
      body: JSON.stringify(body),
    });

    return new Response(up.body, {
      status: up.status,
      headers: {
        ...cors(req),
        "content-type": up.headers.get("content-type") || "application/json",
      },
    });
  },
};

function json(req, status, obj) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { ...cors(req), "content-type": "application/json" },
  });
}
