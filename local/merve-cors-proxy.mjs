// CORS shim in front of merve's OpenAI door. ShelfSense (an https page) calls
// http://localhost:8283/v1/*; this forwards to merve on 8282 and adds the
// browser headers merve doesn't send. Model management, hot-swap, TTL — all
// still merve's; this only speaks CORS.
import http from "node:http";

const UPSTREAM = "127.0.0.1:8282";
const PORT = 8283;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "content-type, authorization",
  "Access-Control-Max-Age": "86400",
};

const server = http.createServer((req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, CORS);
    res.end();
    return;
  }
  const chunks = [];
  req.on("data", (c) => chunks.push(c));
  req.on("end", () => {
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
    if (chunks.length) up.write(Buffer.concat(chunks));
    up.end();
  });
});

server.listen(PORT, "127.0.0.1", () =>
  console.log(`shelfsense gemma shim :${PORT} -> merve :8282`),
);
