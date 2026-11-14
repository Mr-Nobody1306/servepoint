"use strict";
/* ServePoint secure backend — thin entry point. All logic lives in src/.
   Browsers can only ever download files from public/. The Groq key
   never leaves this process except inside the HTTPS call to Groq. */
const http = require("node:http");
const config = require("./src/config");
const { createRateLimiter } = require("./src/rateLimit");
const { serveStatic, sendJson, securityHeaders, configureHeaders } = require("./src/static");
const { handleChat } = require("./src/chat");
const { handleWebhook, handleBanks, handleRecipient, handleCompletion, handleBookingStatus, handlePaymentStatus } = require("./src/paystack");
const { handleApiRequest } = require("./src/apiRoutes");
configureHeaders(config);
const limiter = createRateLimiter({ windowMs: 60 * 1000, max: config.chatMaxPerMin });
function onRequest(req, res) {
  const t0 = Date.now();
  res.on("finish", () => {
    console.log(new Date().toISOString(), req.method, (req.url || "").split("?")[0], res.statusCode, Date.now() - t0 + "ms");
  });
  let pathname = "/";
  try { pathname = new URL(req.url || "/", "http://x").pathname; } catch (e) {}
  // Optional HTTP -> HTTPS redirect. OFF by default: enable ONLY when TLS is
  // terminated in front of this server (host "force HTTPS" or a proxy that
  // sets X-Forwarded-Proto). Enabling it on a bare-http server would loop.
  if (config.forceHttps) {
    const proto = String((req.headers && req.headers["x-forwarded-proto"]) || "").split(",")[0].trim().toLowerCase();
    if (proto !== "https") {
      const host = String((req.headers && req.headers.host) || "localhost").split(",")[0].trim() || "localhost";
      res.writeHead(301, Object.assign({ Location: "https://" + host + (req.url || "/") }, securityHeaders()));
      return res.end();
    }
  }
  if (req.method === "GET" && pathname === "/api/health") {
    return sendJson(res, 200, { ok: true, model: config.groqModel, aiConfigured: config.groqKey.length > 0 });
  }
  if (pathname === "/api/paystack/webhook") {
    Promise.resolve(handleWebhook(req, res, config)).catch((err) => {
      console.error("[paystack webhook] unhandled:", err && err.message);
      if (!res.headersSent) sendJson(res, 500, { error: "Internal error." });
      else { try { res.end(); } catch (e2) {} }
    });
    return;
  }
  if (pathname === "/api/paystack/banks") {
    Promise.resolve(handleBanks(req, res, config)).catch((err) => {
      console.error("[payout banks] unhandled:", err && err.message);
      if (!res.headersSent) sendJson(res, 500, { error: "Internal error." });
    });
    return;
  }
  if (pathname === "/api/paystack/recipient") {
    Promise.resolve(handleRecipient(req, res, config)).catch((err) => {
      console.error("[payout recipient] unhandled:", err && err.message);
      if (!res.headersSent) sendJson(res, 500, { error: "Internal error." });
    });
    return;
  }
  if (pathname === "/api/bookings/complete") {
    Promise.resolve(handleCompletion(req, res, config)).catch((err) => {
      console.error("[booking completion] unhandled:", err && err.message);
      if (!res.headersSent) sendJson(res, 500, { error: "Internal error." });
    });
    return;
  }
  if (pathname === "/api/bookings/status") {
    Promise.resolve(handleBookingStatus(req, res, config)).catch((err) => {
      console.error("[booking status] unhandled:", err && err.message);
      if (!res.headersSent) sendJson(res, 500, { error: "Internal error." });
    });
    return;
  }
  if (pathname === "/api/bookings/payment-status") {
    Promise.resolve(handlePaymentStatus(req, res, config)).catch((err) => {
      console.error("[payment status] unhandled:", err && err.message);
      if (!res.headersSent) sendJson(res, 500, { error: "Internal error." });
    });
    return;
  }
  if (pathname === "/api/chat") {
    if (req.method !== "POST") return sendJson(res, 405, { error: "Use POST." });
    Promise.resolve(handleChat(req, res, { config, limiter })).catch((err) => {
      console.error("[chat] unhandled:", err && err.message);
      if (!res.headersSent) sendJson(res, 500, { error: "Internal error." });
      else { try { res.end(); } catch (e2) {} }
    });
    return;
  }
  if (pathname.startsWith("/api/")) {
    Promise.resolve(handleApiRequest(req, res, pathname, config)).catch((err) => {
      console.error("[api] unhandled:", err && err.message);
      if (!res.headersSent) sendJson(res, 500, { error: "Internal API error." });
      else { try { res.end(); } catch (e) {} }
    });
    return;
  }
  if (req.method !== "GET") { res.writeHead(405, securityHeaders()); return res.end("Method not allowed"); }
  return serveStatic(req, res, config.publicDir, pathname);
}
const server = http.createServer(onRequest);
server.listen(config.port, () => {
  console.log("ServePoint secure server on http://localhost:" + config.port);
  console.log("AI model: " + config.groqModel + " | Key: " + (config.groqKey ? "set" : "MISSING — /api/chat will 503 until .env has GROQ_API_KEY"));
});
