/* ServePoint Ghana — PART 4: app logic A (config, data, backend, router, home). Extracted from index.html; order matters (loads before flows.js). */
/* ServePoint — PART 4 (secure split). Public keys come from public/config.js
   (window.FIXHUB_CONFIG, filled with your Supabase + Paystack values).
   The Groq key lives only in the server .env — never in this file. */
function publicSetting(name) {
  if (typeof window !== "undefined" && window.FIXHUB_CONFIG && window.FIXHUB_CONFIG[name]) return String(window.FIXHUB_CONFIG[name]);
  if (typeof root !== "undefined" && root[name]) return String(root[name]);
  return "";
}
const CFG = {
  paystackKey: publicSetting("paystackPublicKey"),
  supabaseUrl: publicSetting("supabaseUrl"),
  supabaseKey: publicSetting("supabaseAnonKey")
};
function hasLivePaystack() {
  const key = (CFG.paystackKey || "").trim();
  return !!key && key.indexOf("PASTE") !== 0 && key.indexOf("YOUR_") !== 0 && typeof window !== "undefined" && !!window.PaystackPop;
}
const LIVE_PAY = hasLivePaystack();
const LIVE_DB = CFG.supabaseUrl && CFG.supabaseUrl.indexOf("PASTE") !== 0 && CFG.supabaseKey && CFG.supabaseKey.indexOf("PASTE") !== 0;
window.APP_REV = "secure-2026-11-12";

const SERVICES = [
  { id: "plumbing", name: "Plumbing", base: 80, tint: "#E0F2FE", color: "#0369A1", blurb: "Leaks, pipes, tanks & fittings",
    icon: '<path d="M14.7 6.3a4.5 4.5 0 0 0-6 6L3 18l3 3 5.7-5.7a4.5 4.5 0 0 0 6-6L14 13l-3-3z"/>' },
  { id: "electrical", name: "Electrical", base: 90, tint: "#FEF3C7", color: "#B45309", blurb: "Wiring, sockets & faults",
    icon: '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>' },
  { id: "cleaning", name: "Deep Cleaning", base: 150, tint: "#E6F4EC", color: "#0A7A42", blurb: "Homes, offices & move-out",
    icon: '<path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9z"/><path d="M19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9z"/>' },
  { id: "carpentry", name: "Carpentry", base: 100, tint: "#FFF3E8", color: "#994700", blurb: "Doors, roofs & furniture",
    icon: '<path d="M11 7H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2v-5"/><path d="M14 4l6 6L9 21H4v-5z"/>' },
  { id: "hvac", name: "HVAC", base: 120, tint: "#EDE9FE", color: "#6D28D9", blurb: "AC install & servicing",
    icon: '<path d="M12 2v20M4 6l16 12M20 6L4 18M12 6l-2-2m2 2l2-2m-2 14l-2 2m2-2l2 2M3.5 9L2 8m1.5 1L2 10m18.5-1L22 8m-1.5 1L22 10M3.5 15L2 16m1.5-1L2 14m18.5 1L22 16m-1.5-1l1.5 2"/>' }
];
const TECHS = {
  plumbing:   { name: "Emmanuel Mensah", title: "Master Plumber", rating: "4.9", jobs: 142, phone: "+233244123456", wa: "233244123456", from: "Spintex Road, Accra" },
  electrical: { name: "Ama Serwaa", title: "Certified Electrician", rating: "4.8", jobs: 117, phone: "+233244654321", wa: "233244654321", from: "Osu, Accra" },
  cleaning:   { name: "Efua Owusu", title: "Cleaning Team Lead", rating: "4.9", jobs: 203, phone: "+233244789012", wa: "233244789012", from: "East Legon, Accra" },
  carpentry:  { name: "Kwame Boateng", title: "Master Carpenter", rating: "4.7", jobs: 98, phone: "+233244345678", wa: "233244345678", from: "Kaneshie, Accra" },
  hvac:       { name: "Yaw Adjei", title: "HVAC Specialist", rating: "4.8", jobs: 86, phone: "+233244901234", wa: "233244901234", from: "Tema Comm. 25" }
};
/* Service areas cover all 16 regions of Ghana. AREAS stays flat for the
   fallback cycler and defaults; dropdowns group by region instead. */
const REGIONS = [
  { region: "Greater Accra", areas: ["Accra", "Spintex", "Osu", "East Legon", "Kaneshie", "Dansoman", "Achimota", "Madina", "Adenta", "Tema", "Ashaiman", "Nungua", "Teshie", "Sakumono", "Dodowa", "Prampram"] },
  { region: "Ashanti", areas: ["Kumasi – Asokwa", "Kumasi – Manhyia", "Obuasi", "Ejisu", "Mampong", "Konongo", "Bekwai"] },
  { region: "Western", areas: ["Takoradi – Anaji", "Sekondi", "Tarkwa", "Axim"] },
  { region: "Central", areas: ["Kasoa", "Cape Coast", "Winneba", "Agona Swedru"] },
  { region: "Eastern", areas: ["Koforidua", "Nkawkaw", "Suhum", "Nsawam", "Akosombo"] },
  { region: "Volta", areas: ["Ho", "Hohoe", "Keta", "Aflao", "Sogakope"] },
  { region: "Oti", areas: ["Dambai", "Nkwanta", "Kadjebi"] },
  { region: "Northern", areas: ["Tamale", "Yendi", "Savelugu"] },
  { region: "Savannah", areas: ["Damongo", "Bole", "Sawla"] },
  { region: "North East", areas: ["Nalerigu", "Walewale", "Gambaga"] },
  { region: "Upper East", areas: ["Bolgatanga", "Navrongo", "Bawku"] },
  { region: "Upper West", areas: ["Wa", "Tumu", "Lawra", "Jirapa"] },
  { region: "Bono", areas: ["Sunyani", "Berekum", "Dormaa Ahenkro"] },
  { region: "Bono East", areas: ["Techiman", "Kintampo", "Atebubu"] },
  { region: "Ahafo", areas: ["Goaso", "Bechem", "Duayaw Nkwanta"] },
  { region: "Western North", areas: ["Sefwi Wiawso", "Bibiani", "Juaboso"] }
];
const AREAS = REGIONS.reduce((all, g) => all.concat(g.areas), []);
const SLOTS = ["8–10am", "10–12pm", "12–2pm", "2–4pm", "4–6pm"];
const TRANSPORT = 20, SENIOR_RATE = 0.10;

/* ---------- persistent store (device) ---------- */
const Store = {
  load() {
    try {
      const s = JSON.parse(localStorage.getItem("fixhub_gh") || "{}");
      return { bookings: s.bookings || [], activeId: s.activeId || null, senior: !!s.senior, draft: s.draft || null, homeArea: s.homeArea || null, homeGeo: s.homeGeo || null, profile: s.profile || null };
    } catch (e) { return { bookings: [], activeId: null, senior: false, draft: null, homeArea: null, homeGeo: null, profile: null }; }
  },
  save(s) { try { localStorage.setItem("fixhub_gh", JSON.stringify(s)); } catch (e) {} }
};
let S = Store.load();
/* one-time purge of retired demo data (seeded jobs, demo applications) */
try {
  const before = (S.bookings || []).length;
  S.bookings = (S.bookings || []).filter(b => b && b.id !== "FX-1042" && b.id !== "FX-1017");
  if (S.bookings.length !== before) Store.save(S);
  localStorage.removeItem("fixhub_gh_seeded");
  Object.keys(localStorage).filter(k => k.indexOf("fixhub_demo_apps_") === 0).forEach(k => { try { localStorage.removeItem(k); } catch (e) {} });
} catch (e) {}
function gh(n) { return "GH₵ " + Number(n).toFixed(2); }
function persist() { Store.save(S); }

/* ---------- backend: Supabase when configured, else device ----------
   Secure mode: each device signs in anonymously (Supabase Auth) so the RLS
   policies in src/supabase.sql scope every row to its owner
   (owner_id = auth.uid()). Street address, voice notes and full photos never
   leave the device — only the hasPhoto flag syncs. */
const Auth = {
  key: "fixhub_sb_session",
  mem: null,
  load() {
    if (this.mem) return this.mem;
    try { this.mem = JSON.parse(localStorage.getItem(this.key) || "null"); } catch (e) { this.mem = null; }
    return this.mem;
  },
  persist(s) { this.mem = s; try { localStorage.setItem(this.key, JSON.stringify(s)); } catch (e) {} },
  uid() { const s = this.load(); return s && s.uid ? s.uid : null; },
  googleUid() { const s = this.load(); return s && s.provider === "google" && s.uid ? s.uid : null; },
  topUrl() { try { return location.origin + location.pathname; } catch (e) { return ""; } },
  async fetchUser() {
    const s = this.load();
    if (!s || !s.access || s.uid) return s;
    const r = await fetch(CFG.supabaseUrl + "/auth/v1/user", {
      headers: { apikey: CFG.supabaseKey, Authorization: "Bearer " + s.access }
    });
    if (!r.ok) throw 0;
    const u = await r.json();
    const meta = (u && u.user_metadata) || {};
    const n = Object.assign({}, s, {
      uid: u.id,
      email: u.email || null,
      name: meta.full_name || meta.name || (u.email ? u.email.split("@")[0] : "ServePoint user")
    });
    this.persist(n);
    return n;
  },
  loginWithGoogle() {
    if (!LIVE_DB) { toast("Backend not connected yet — add your Supabase URL + anon key in public/config.js, then reload"); return; }
    const redirect = this.topUrl() + "?oauth=done";
    const url = CFG.supabaseUrl + "/auth/v1/authorize?provider=google&redirect_to=" + encodeURIComponent(redirect);
    const w = window.open(url, "fixhub_login", "width=480,height=680");
    if (!w) { toast("Allow popups to log in with Google"); return; }
    toast("Finish Google login in the new tab…");
    let tries = 0;
    const timer = setInterval(async () => {
      tries++;
      try {
        const raw = localStorage.getItem(this.key);
        const s = raw ? JSON.parse(raw) : null;
        if (s && s.access && s.provider === "google" && s.uid) {
          clearInterval(timer);
          this.mem = s;
          await ensureProfile();
          toast("Welcome" + (S.profile && S.profile.name ? ", " + String(S.profile.name).split(" ")[0] : "") + "!");
          show("account");
        }
      } catch (e) {}
      if (tries > 120) clearInterval(timer);
    }, 1500);
  },
  logout() {
    try { localStorage.removeItem(this.key); } catch (e) {}
    this.mem = null;
    S.profile = null; persist();
    toast("Logged out — browsing as guest");
    try { updateAvatar(); } catch (e) {}
    renderAccount();
  },
  async signup() {
    const r = await fetch(CFG.supabaseUrl + "/auth/v1/signup", {
      method: "POST",
      headers: { apikey: CFG.supabaseKey, "Content-Type": "application/json" },
      body: "{}"
    });
    if (!r.ok) throw 0;
    const j = await r.json();
    if (!j.access_token || !j.user) throw 0;
    const s = { uid: j.user.id, access: j.access_token, refresh: j.refresh_token || null, exp: Date.now() + 50 * 60 * 1000 };
    this.persist(s);
    return s;
  },
  async refresh() {
    const s = this.load();
    if (!s || !s.refresh) throw 0;
    const r = await fetch(CFG.supabaseUrl + "/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      headers: { apikey: CFG.supabaseKey, "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: s.refresh })
    });
    if (!r.ok) throw 0;
    const j = await r.json();
    if (!j.access_token) throw 0;
    const n = { uid: (j.user && j.user.id) || s.uid, access: j.access_token, refresh: j.refresh_token || s.refresh, exp: Date.now() + 50 * 60 * 1000 };
    this.persist(n);
    return n;
  },
  async session() {
    if (!LIVE_DB) return null;
    const s = this.load();
    if (s && s.access && Date.now() < s.exp) return s;
    try { return await this.refresh(); }
    catch (e) {
      if (s && s.provider === "google") return null; // keep Google identity; never mint anon over it
      try { return await this.signup(); }
      catch (e2) { return null; } // anonymous sign-ins disabled → transitional mode
    }
  },
  async bearer() {
    const s = await this.session();
    return s ? s.access : CFG.supabaseKey;
  }
};
const Backend = {
  headers(token) { return { apikey: CFG.supabaseKey, Authorization: "Bearer " + token }; },
  async sbGet(path) {
    const token = await Auth.bearer();
    const r = await fetch(CFG.supabaseUrl + "/rest/v1/" + path, { headers: this.headers(token) });
    if (!r.ok) throw 0;
    return r.json();
  },
  async sbSend(path, method, body, prefer) {
    const token = await Auth.bearer();
    const headers = Object.assign(this.headers(token), { "Content-Type": "application/json" });
    if (prefer) headers.Prefer = prefer;
    const r = await fetch(CFG.supabaseUrl + "/rest/v1/" + path, { method, headers, body: body ? JSON.stringify(body) : undefined });
    if (!r.ok) throw 0;
    try { return await r.json(); } catch (e) { return null; }
  },
  async list() {
    if (!LIVE_DB) return [];
    try {
      const g = Auth.googleUid();
      const token = await Auth.bearer();
      const q = g
        ? "/rest/v1/bookings?select=*&customer_id=eq." + encodeURIComponent(g) + "&order=created_at.desc&limit=50"
        : "/rest/v1/bookings?select=*" + (Auth.uid() ? "&owner_id=eq." + encodeURIComponent(Auth.uid()) : "") + "&order=created_at.desc&limit=50";
      const r = await fetch(CFG.supabaseUrl + q, { headers: this.headers(token) });
      if (!r.ok) throw 0;
      const rows = await r.json();
      return rows.map(rowToBooking);
    } catch (e) { return S.bookings; }
  },
  async save(b) {
    S.bookings = [b].concat(S.bookings.filter(x => x.id !== b.id));
    persist();
    if (!LIVE_DB) return true;
    try {
      const token = await Auth.bearer();
      await fetch(CFG.supabaseUrl + "/rest/v1/bookings", {
        method: "POST",
        headers: Object.assign(this.headers(token), { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" }),
        body: JSON.stringify(bookingToRow(b))
      });
    } catch (e) {}
    return true;
  },
  async openJobs() {
    if (!LIVE_DB) return [];
    try {
      const rows = await this.sbGet("bookings?select=*&status=eq.open&order=created_at.desc&limit=20");
      return (rows || []).map(rowToBooking);
    } catch (e) { return []; }
  },
  async applicants(bookingId) {
    if (!LIVE_DB) return [];
    try {
      const rows = await this.sbGet("applications?select=*&booking_id=eq." + encodeURIComponent(bookingId) + "&order=created_at.asc");
      return (rows || []).slice().sort((a, b) => ((Number(b.rating) || 0) - (Number(a.rating) || 0)) || ((Number(b.jobs) || 0) - (Number(a.jobs) || 0)));
    } catch (e) { return []; }
  },
  async artisans() {
    if (!LIVE_DB) return [];
    try {
      const rows = await this.sbGet("profiles?select=*&role=eq.artisan&order=rating.desc&limit=50");
      return (rows || []).map(rowToProfile);
    } catch (e) { return []; }
  },
  async apply(booking) {
    const g = Auth.googleUid();
    if (!g || !S.profile || S.profile.role !== "artisan") throw 0;
    if (!LIVE_DB) throw 0;
    return await this.sbSend("applications", "POST", {
      booking_id: booking.id, artisan_id: g,
      artisan_name: String(S.profile.name || "Artisan").slice(0, 120),
      trade: S.profile.trade || null,
      rating: Number(S.profile.rating) || 5.0,
      jobs: Number(S.profile.jobs) || 0
    }, "resolution=merge-duplicates");
  },
  async setApplication(id, status) {
    return await this.sbSend("applications?id=eq." + encodeURIComponent(id), "PATCH", { status });
  },
  async saveProfile(patch) {
    const g = Auth.googleUid();
    if (!g) throw 0;
    await this.sbSend("profiles?id=eq." + encodeURIComponent(g), "PATCH", patch);
    S.profile = Object.assign({}, S.profile, patch);
    persist();
    return S.profile;
  }
};
function bookingToRow(b) {
  return { id: b.id, owner_id: Auth.uid(), customer_id: b.customerId || null, service: b.serviceId, description: b.desc, area: b.area, slot: b.slot, date: b.date, total: b.total, method: b.method || null, status: b.status, tech: b.tech || null, prog: (typeof b.prog === "number" ? b.prog : null), offroute: !!b.offRoute, tech_rating: (b.techRating != null ? b.techRating : null), tech_jobs: (b.techJobs != null ? b.techJobs : null) };
}
function rowToBooking(r) {
  return { id: r.id, customerId: r.customer_id || null, serviceId: r.service, desc: r.description, area: r.area, slot: r.slot, date: r.date, total: r.total, method: r.method, status: r.status, tech: r.tech, prog: (r.prog != null ? Number(r.prog) : null), offRoute: !!r.offroute, techRating: (r.tech_rating != null ? Number(r.tech_rating) : null), techJobs: (r.tech_jobs != null ? Number(r.tech_jobs) : null) };
}
function rowToProfile(r) {
  return { id: r.id, role: r.role, name: r.name, trade: r.trade || null, area: r.area || null, rating: (r.rating != null ? Number(r.rating) : 5.0), jobs: (r.jobs != null ? Number(r.jobs) : 0) };
}
async function ensureProfile() {
  if (!LIVE_DB) return null;
  const s = Auth.load();
  if (!s || s.provider !== "google") return null;
  try {
    await Auth.fetchUser();
    const me = Auth.load();
    if (!me || !me.uid) return null;
    const token = await Auth.bearer();
    const r = await fetch(CFG.supabaseUrl + "/rest/v1/profiles?id=eq." + encodeURIComponent(me.uid) + "&select=*", { headers: Backend.headers(token) });
    if (!r.ok) throw 0;
    const rows = await r.json();
    if (rows && rows[0]) { S.profile = rowToProfile(rows[0]); persist(); try { updateAvatar(); } catch (e) {} return S.profile; }
    let pending = null;
    try { pending = JSON.parse(localStorage.getItem("fixhub_pending_role") || "null"); } catch (e) {}
    const role = pending && pending.role === "artisan" ? "artisan" : "customer";
    const body = {
      id: me.uid, role,
      name: String((me.name || "ServePoint user")).slice(0, 120),
      trade: role === "artisan" ? (pending && pending.trade) || null : null,
      area: role === "artisan" ? (pending && pending.area) || null : null,
      rating: 5.0, jobs: 0
    };
    const w = await fetch(CFG.supabaseUrl + "/rest/v1/profiles", {
      method: "POST",
      headers: Object.assign(Backend.headers(token), { "Content-Type": "application/json", Prefer: "resolution=merge-duplicates" }),
      body: JSON.stringify(body)
    });
    if (!w.ok) throw 0;
    S.profile = { id: me.uid, role, name: body.name, trade: body.trade, area: body.area, rating: 5.0, jobs: 0 };
    persist();
    try { updateAvatar(); } catch (e) {}
    return S.profile;
  } catch (e) { return null; }
}
/* OAuth popup lands back here top-level with #access_token — stash the
   session where the iframed app can read it (same origin), then close. */
(function oauthCallback() {
  try {
    if (!location.hash || location.hash.indexOf("access_token=") === -1) return;
    const h = {};
    location.hash.slice(1).split("&").forEach(kv => { const i = kv.indexOf("="); if (i > 0) h[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); });
    if (!h.access_token) return;
    Auth.persist({ uid: null, access: h.access_token, refresh: h.refresh_token || null, exp: Date.now() + (Number(h.expires_in) || 3600) * 1000 - 60000, provider: "google" });
    try { history.replaceState(null, "", location.pathname + location.search); } catch (e) {}
    Auth.fetchUser().then(() => ensureProfile()).then(() => {
      if (window.opener && !window.opener.closed) {
        toast("Logged in with Google — this tab will close");
        setTimeout(() => { try { window.close(); } catch (e) {} }, 1500);
      }
    }).catch(() => {});
  } catch (e) {}
})();

/* ---------- tiny router ---------- */
const VIEWS = ["home", "diag", "services", "account", "privacy", "book1", "book2", "track", "pay", "history", "admin"];
let privacyFrom = "account";
function requireSignedInForProtectedView(name) {
  const protectedViews = ["services", "book1", "book2", "track", "pay", "history"];
  if (!protectedViews.includes(name)) return true;
  const signedIn = !!(Auth && typeof Auth.googleUid === "function" && Auth.googleUid()) && !!(S && S.profile);
  if (!signedIn) {
    toast("Please sign in with Google before accessing services and bookings.");
    if (name !== "account") show("account");
    return false;
  }
  return true;
}
function show(name) {
  if (!requireSignedInForProtectedView(name)) return;
  VIEWS.forEach(v => { const el = document.getElementById("view-" + v); if (el) el.hidden = (v !== name); });
  closeNav();
  const appEl = document.getElementById("app");
  if (appEl) appEl.classList.toggle("wide", name === "admin");
  document.body.classList.toggle("on-admin", name === "admin");
  document.querySelectorAll(".sn-link").forEach(b => {
    const on = b.dataset.goto === name || ((name === "book1" || name === "book2") && b.dataset.goto === "home") || ((name === "track" || name === "pay") && b.dataset.goto === "history");
    b.classList.toggle("on", !!on);
  });
  updateNavUser();
  document.getElementById("screens").scrollTop = 0;
  window.scrollTo(0, 0);
  if (name === "home") renderHomeExtras();
  if (name === "diag") renderDiag();
  if (name === "services") renderServices();
  if (name === "account") renderAccount();
  if (name === "track") renderTrack();
  if (name === "history") renderHistory();
  if (name === "pay") renderPay();
  if (name === "admin") renderAdmin();
}
/* ---------- side navigation (drawer on phones, fixed sidebar on desktop) ---------- */
function openNav() {
  updateNavUser();
  document.body.classList.add("nav-open");
  const c = document.getElementById("navClose");
  if (c) c.focus();
}
function closeNav() { document.body.classList.remove("nav-open"); }
function updateNavUser() {
  let g = null;
  try { g = Auth.googleUid(); } catch (e) {}
  const signed = !!(g && S.profile);
  const r = document.getElementById("navRole");
  if (r) r.textContent = signed ? (S.profile.role === "artisan" ? "Artisan" : (S.profile.name || "Customer")) : "Guest";
  const ini = document.getElementById("navInitial");
  if (ini) ini.textContent = signed ? String(S.profile.name || "S")[0].toUpperCase() : "G";
  const so = document.getElementById("navSignout");
  if (so) so.hidden = !signed;
}
const BURGER_SVG = '<svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M4 7h16M4 12h16M4 17h16"/></svg>';
function wireBurger(b) {
  if (!b || b.dataset.navWired) return;
  b.dataset.navWired = "1";
  if (!b.innerHTML.trim()) b.innerHTML = BURGER_SVG;
  b.addEventListener("click", function (e) { e.stopPropagation(); openNav(); });
}
function ensureBurgers() {
  wireBurger(document.getElementById("burgerBtn"));
  document.querySelectorAll("[data-view] > header").forEach(function (h) {
    if (h.querySelector(".burgerBtn")) return;
    const b = document.createElement("button");
    b.className = "burgerBtn";
    b.setAttribute("aria-label", "Open navigation");
    h.insertBefore(b, h.firstChild);
    wireBurger(b);
  });
}
document.addEventListener("click", (e) => {
  const g = e.target.closest("[data-goto]");
  if (g) {
    if (g.dataset.goto === "privacy") {
      try { privacyFrom = VIEWS.find(v => !document.getElementById("view-" + v).hidden) || "account"; } catch (err) {}
    }
    show(g.dataset.goto); return;
  }
  const b = e.target.closest("[data-back]");
  if (b) { show(b.dataset.back); return; }
  const c = e.target.closest("[data-close]");
  if (c) { document.getElementById(c.dataset.close).hidden = true; }
});

/* ---------- toast ---------- */
let toastT = null;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg;
  t.style.opacity = "1";
  clearTimeout(toastT);
  toastT = setTimeout(() => { t.style.opacity = "0"; }, 2600);
}

/* ---------- home: categories, search, senior mode ---------- */
function svcIcon(s, cls) {
  return `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${s.icon}</svg>`;
}
/* CSP-safe service badge colors (style-src has no 'unsafe-inline', so style
   attributes are banned here).
   Unknown ids fall back to tint-default — never interpolates raw data into a class name. */
function tintCls(s) {
  const id = s && typeof s.id === "string" ? s.id : "";
  return "tint-" + (id === "plumbing" || id === "electrical" || id === "cleaning" || id === "carpentry" || id === "hvac" ? id : "default");
}
function renderCats(filter) {
  const grid = document.getElementById("catGrid");
  grid.innerHTML = "";
  const q = (filter || "").toLowerCase();
  SERVICES.filter(s => !q || s.name.toLowerCase().includes(q) || s.blurb.toLowerCase().includes(q)).forEach(s => {
    const b = document.createElement("button");
    b.className = "sphome-card";
    b.innerHTML = `<span class="sphome-ic ${tintCls(s)}">${svcIcon(s, "w-6 h-6")}</span>
      <span class="sphome-tx"><b>${s.name}</b><i data-prov="${s.id}">from ${gh(s.base)}</i></span>
      <span class="sphome-chev"><svg class="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg></span>`;
    b.onclick = () => startBooking(s.id);
    grid.appendChild(b);
  });
  if (!grid.children.length) grid.innerHTML = '<p class="emptyNote f14 soft py-6 spanall">No matches. Try "plumber" or "clean".</p>';
  else if (LIVE_DB) upgradeProvCounts(grid);
}
/* When the backend is connected, swap the price hint for live provider counts. */
async function upgradeProvCounts(grid) {
  try {
    const artisans = await Backend.artisans();
    const n = {};
    (artisans || []).forEach(p => {
      const t = String(p.trade || "").toLowerCase();
      const s = SERVICES.find(x => x.id === t || x.name.toLowerCase() === t);
      if (s) n[s.id] = (n[s.id] || 0) + 1;
    });
    grid.querySelectorAll("[data-prov]").forEach(el => {
      const c = n[el.dataset.prov] || 0;
      if (c > 0) el.textContent = c + (c === 1 ? " provider" : " providers");
    });
  } catch (e) {}
}
const searchInputEl = document.getElementById("searchInput");
if (searchInputEl) searchInputEl.addEventListener("input", (e) => renderCats(e.target.value));
document.getElementById("svcSearch").addEventListener("input", (e) => { svcQuery = e.target.value; renderServices(); });
const homeSearchEl = document.getElementById("homeSearch");
function homeSearchGo() {
  const q = homeSearchEl.value.trim();
  const sv = document.getElementById("svcSearch");
  if (sv) sv.value = q;
  svcQuery = q;
  renderServices();
  show("services");
}
if (homeSearchEl) {
  homeSearchEl.addEventListener("keydown", (e) => { if (e.key === "Enter") homeSearchGo(); });
  document.getElementById("homeSearchGo").onclick = homeSearchGo;
  document.getElementById("homeLoc").onclick = () => locateUser({ silent: false });
}
function applySenior() {
  document.body.classList.toggle("easy-view", S.senior);
  document.querySelectorAll(".easyTBtn").forEach(b => {
    b.textContent = S.senior ? "Easy View: On" : "Easy View: Off";
    b.setAttribute("aria-pressed", S.senior ? "true" : "false");
  });
}
function toggleSenior() { S.senior = !S.senior; persist(); applySenior(); toast(S.senior ? "Easy View on: larger text" : "Easy View off"); }
const GOOGLE_G_SVG = '<svg class="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"/><path fill="#FBBC05" d="M5.84 14.1a6.6 6.6 0 0 1 0-4.2V7.06H2.18a11 11 0 0 0 0 9.88l3.66-2.84z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A11 11 0 0 0 2.18 7.06l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/></svg>';
function updateAvatar() {
  const btn = document.getElementById("avatarBtn");
  if (!btn) return;
  const name = S.profile && S.profile.name ? String(S.profile.name).trim() : "";
  btn.classList.toggle("avatarbtn-guest", !name);
  if (name) {
    btn.textContent = name[0].toUpperCase();
    btn.setAttribute("aria-label", "Account — signed in as " + name);
  } else {
    btn.innerHTML = GOOGLE_G_SVG;
    btn.setAttribute("aria-label", "Sign in with Google");
  }
}
function refreshAreaPill() {
  const el = document.getElementById("areaPillText");
  if (!el) return;
  if (S.homeGeo && S.homeGeo.label) el.textContent = S.homeGeo.label;
  else el.textContent = (S.homeArea || AREAS[0]) + ", Ghana";
  const chip = document.getElementById("photoAreaChip");
  if (chip) chip.textContent = "Home · " + String(el.textContent).split(",")[0];
  const hl = document.getElementById("homeLocText");
  if (hl) hl.textContent = el.textContent;
}
async function reverseLabel(lat, lng) {
  try {
    const r = await fetch("https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=" + lat + "&longitude=" + lng + "&localityLanguage=en");
    if (!r.ok) throw 0;
    const j = await r.json();
    const place = j.city || j.locality || j.principalSubdivision || "";
    if (place) return (j.countryCode === "GH" || !j.countryCode) ? place + ", Ghana" : place;
  } catch (e) {}
  return null;
}
function cycleArea() {
  const i = AREAS.indexOf(S.homeArea || AREAS[0]);
  S.homeArea = AREAS[(i + 1) % AREAS.length];
  S.homeGeo = null;
  persist(); refreshAreaPill();
  toast("Home area set to " + S.homeArea);
}
/* Approximate area from the network IP (no permission prompt).
   Runs automatically when GPS is denied or unavailable, so the area pills
   still resolve on their own without the user doing anything. */
async function ipGeo() {
  try {
    const r = await fetch("https://get.geojs.io/v1/ip/geo.json");
    if (!r.ok) throw 0;
    const j = await r.json();
    const place = j.city || j.region || "";
    if (!place) return null;
    const label = (j.country_code === "GH" || !j.country_code) ? place + ", Ghana" : place;
    const lat = Number(j.latitude), lng = Number(j.longitude);
    return { lat: (isFinite(lat) ? lat : null), lng: (isFinite(lng) ? lng : null), label: label };
  } catch (e) { return null; }
}
function applyGeo(label, lat, lng, approx) {
  S.homeGeo = { lat: lat, lng: lng, label: label, ts: Date.now(), approx: !!approx };
  const short = String(label).split(",")[0].trim();
  if (short) S.homeArea = short;
  persist(); refreshAreaPill();
}
/* Fully automatic location: GPS first, IP-based area when GPS is denied
   or unavailable. Both area pills call this — no manual picking needed. */
async function locateUser(opts) {
  const silent = !!(opts && opts.silent);
  if (!silent) toast("Getting your current location…");
  if (("geolocation" in navigator)) {
    try {
      const pos = await new Promise((res, rej) => navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: true, timeout: 9000, maximumAge: 600000 }));
      const lat = pos.coords.latitude, lng = pos.coords.longitude;
      let label = await reverseLabel(lat, lng);
      if (!label) label = "My location · " + lat.toFixed(2) + ", " + lng.toFixed(2);
      applyGeo(label, lat, lng, false);
      if (!silent) toast("Location set: " + label);
      return;
    } catch (e) { /* fall through to automatic IP detection */ }
  }
  const ip = await ipGeo();
  if (ip) {
    applyGeo(ip.label, ip.lat, ip.lng, true);
    if (!silent) toast("Location set: " + ip.label + " (approximate)");
    return;
  }
  if (!silent) {
    cycleArea();
    toast("Couldn't detect location — picked " + (S.homeArea || AREAS[0]) + " instead");
  }
}
function renderHomeExtras() {
  updateAvatar();
  refreshAreaPill();
  const nd = document.getElementById("notifDot");
  if (nd) nd.hidden = !S.bookings.some(b => ["dispatched", "enroute", "arrived", "working"].includes(b.status));
  const isArtisan = S.profile && S.profile.role === "artisan";
  document.querySelectorAll(".sp-hero, .sp-photo-wrap, .sp-help").forEach(el => { el.hidden = !!isArtisan; });
  document.getElementById("jobsWrap").hidden = !isArtisan;
  if (isArtisan) {
    document.getElementById("activeBanner").hidden = true;
    document.getElementById("upcomingWrap").hidden = true;
    renderJobs();
    return;
  }
  const a = S.bookings.find(b => b.id === S.activeId && ["dispatched", "enroute", "arrived"].includes(b.status));
  document.getElementById("activeBanner").hidden = !a;
  if (a) {
    const t = TECHS[a.serviceId];
    document.getElementById("activeBannerText").textContent = a.status === "arrived" ? t.name.split(" ")[0] + " has arrived" : t.name.split(" ")[0] + " is on the way · ETA " + a.etaMin + " min";
  }
  renderUpcoming();
}
async function renderJobs() {
  const box = document.getElementById("jobsList");
  if (!box) return;
  if (!LIVE_DB) { box.innerHTML = '<div class="glasscard p-4"><p class="font-display font-bold f15">Backend not connected</p><p class="f13 soft mt-1">Open requests appear here once you add your Supabase URL + anon key in public/config.js and reload.</p></div>'; return; }
  box.innerHTML = '<p class="f14 soft">Finding open requests…</p>';
  let jobs = [];
  try { jobs = await Backend.openJobs(); } catch (e) { jobs = []; }
  box.innerHTML = "";
  if (!jobs.length) box.innerHTML = '<p class="f14 soft glasscard p-4">No open requests right now. New customer jobs appear here — check back soon.</p>';
  jobs.slice(0, 20).forEach(j => {
    const s = svc(j.serviceId) || { name: j.serviceId, tint: "#F1F5F9", color: "#4A5268", icon: "" };
    const el = document.createElement("div");
    el.className = "glasscard p-4";
    el.innerHTML = `<div class="flex items-center gap-3">
      <span class="w-12 h-12 rounded-full grid place-items-center flex-none ${tintCls(s)}">${svcIcon(s, "w-6 h-6")}</span>
      <div class="flex-1 min-w-0"><p class="font-display font-extrabold f15 truncate">${s.name}</p>
      <p class="f12 soft">${j.area || ""} · ${j.date || ""} · ${j.slot || ""}</p></div>
      <span class="font-display font-extrabold f15">${gh(j.total || 0)}</span></div>
      ${j.desc ? `<p class="f13 soft mt-2">“${escapeHtml(j.desc)}”</p>` : ""}
      <button class="btn-dark mt-2 w-full font-display font-bold f14 rounded-2xl py-3 mh50">Apply for this job</button>`;
    el.querySelector("button").onclick = () => applyForJob(j);
    box.appendChild(el);
  });
}
async function applyForJob(j) {
  if (!LIVE_DB) { toast("Backend not connected yet — add your Supabase keys in public/config.js"); return; }
  if (!S.profile || S.profile.role !== "artisan" || !Auth.googleUid()) { toast("Log in as an artisan to apply"); show("account"); return; }
  try {
    await Backend.apply(j);
    toast("Application sent — the customer will review it");
  } catch (e) { toast("Could not apply — you may have already applied"); }
}

/* ---------- admin dashboard (ServePoint: providers, customers, categories) ---------- */
let adminTab = "overview";
function adminFmtDate(iso) { try { return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }); } catch (e) { return ""; } }
function adminInitial(name) { const s = String(name || "S").trim(); return (s[0] || "S").toUpperCase(); }
function setAdminTab(t) { adminTab = t; renderAdmin(); }
function adminStatusPill(st) {
  if (st === "accepted") return '<span class="sp-pill sp-pill-green">Approved</span>';
  if (st === "declined" || st === "withdrawn") return '<span class="sp-pill sp-pill-gray">Declined</span>';
  return '<span class="sp-pill sp-pill-amber">Awaiting review</span>';
}
async function approveApplication(id) {
  if (!LIVE_DB) { toast("Backend not connected yet — add your Supabase keys in public/config.js"); return; }
  try { await Backend.setApplication(id, "accepted"); toast("Approved — the artisan can start"); }
  catch (e) { toast("Could not approve — check your connection"); }
  renderAdmin();
}
async function suspendApplication(id) {
  if (!LIVE_DB) { toast("Backend not connected yet — add your Supabase keys in public/config.js"); return; }
  try { await Backend.setApplication(id, "declined"); toast("Application suspended"); }
  catch (e) { toast("Could not suspend — check your connection"); }
  renderAdmin();
}
function adminSetupCard(msg) {
  return `<div class="sp-card"><p class="sp-card-title">Backend not connected</p>
    <p class="f13 sp-soft mt-1">${msg || "Add your Supabase URL + anon key in public/config.js and sign in with Google to see live numbers here."}</p></div>`;
}
async function renderAdmin() {
  const g = Auth.googleUid();
  try { document.getElementById("adminDate").textContent = new Date().toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long", year: "numeric" }); } catch (e) {}
  const roleEl = document.getElementById("adminRole");
  if (roleEl) roleEl.textContent = (S.profile && g) ? "Admin" : "Guest";
  const av = document.getElementById("adminAvatar");
  if (av) av.textContent = adminInitial(S.profile && S.profile.name);
  document.querySelectorAll("#adminTabs button").forEach(b => b.classList.toggle("on", b.dataset.atab === adminTab));
  const crumb = document.getElementById("adminCrumb");
  if (crumb) crumb.textContent = { overview: "Overview", providers: "Providers", customers: "Customers", categories: "Categories & listings" }[adminTab] || "Overview";
  const statsBox = document.getElementById("adminStats");
  const content = document.getElementById("adminContent");
  if (!statsBox || !content) return;
  if (!LIVE_DB) {
    statsBox.innerHTML = `<div class="sp-card sp-stat"><p class="sp-stat-num">–</p><p class="sp-stat-label">Live stats need keys</p></div>` + adminSetupCard();
    content.innerHTML = adminSetupCard("Provider applications, artisans and bookings appear here once the backend is connected.");
    return;
  }
  let open = [], artisans = [], mine = [];
  try { open = await Backend.openJobs(); } catch (e) { open = []; }
  try { artisans = await Backend.artisans(); } catch (e) { artisans = []; }
  try { mine = await Backend.list(); } catch (e) { mine = []; }
  let apps = [];
  if (g && S.profile && S.profile.role !== "artisan") {
    for (const b of mine.slice(0, 20)) {
      try {
        const rows = await Backend.applicants(b.id);
        rows.forEach(a => { a._booking = b; apps.push(a); });
      } catch (e) {}
    }
  }
  const toReview = apps.filter(a => a.status === "pending").length;
  statsBox.innerHTML =
    `<div class="sp-card sp-stat"><p class="sp-stat-num">${open.length}</p><p class="sp-stat-label">Open requests</p></div>
     <div class="sp-card sp-stat"><p class="sp-stat-num">${artisans.length}</p><p class="sp-stat-label">Registered artisans</p></div>
     <div class="sp-card sp-stat"><p class="sp-stat-num">${toReview}</p><p class="sp-stat-label">Requires review</p></div>
     <div class="sp-card sp-stat sp-stat-calm"><p class="sp-stat-msg">You're all caught up</p><p class="sp-stat-label">New updates will appear here.</p></div>`;
  if (adminTab === "overview") {
    if (!g) {
      content.innerHTML = `<div class="sp-card"><p class="sp-card-title">Sign in to review applications</p>
        <p class="f13 sp-soft mt-1">Provider applications on your job posts appear here once you sign in with Google.</p>
        <button class="sp-btn-dark mt-3" data-goto="account">Sign in with Google</button></div>`;
      return;
    }
    if (!apps.length) {
      content.innerHTML = `<div class="sp-card"><p class="sp-card-title">Provider applications</p>
        <p class="f13 sp-soft mt-1">No applications yet. Post a job from Home and artisan applications will appear here for review.</p></div>`;
      return;
    }
    content.innerHTML = `<div class="sp-card sp-table-card">
      <div class="sp-table-head"><div><p class="sp-card-title">Provider applications</p>
      <p class="f12 sp-soft">Review new providers before they appear to customers.</p></div>
      <span class="sp-pill sp-pill-amber">${toReview} to review</span></div>
      <div class="sp-table">${apps.map(a => {
        const b = a._booking || {};
        const s = svc(b.serviceId) || { name: b.serviceId || a.trade || "" };
        return `<div class="sp-row">
          <div class="sp-cell-main"><b>${escapeHtml(a.artisan_name || "Artisan")}</b><i>${escapeHtml(s.name || "")} · ★ ${Number(a.rating || 5).toFixed(1)} · ${Number(a.jobs || 0)} jobs</i></div>
          <div class="sp-cell"><span class="sp-th">Category</span>${escapeHtml(a.trade || s.name || "—")}</div>
          <div class="sp-cell"><span class="sp-th">Date joined</span>${adminFmtDate(a.created_at)}</div>
          <div class="sp-cell"><span class="sp-th">Status</span>${adminStatusPill(a.status)}</div>
          <div class="sp-cell sp-cell-act"><span class="sp-th">Action</span><span class="sp-actions">
            ${a.status === "pending" ? `<button class="sp-approve" data-app-ok="${a.id}">✓ Approve</button>` : ""}
            ${a.status !== "declined" ? `<button class="sp-suspend" data-app-no="${a.id}">Suspend</button>` : '<span class="f12 sp-soft">—</span>'}
          </span></div>
        </div>`;
      }).join("")}</div></div>`;
    content.querySelectorAll("[data-app-ok]").forEach(b => { b.onclick = () => approveApplication(b.dataset.appOk); });
    content.querySelectorAll("[data-app-no]").forEach(b => { b.onclick = () => suspendApplication(b.dataset.appNo); });
  } else if (adminTab === "providers") {
    content.innerHTML = artisans.length ? `<div class="sp-card sp-table-card">
      <div class="sp-table-head"><div><p class="sp-card-title">Providers</p>
      <p class="f12 sp-soft">${artisans.length} verified artisan${artisans.length === 1 ? "" : "s"}, highest rated first.</p></div></div>
      <div class="sp-table">${artisans.map((p, i) => `<div class="sp-row">
        <div class="sp-cell-main"><b>${escapeHtml(p.name || "Artisan")}${i === 0 ? ' <span class="sp-star">★ Top rated</span>' : ""}</b><i>${escapeHtml(p.area || "")}</i></div>
        <div class="sp-cell"><span class="sp-th">Trade</span>${escapeHtml(p.trade || "—")}</div>
        <div class="sp-cell"><span class="sp-th">Rating</span>★ ${Number(p.rating || 5).toFixed(1)}</div>
        <div class="sp-cell"><span class="sp-th">Jobs</span>${Number(p.jobs || 0)}</div>
      </div>`).join("")}</div></div>`
      : adminSetupCard(g ? "No artisans have joined yet. Artisans appear here once they sign in and save a trade." : undefined);
  } else if (adminTab === "customers") {
    content.innerHTML = mine.length ? `<div class="sp-card sp-table-card">
      <div class="sp-table-head"><div><p class="sp-card-title">Customers</p>
      <p class="f12 sp-soft">Bookings on this device${g ? " and your account" : ""}.</p></div></div>
      <div class="sp-table">${mine.slice(0, 30).map(b => {
        const s = svc(b.serviceId) || { name: b.serviceId };
        return `<div class="sp-row">
          <div class="sp-cell-main"><b>${escapeHtml(b.id)}</b><i>${escapeHtml(b.area || "")}</i></div>
          <div class="sp-cell"><span class="sp-th">Service</span>${escapeHtml(s.name || "")}</div>
          <div class="sp-cell"><span class="sp-th">Date</span>${escapeHtml(b.date || "")}</div>
          <div class="sp-cell"><span class="sp-th">Status</span>${adminStatusPill(b.status === "open" ? "pending" : (["paid", "completed"].includes(b.status) ? "accepted" : "pending"))}<span class="f12 sp-soft"> ${escapeHtml(b.status)}</span></div>
          <div class="sp-cell"><span class="sp-th">Total</span>${gh(Number(b.total || 0))}</div>
        </div>`;
      }).join("")}</div></div>`
      : adminSetupCard("No bookings yet. New customer bookings will appear here.");
  } else {
    content.innerHTML = `<div class="sp-card sp-table-card">
      <div class="sp-table-head"><div><p class="sp-card-title">Categories & listings</p>
      <p class="f12 sp-soft">5 trades, live open counts.</p></div></div>
      <div class="sp-table">${SERVICES.map(s => {
        const n = open.filter(j => j.serviceId === s.id).length;
        return `<div class="sp-row">
          <div class="sp-cell-main sp-catcell"><span class="sp-caticon ${tintCls(s)}">${svcIcon(s, "w-5 h-5")}</span><span><b>${s.name}</b><i>from ${gh(s.base)}</i></span></div>
          <div class="sp-cell"><span class="sp-th">Open listings</span>${n}</div>
          <div class="sp-cell"><span class="sp-th">Action</span><button class="sp-suspend" data-cat="${s.id}">New booking</button></div>
        </div>`;
      }).join("")}</div></div>`;
    content.querySelectorAll("[data-cat]").forEach(b => { b.onclick = () => startBooking(b.dataset.cat); });
  }
}
function renderUpcoming() {
  const wrap = document.getElementById("upcomingWrap"), box = document.getElementById("upcomingCard");
  if (!wrap || !box) return;
  const a = S.bookings.find(b => b.id === S.activeId && ["dispatched", "enroute", "arrived", "working"].includes(b.status));
  const target = a || [...S.bookings].sort((x, y) => String(y.date).localeCompare(String(x.date)))[0];
  if (!target) { wrap.hidden = true; return; }
  wrap.hidden = false;
  const s = svc(target.serviceId) || { name: target.serviceId, tint: "#F1F5F9", color: "#4A5268", icon: "" };
  const t = TECHS[target.serviceId];
  box.innerHTML = "";
  const d = document.createElement("div");
  d.className = "glasscard p-4 flex items-center gap-3";
  d.innerHTML = `<span class="w-12 h-12 rounded-full grid place-items-center flex-none ${tintCls(s)}">${svcIcon(s, "w-6 h-6")}</span>
    <div class="flex-1 min-w-0"><p class="f11 font-bold uptime">${a ? "Arriving " + (target.etaMin || 15) + " min · " + target.slot : (target.date || "") + " · " + (target.slot || "")}</p>
    <p class="font-display font-extrabold f15 truncate">${s.name}</p>
    <p class="f12 soft truncate">${t ? t.name : (target.tech || "")} · ${target.area || ""}</p></div>
    <button class="chipx on flex-none" id="upcomingView">View</button>`;
  box.appendChild(d);
  document.getElementById("upcomingView").onclick = () => show(a ? "track" : "history");
}
document.getElementById("activeBannerBtn").onclick = () => show("track");
document.querySelectorAll("[data-start]").forEach(b => { b.onclick = () => startBooking(b.dataset.start); });
document.getElementById("areaPill").onclick = () => { locateUser({ silent: false }); };
applySenior();
renderCats("");