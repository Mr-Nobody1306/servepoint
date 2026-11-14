"use strict";
/* Static file serving + shared HTTP helpers.
   Only files under publicDir are ever reachable. Anything else
   (server.js, src/, .env) returns 404 — the key cannot be downloaded.
   Hardened response headers (see README "Response headers"):
   - CSP without inline script or style elements; a style-attribute-only
     exception supports Paystack's checkout UI.
   - HSTS (short max-age rollout; raise HSTS_MAX_AGE once HTTPS is stable),
     COOP same-origin-allow-popups (OAuth + Paystack popups need window.opener),
     CORP same-origin. COEP is omitted so Paystack's cross-origin checkout
     iframe can load.
   - No CORS allow-origin header is EVER sent: the API is same-origin only. */
const fs = require("node:fs");
const path = require("node:path");
const MIME = { ".html": "text/html; charset=utf-8", ".css": "text/css; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".json": "application/json; charset=utf-8", ".svg": "image/svg+xml", ".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".ico": "image/x-icon", ".woff2": "font/woff2" };
// Overridden once at startup via configureHeaders(config) in server.js.
// Defaults keep every response safe even if configure is never called.
let headerConfig = { hstsMaxAge: 300, hstsSubdomains: false };
function configureHeaders(cfg) {
  headerConfig = {
    hstsMaxAge: (cfg && Number.isInteger(cfg.hstsMaxAge) && cfg.hstsMaxAge >= 0) ? cfg.hstsMaxAge : 300,
    hstsSubdomains: !!(cfg && cfg.hstsSubdomains)
  };
}
function contentSecurityPolicy() {
  return "default-src 'self';"
    + " script-src 'self' https://js.paystack.co;"
    + " style-src 'self' https://fonts.googleapis.com https://paystack.com;"
    + " style-src-attr 'unsafe-inline';"
    + " font-src 'self' https://fonts.gstatic.com;"
    + " img-src 'self' data: blob: https://images.unsplash.com;"
    + " media-src 'self' blob:;"
    + " connect-src 'self' https://*.supabase.co https://api.bigdatacloud.net https://get.geojs.io https://js.paystack.co https://api.paystack.co;"
    + " frame-src 'self' https://js.paystack.co https://checkout.paystack.com;"
    + " object-src 'none';"
    + " base-uri 'self';"
    + " form-action 'self';"
    + " frame-ancestors 'self';"
    + " upgrade-insecure-requests";
}
function securityHeaders() {
  const h = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "SAMEORIGIN",
    "Referrer-Policy": "no-referrer",
    "Cross-Origin-Opener-Policy": "same-origin-allow-popups",
    "Cross-Origin-Resource-Policy": "same-origin",
    "Content-Security-Policy": contentSecurityPolicy()
  };
  // HSTS is honored by browsers only over HTTPS; harmless on plain-http
  // (local dev). Browsers need max-age > 0 — 0 disables, so omit instead.
  if (headerConfig.hstsMaxAge > 0) {
    h["Strict-Transport-Security"] = "max-age=" + headerConfig.hstsMaxAge + (headerConfig.hstsSubdomains ? "; includeSubDomains" : "");
  }
  return h;
}
function sendJson(res, code, obj) {
  const body = JSON.stringify(obj);
  const headers = securityHeaders();
  headers["Content-Type"] = "application/json; charset=utf-8";
  headers["Content-Length"] = Buffer.byteLength(body);
  res.writeHead(code, headers);
  res.end(body);
}
function serveStatic(req, res, publicDir, pathname) {
  let rel = pathname === "/" ? "/index.html" : pathname;
  let file;
  try { file = path.normalize(path.join(publicDir, decodeURIComponent(rel))); }
  catch (e) { res.writeHead(400, securityHeaders()); return res.end("Bad request"); }
  if (file !== publicDir && file.indexOf(publicDir + path.sep) !== 0) { res.writeHead(403, securityHeaders()); return res.end("Forbidden"); }
  fs.stat(file, function (err, st) {
    if (err || !st.isFile()) {
      if (!path.extname(pathname)) {
        const indexFile = path.join(publicDir, "index.html");
        return fs.stat(indexFile, (err2, st2) => {
          if (!err2 && st2.isFile()) {
            const headers = securityHeaders();
            headers["Content-Type"] = "text/html; charset=utf-8";
            res.writeHead(200, headers);
            return fs.createReadStream(indexFile).pipe(res);
          }
          res.writeHead(404, securityHeaders());
          return res.end("Not found");
        });
      }
      res.writeHead(404, securityHeaders());
      return res.end("Not found");
    }
    const type = MIME[path.extname(file).toLowerCase()] || "application/octet-stream";
    const headers = securityHeaders();
    headers["Content-Type"] = type;
    res.writeHead(200, headers);
    fs.createReadStream(file).pipe(res);
  });
}
module.exports = { securityHeaders: securityHeaders, configureHeaders: configureHeaders, contentSecurityPolicy: contentSecurityPolicy, sendJson: sendJson, serveStatic: serveStatic };
