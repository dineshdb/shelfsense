// Local companion for ShelfSense: one port that serves BOTH the app and the
// AI. /v1/* forwards to merve's OpenAI door (8282) with the browser headers
// merve doesn't send — including the Private-Network-Allow header Chrome
// demands when an https page calls localhost. Everything else serves the
// built app from ../dist, so http://localhost:8283 is same-origin with the
// AI and no browser (Firefox's Local Network Access, Chrome's PNA) can
// block it. Model management, hot-swap, TTL — all still merve's.
import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { join, extname, normalize } from "node:path";

const UPSTREAM = "127.0.0.1:8282";
const PORT = process.env.SHELFSENSE_SHIM_PORT || 8283;
const DIST = fileURLToPath(new URL("../dist/", import.meta.url));
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Allow-Private-Network": "true",
  "Access-Control-Max-Age": "86400",
};
const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".woff2": "font/woff2",
  ".json": "application/json",
  ".txt": "text/plain; charset=utf-8",
};

function forward(req, res, body) {
  const up = http.request(
    {
      host: "127.0.0.1",
      port: 8282,
      method: req.method,
      path: req.url,
      headers: { ...req.headers, host: UPSTREAM },
    },
    (ur) => {
      res.writeHead(ur.statusCode || 502, {
        ...CORS,
        "content-type": ur.headers["content-type"] || "application/json",
      });
      ur.pipe(res);
    },
  );
  up.on("error", (e) => {
    res.writeHead(502, { ...CORS, "content-type": "application/json" });
    res.end(JSON.stringify({ error: { message: "merve unreachable: " + e.message } }));
  });
  if (body?.length) up.write(body);
  up.end();
}

async function serveFile(res, urlPath) {
  let rel = decodeURIComponent(urlPath.split("?")[0]).replace(/^\/+/, "");
  let file = normalize(join(DIST, rel || "index.html"));
  if (!file.startsWith(normalize(DIST))) file = join(DIST, "index.html");
  try {
    const s = await stat(file);
    if (s.isDirectory()) file = join(file, "index.html");
  } catch {
    file = join(DIST, "index.html"); // SPA fallback
  }
  try {
    const buf = await readFile(file);
    res.writeHead(200, {
      "content-type": TYPES[extname(file)] || "application/octet-stream",
      "cache-control": "no-store",
    });
    res.end(buf);
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end("dist/ not built — run `npm run build` in the shelfsense repo");
  }
}

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
    if (req.url.startsWith("/v1/")) return forward(req, res, Buffer.concat(chunks));
    serveFile(res, req.url).catch(() => {
      res.writeHead(500);
      res.end();
    });
  });
});

server.listen(PORT, "127.0.0.1", () =>
  console.log(`shelfsense local :${PORT} — app + AI (merve on :8282)`),
);
