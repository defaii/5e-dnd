#!/usr/bin/env node

import http from "node:http";

const HOST = "127.0.0.1";
const PORT = Number(process.env.PORT || 30001);
const ALLOWED_HOST = "www.aidedd.org";

function setCorsHeaders(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
}

function sendJson(res, status, data) {
  setCorsHeaders(res);
  res.writeHead(status, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(data));
}

function validateTarget(rawUrl) {
  if (!rawUrl) throw new Error("Missing url parameter.");

  const url = new URL(rawUrl);
  if (url.protocol !== "https:" || url.hostname !== ALLOWED_HOST) {
    throw new Error(`Only https://${ALLOWED_HOST} URLs are allowed.`);
  }

  return url;
}

const server = http.createServer(async (req, res) => {
  setCorsHeaders(res);

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "GET") {
    sendJson(res, 405, { error: "Method not allowed." });
    return;
  }

  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);

    if (requestUrl.pathname === "/health") {
      sendJson(res, 200, { ok: true });
      return;
    }

    const target = validateTarget(requestUrl.searchParams.get("url"));
    const response = await fetch(target.href, {
      headers: {
        "User-Agent": "5e-dnd Foundry AideDD importer",
        "Accept": "text/html,application/xhtml+xml",
      },
    });

    const body = Buffer.from(await response.arrayBuffer());
    res.writeHead(response.status, {
      "Content-Type": response.headers.get("content-type") || "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(body);
  } catch (err) {
    sendJson(res, 400, { error: err.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`AideDD proxy listening on http://${HOST}:${PORT}`);
});
