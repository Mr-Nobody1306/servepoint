"use strict";
/* POST /api/chat — validates the browser's request, asks Groq with the
   server-held key + server-side instructions, and returns a small
   structured answer: { reply, service, detail, providers }. Browser errors generic. */
const modStatic = require("./static");
const sendJson = modStatic.sendJson;
const persona = require("./persona");
const ai = require("./ai");
const dataStore = require("./dataStore");

const SERVICES = [
  "plumbing",
  "electrical",
  "carpentry",
  "painting",
  "masonry",
  "cleaning",
  "appliances",
  "hvac",
  "assembly"
];

const CATEGORY_KEYWORDS = {
  plumbing: ["plumb", "pipe", "drain", "water tank", "leak", "tap"],
  electrical: ["electr", "wiring", "socket", "breaker", "generator"],
  carpentry: ["carpent", "wood", "cabinet", "shelf", "furniture", "door"],
  painting: ["paint", "finishing", "wall coat"],
  masonry: ["mason", "tile", "tiling", "brick", "paving", "plaster"],
  cleaning: ["clean", "sanit", "wash", "scrub", "janitor"],
  appliances: ["appliance", "fridge", "refrigerator", "washing machine", "microwave", "stove"],
  hvac: ["hvac", "ac", "air condition", "ventilat", "cooling"],
  assembly: ["assembl", "install", "mounting", "curtain", "tv mount"]
};

function readBody(req, maxBytes) {
  return new Promise(function (resolve, reject) {
    let size = 0;
    const chunks = [];
    req.on("data", function (c) { size += c.length; if (size > maxBytes) { reject(new Error("body_too_large")); req.destroy(); return; } chunks.push(c); });
    req.on("end", function () { resolve(Buffer.concat(chunks).toString("utf8")); });
    req.on("error", reject);
  });
}

function parseAnswer(content) {
  const text = String(content || "").trim();
  const tailRe = /\{[\s\S]*\}\s*$/;
  const withoutJson = text.replace(tailRe, "").trim();
  const fallbackReply = (withoutJson || "Hmm, I didn't catch that — which area is the problem in?").slice(0, 600);
  try {
    const m = text.match(tailRe);
    if (!m) return { reply: fallbackReply, service: null, detail: "" };
    const o = JSON.parse(m[0]);
    if (!o || typeof o.reply !== "string" || !o.reply.trim()) return { reply: fallbackReply, service: null, detail: "" };
    const service = SERVICES.indexOf(o.service) !== -1 ? o.service : null;
    const detail = (typeof o.detail === "string" ? o.detail.trim() : "").slice(0, 160);
    return { reply: o.reply.trim().slice(0, 600), service: service, detail: service ? detail : "" };
  } catch (e) { return { reply: fallbackReply, service: null, detail: "" }; }
}

function matchesCategory(provider, categoryId) {
  if (!provider || !categoryId) return false;
  const cat = String(categoryId).toLowerCase().trim();
  const provCat = String(provider.category || "").toLowerCase();
  const provTrade = String(provider.trade || "").toLowerCase();
  if (provCat === cat || provTrade === cat) return true;
  if (provCat.includes(cat) || provTrade.includes(cat)) return true;

  const keywords = CATEGORY_KEYWORDS[cat] || [cat];
  for (const kw of keywords) {
    if (provCat.includes(kw) || provTrade.includes(kw)) return true;
  }
  if (Array.isArray(provider.services)) {
    for (const s of provider.services) {
      const sName = String(s.name || "").toLowerCase();
      const sDesc = String(s.description || "").toLowerCase();
      const sCat = String(s.category || "").toLowerCase();
      if (sCat === cat || sName.includes(cat)) return true;
      for (const kw of keywords) {
        if (sName.includes(kw) || sDesc.includes(kw)) return true;
      }
    }
  }
  return false;
}

function sanitizePublicProvider(p) {
  if (!p) return null;
  return {
    id: p.id,
    name: p.name,
    trade: p.trade || p.category || "",
    category: p.category || p.trade || "",
    rating: typeof p.rating === "number" ? p.rating : 5.0,
    jobs: typeof p.jobs === "number" ? p.jobs : 0,
    price: typeof p.price === "number" ? p.price : 0,
    area: p.area || "",
    initials: p.initials || (p.name ? p.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase() : ""),
    color: p.color || "#829d9a",
    image: p.image || "",
    bio: p.bio || "",
    services: Array.isArray(p.services) ? p.services.map(s => ({
      name: s.name,
      price: s.price,
      billing: s.billing || "Fixed price",
      description: s.description || ""
    })) : [],
    availability: p.availability || null
  };
}

function getMatchingProviders(categoryId) {
  if (!categoryId) return [];
  const providers = dataStore.getProviders(false);
  return providers
    .filter(p => !p.suspended && matchesCategory(p, categoryId))
    .map(sanitizePublicProvider);
}

async function handleChat(req, res, ctx) {
  const config = ctx.config;
  const limiter = ctx.limiter;
  const ip = req.socket.remoteAddress || "unknown";
  if (limiter.isLimited(ip)) return sendJson(res, 429, { error: "Too many requests — please wait a minute." });
  let raw;
  try { raw = await readBody(req, config.maxBodyBytes); }
  catch (e) { return sendJson(res, 413, { error: "Request too large." }); }
  let data;
  try { data = JSON.parse(raw); }
  catch (e) { return sendJson(res, 400, { error: "Invalid JSON." }); }
  if (!data || !Array.isArray(data.messages) || data.messages.length === 0 || data.messages.length > config.maxMessages) {
    return sendJson(res, 400, { error: "Send 1-" + config.maxMessages + " messages." });
  }
  const clean = [];
  for (const m of data.messages) {
    if (!m || (m.role !== "user" && m.role !== "assistant") || typeof m.content !== "string") return sendJson(res, 400, { error: "Bad message format." });
    const content = m.content.slice(0, config.maxMessageChars);
    if (!content.trim()) return sendJson(res, 400, { error: "Empty message." });
    clean.push({ role: m.role, content: content });
  }
  if (!config.groqKey) return sendJson(res, 503, { error: "Server AI is not configured yet." });
  const payload = [{ role: "system", content: persona.systemPrompt() }].concat(clean);
  try {
    const content = await ai.completeGroq({ baseUrl: config.groqBaseUrl, model: config.groqModel, apiKey: config.groqKey }, payload, { timeoutMs: config.upstreamTimeoutMs });
    const parsed = parseAnswer(content);
    const providers = parsed.service ? getMatchingProviders(parsed.service) : [];
    return sendJson(res, 200, Object.assign({}, parsed, { providers }));
  } catch (err) {
    console.error("[chat]", err && err.code ? err.code : err);
    if (err && err.code === "BAD_KEY") return sendJson(res, 502, { error: "Server key rejected — contact the site owner." });
    return sendJson(res, 502, { error: "AI provider failed — try again." });
  }
}

module.exports = {
  handleChat: handleChat,
  parseAnswer: parseAnswer,
  SERVICES: SERVICES,
  matchesCategory: matchesCategory,
  getMatchingProviders: getMatchingProviders,
  sanitizePublicProvider: sanitizePublicProvider
};
