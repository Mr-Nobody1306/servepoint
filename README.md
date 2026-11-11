# ServePoint — Secure deployment (split frontend + backend)

The ServePoint Ghana app, organized so the Groq key can never be seen or
taken from the browser — the same split as NetBuddy secure.

How the split protects the key:

  browser --POST /api/chat--> server.js --key attached HERE--> Groq
    only chat text in,            .env lives on YOUR machine
    reply+service out             only public/ is ever served
    NO key in either direction

- server.js + src/*.js hold the key (from .env into process memory).
  The server ONLY serves files inside public/ — server.js, src/ and
  .env return 404 and can never be downloaded.
- public/index.html contains ZERO secrets. Its only AI call is
  fetch("/api/chat") on the same server (plus the documented public
  APIs: your Supabase project, Paystack popup, Google Fonts,
  BigDataCloud reverse-geocode).
- The assistant's instructions live in src/persona.js on the server —
  visitors cannot read or override them. The server also allowlists the
  trade (plumbing..hvac) before answering.
- Hardening: per-IP rate limiting (30 AI chats/min), body-size caps
  (64 KB), strict message validation (12 turns max, 2000 chars each),
  hardened response headers (see below), generic browser errors with
  details in your terminal only.
- Proof: npm test runs security smoke tests that fail the build if
  any secret reference ever appears in public/ — plus header, CSP,
  no-inline-style, and redirect assertions.

Project layout:

  fixhub-secure/
    server.js            # thin entry point: routing + listen
    src/
      config.js          # .env loading + validation (key lives here)
      persona.js         # assistant instructions (server-side)
      ai.js              # Groq client (key attached here only)
      chat.js            # POST /api/chat: validate -> Groq -> answer
      rateLimit.js       # per-IP sliding-window limiter
      static.js          # traversal-safe static serving + headers
    public/              # EVERYTHING the browser may download
      index.html         # markup + views (loads the files below)
      styles.css         # all hand-written CSS (no frameworks)
      app.js             # PART 4: config, data, backend, router, home
      flows.js           # PART 5: booking, tracking, pay, history, AI chat
      config.js          # PUBLIC keys only (Supabase anon + Paystack public)
    test/
      security.test.js   # npm test — proves the split holds
    .env.example         # copy to .env, fill in your Groq key
    package.json / README.md

Setup (3 minutes):

  cd fixhub-secure
  cp .env.example .env        # Windows: copy .env.example .env
  # edit .env and paste your Groq key into GROQ_API_KEY
  # edit public/config.js: paste Supabase URL + anon key + Paystack PUBLIC key
  node server.js
  # open http://localhost:8000



Response headers (every static + API response carries them):

  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN (+ CSP frame-ancestors 'self')
  Referrer-Policy: no-referrer
  Strict-Transport-Security: max-age=300 (configurable, see above)
  Cross-Origin-Opener-Policy: same-origin-allow-popups — NOT same-origin,
    because the Google-login and Paystack popups need window.opener.
  Cross-Origin-Embedder-Policy: credentialless (require-corp would break
    the Paystack/Fonts third parties, which send no CORP headers).
  Cross-Origin-Resource-Policy: same-origin
  Content-Security-Policy (no 'unsafe-inline' anywhere, no data: in
  style-src/font-src, no wildcards):
    default-src 'self';
    script-src 'self' https://js.paystack.co;
    style-src 'self' https://fonts.googleapis.com https://paystack.com;
    font-src 'self' https://fonts.gstatic.com;
    img-src 'self' data: blob:;        (data: = canvas photo previews,
    media-src 'self' blob:;             blob: = photo/voice object URLs —
                                        functionally required, kept here only)
    connect-src 'self' https://*.supabase.co https://api.bigdatacloud.net
      https://get.geojs.io https://js.paystack.co https://api.paystack.co;
    frame-src 'self' https://js.paystack.co https://checkout.paystack.com;
    object-src 'none'; base-uri 'self'; form-action 'self';
    frame-ancestors 'self'; upgrade-insecure-requests
  CORS: no Access-Control-Allow-Origin is ever sent — the API is
  same-origin only (the browser blocks cross-origin reads by default).

  SRI note: the only external script is the Paystack CDN loader. It ships
  WITHOUT an integrity hash on purpose: js.paystack.co sends no
  Access-Control-Allow-Origin header, so integrity+crossorigin would BLOCK
  the payment script from loading (verified in-browser: CORS-mode fetch
  fails while no-cors succeeds). It is pinned via CSP script-src instead;
  current sha384 for manual checks:
    sha384-QrP0u+4fz1ULjkyrXuG/dik/AMsB81GAIHKFg628v7P2r5s2kN2CiCeXlwd2uK+i
  (re-download https://js.paystack.co/v1/inline.js and compare before
  trusting it). Same-origin scripts need no SRI (served by this server).
  style-src note: markup/JS contain zero style="..." attributes (npm test
  enforces this) — dynamic colors go through the allowlisted tintCls()
  helper; JS-driven changes (toast, timeline, avatar) use CSSOM property
  sets, which style-src does not block.


