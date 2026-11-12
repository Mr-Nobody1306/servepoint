"use strict";
/* Security smoke tests. Run with: npm test (or: node --test test/).
   These prove the frontend/backend split holds. */
const t = require("node:test");
const describe = t.describe;
const it = t.it;
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const ROOT = path.join(__dirname, "..");
function read(p) { return fs.readFileSync(path.join(ROOT, p), "utf8"); }
describe("backend isolation", function () {
  it("public/ files reference no secrets or server internals", function () {
    const names = ["public/config.js", "public/index.html", "public/app.js", "public/flows.js"];
    for (const f of names) {
      const body = read(f);
      // Groq key handling must never appear in the browser. Supabase JWT
      // auth headers are fine — they carry the user's own login token
      // (enforced by RLS) — so Bearer alone is NOT a violation here.
      assert.ok(!/GROQ_API_KEY|groqApiKey|groqKey|api\.groq\.com|process\.env|require\(/i.test(body), f + " must not touch secrets");
      const lines = body.split("\n");
      for (const line of lines) {
        // Capital-B "Bearer" only ever appears in the Supabase JWT header
        // string ("Bearer " + user token). The lowercase Auth.bearer()
        // method name is just a getter for that same user token.
        if (line.indexOf("Bearer") !== -1) assert.ok(line.indexOf("supabaseKey") !== -1, f + ": Bearer auth must only be Supabase user tokens");
      }
    }
  });
  it("frontend AI traffic goes only to our own /api/chat", function () {
    const body = read("public/flows.js") + read("public/app.js") + read("public/index.html");
    assert.match(body, /fetch\(["']\/api\/chat["']/);
    assert.ok(!/chat\/completions|openai\/v1/i.test(body), "no direct provider URLs in the browser");
  });
  it("server-side prompt is not shipped to the browser", function () {
    const pub = read("public/flows.js") + read("public/app.js") + read("public/index.html");
    assert.ok(read("src/persona.js").indexOf("starting prices in GH cedis") !== -1);
    assert.ok(pub.indexOf("starting prices in GH cedis") === -1);
  });
  it("server validates the trade allowlist before answering", function () {
    const body = read("src/chat.js");
    assert.ok(body.indexOf("plumbing") !== -1 && body.indexOf("hvac") !== -1, "allowlist required");
    assert.ok(body.indexOf("SERVICES.indexOf") !== -1, "service must be allowlisted");
  });
  it("server serves only public/ (plus /api/*)", function () {
    const body = read("server.js") + read("src/static.js");
    assert.ok(body.indexOf("publicDir") !== -1, "static root must be the public dir");
    assert.ok(body.indexOf("startsWith(publicDir") !== -1 || body.indexOf("indexOf(publicDir") !== -1, "path traversal guard required");
  });
  it(".env is ignored; the example ships a placeholder, never a key", function () {
    assert.match(read(".gitignore"), /^\.env$/m);
    const ex = read(".env.example");
    assert.match(ex, /GROQ_API_KEY=PASTE_YOUR_KEY_HERE/);
    assert.ok(!/gsk_[A-Za-z0-9]/.test(ex), ".env.example must not contain a real key");
  });
  it("every backend module the server loads exists", function () {
    const names = ["src/config.js", "src/persona.js", "src/ai.js", "src/chat.js", "src/rateLimit.js", "src/static.js"];
    for (const f of names) assert.ok(fs.existsSync(path.join(ROOT, f)), f + " missing");
  });
  it("public config ships placeholders only, never a real key", function () {
    const body = read("public/config.js");
    assert.match(body, /PASTE_YOUR_SUPABASE_URL_HERE/);
    assert.ok(!/gsk_[A-Za-z0-9]|sk-[A-Za-z0-9]|eyJ[A-Za-z0-9]/.test(body), "public/config.js must not contain a real key");
  });
});
describe("currency and artisan profile behavior", function () {
  it("shows cedi amounts and sends Paystack pesewas", function () {
    const app = read("public/app.js");
    const flows = read("public/flows.js");
    assert.match(app, /function gh\(n\) \{ return "GH₵ " \+ Number\(n\)\.toFixed\(2\); \}/);
    assert.match(flows, /const amountPesewas = Math\.round\(amountGhs \* 100\)/);
    assert.match(flows, /amount: amountPesewas,\s*currency: "GHS"/);
  });
  it("collects artisan identity details and keeps phone out of the public directory", function () {
    const app = read("public/app.js");
    const flows = read("public/flows.js");
    const styles = read("public/styles.css");
    const schema = read("src/artisan-private-details.sql");
    assert.match(flows, /id="acctName"/);
    assert.match(flows, /id="acctPhone"/);
    assert.match(flows, /id="artisanFields"[\s\S]*?\$\{acctRole === "artisan" \? "" : "hidden"\}/);
    assert.match(styles, /#artisanFields\[hidden\]\s*\{\s*display:\s*none\s*!important;/);
    assert.match(flows, /label for="acctName"/);
    assert.match(flows, /label for="acctPhone"/);
    assert.match(flows, /Backend\.saveArtisanPhone\(details\.phone\)/);
    assert.match(app, /artisanPhone: meta\.artisan_phone \|\| null/);
    assert.match(app, /artisan_private_details\?select=phone&artisan_id=eq\./);
    assert.match(app, /artisan_private_details", "POST"/);
    assert.match(app, /profiles\?select=id,role,name,trade,area,rating,jobs&role=eq\.artisan/);
    assert.match(schema, /alter table public\.artisan_private_details enable row level security/);
    assert.match(schema, /using \(artisan_id = auth\.uid\(\)\)/);
    assert.match(schema, /with check \(artisan_id = auth\.uid\(\)\)/);
    assert.match(schema, /on conflict \(artisan_id\) do nothing/);
  });
});
describe("hardened response headers", function () {
  it("sends every required header and never sends CORS allowlists", function () {
    const body = read("src/static.js");
    for (const h of ["X-Content-Type-Options", "X-Frame-Options", "Referrer-Policy",
      "Strict-Transport-Security", "Cross-Origin-Opener-Policy", "Cross-Origin-Resource-Policy",
      "Content-Security-Policy"]) {
      assert.ok(body.indexOf('"' + h + '"') !== -1, h + " must be set");
    }
    assert.match(body, /"X-Content-Type-Options": "nosniff"/);
    assert.match(body, /"X-Frame-Options": "SAMEORIGIN"/);
    assert.match(body, /"Referrer-Policy": "no-referrer"/);
    assert.match(body, /"Cross-Origin-Opener-Policy": "same-origin-allow-popups"/);
    assert.match(body, /"Cross-Origin-Resource-Policy": "same-origin"/);
    assert.ok(!/"Cross-Origin-Embedder-Policy"\s*:/.test(body), "COEP must not block Paystack's cross-origin checkout iframe");
    assert.ok(!/"Access-Control-Allow-Origin"\s*:/.test(body), "same-origin API: no CORS headers anywhere");
    assert.ok(!/"Access-Control-Allow-Origin"\s*:/.test(read("server.js")), "server.js must not add CORS headers");
  });
  it("style-src is locked down: no unsafe-inline, no data:, no wildcards", function () {
    const body = read("src/static.js");
    const m = body.match(/style-src ([^;"]*)/);
    assert.ok(m, "CSP must contain a style-src directive");
    const dir = m[1];
    assert.ok(dir.indexOf("unsafe-inline") === -1, "style-src must not contain 'unsafe-inline'");
    assert.ok(!/(^|\s)data:/.test(dir), "style-src must not contain data:");
    assert.ok(dir.indexOf("*") === -1, "style-src must not contain wildcards/broad sources");
    assert.ok(dir.indexOf("'self'") !== -1, "style-src keeps 'self'");
    assert.ok(dir.indexOf("https://fonts.googleapis.com") !== -1, "Google Fonts stylesheet stays explicitly allowlisted");
    assert.match(body, /style-src-attr 'unsafe-inline'/, "Paystack inline checkout styles are allowed without relaxing style-src");
    assert.match(body, /https:\/\/get\.geojs\.io/, "IP location fallback endpoint is explicitly allowlisted");
    const font = body.match(/font-src ([^;"]*)/);
    assert.ok(font && font[1].indexOf("data:") === -1, "font-src must not contain data:");
    assert.ok(body.indexOf("frame-ancestors 'self'") !== -1, "CSP must carry frame-ancestors 'self'");
  });
  it("HSTS rolls out short first and is configurable", function () {
    assert.match(read("src/config.js"), /hstsMaxAge/);
    assert.match(read("src/config.js"), /HSTS_MAX_AGE/);
    assert.match(read(".env.example"), /HSTS_MAX_AGE=300/);
    assert.match(read("src/static.js"), /max-age=" \+ headerConfig\.hstsMaxAge/);
  });
  it("HTTP->HTTPS redirect exists, defaults OFF, keeps headers", function () {
    const srv = read("server.js");
    assert.ok(srv.indexOf("301") !== -1, "redirect must be a 301");
    assert.ok(srv.indexOf("x-forwarded-proto") !== -1, "redirect must respect the proxy proto header");
    assert.match(read("src/config.js"), /forceHttps: process\.env\.FORCE_HTTPS === "1"/);
  });
});
describe("no inline styles (CSP style-src has no unsafe-inline)", function () {
  it("shipped HTML/JS contain zero style=\"...\" attributes", function () {
    for (const f of ["public/index.html", "public/app.js", "public/flows.js"]) {
      assert.ok(read(f).indexOf(' style="') === -1, f + " must not contain inline style attributes");
    }
  });
  it("no <style> blocks and no inline event-handler attributes in markup", function () {
    const html = read("public/index.html");
    assert.ok(!/<style[\s>]/i.test(html), "styles live in styles.css, not <style> blocks");
    assert.ok(!/\son(click|load|error|submit|change|input|mouseover)="[^"]*"/i.test(html), "behavior attaches via addEventListener, not inline handlers");
  });
  it("dynamic badge colors go through an allowlisted class helper", function () {
    const app = read("public/app.js");
    assert.ok(app.indexOf("tintCls") !== -1, "tintCls helper must exist");
    assert.ok(app.indexOf("${tintCls(s)}") !== -1, "badges must use tintCls(s)");
    assert.ok(!/background:\$\{s\.tint\}/.test(app + read("public/flows.js")), "no raw tint interpolation into markup");
  });
  it("Paystack CDN exception is documented (no SRI possible without ACAO)", function () {
    const html = read("public/index.html");
    assert.ok(html.indexOf("https://js.paystack.co/v1/inline.js") !== -1, "paystack script stays pinned in script-src");
    assert.ok(html.indexOf("Access-Control-Allow-Origin") !== -1, "the no-SRI reason must be written down next to the script tag");
  });
  it("bottom tab bar is gone; side navigation owns all routing", function () {
    for (const f of ["public/index.html", "public/app.js", "public/flows.js"]) {
      const body = read(f);
      assert.ok(body.indexOf("tabbar") === -1 && body.indexOf("tabbtn") === -1, f + " must not reference the removed tab bar");
      assert.ok(body.indexOf("sp-catgrid") === -1, f + " must not reference the removed category grid");
    }
    const html = read("public/index.html");
    assert.ok(html.indexOf('id="sidenav"') !== -1, "drawer/sidebar markup required");
    assert.ok(html.indexOf('id="navScrim"') !== -1, "drawer scrim required");
    assert.match(read("public/styles.css"), /\[data-view\]\[hidden\]\s*\{\s*display:\s*none\s*!important;/, "inactive views must remain hidden even when they have custom display styles");
    assert.ok(html.indexOf('id="catGrid" class="sp-homegrid"') !== -1, "home service cards must use the wide-card grid");
    assert.ok(html.indexOf('id="homeSearch"') !== -1 && html.indexOf('id="homeLoc"') !== -1, "home search row required");
    for (const v of ["home", "services", "history", "diag", "account", "privacy", "admin"]) {
      assert.ok(html.indexOf('data-goto="' + v + '"') !== -1, "drawer link missing: " + v);
    }
    const app = read("public/app.js");
    assert.ok(app.indexOf("openNav") !== -1 && app.indexOf("closeNav") !== -1, "drawer open/close helpers required");
    assert.ok(app.indexOf("ensureBurgers") !== -1, "burger injector required");
  });
});
