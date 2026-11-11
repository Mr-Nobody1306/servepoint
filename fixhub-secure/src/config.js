"use strict";
/* Central configuration. The Groq key is read here — once, at startup —
   from the .env file / environment, into process memory only.
   Nothing in public/ can ever reach it. */
const fs = require("node:fs");
const path = require("node:path");
const ROOT_DIR = path.join(__dirname, "..");
function loadDotEnv(file) {
  try {
    if (!fs.existsSync(file)) return;
    const lines = fs.readFileSync(file, "utf8").split("\n");
    for (const line of lines) {
      const t = line.trim();
      if (!t || t.charAt(0) === "#") continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if (v.length >= 2 && ((v.charAt(0) === '"' && v.slice(-1) === '"') || (v.charAt(0) === "'" && v.slice(-1) === "'"))) v = v.slice(1, -1);
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch (err) { console.error("[config] could not read .env:", err.message); }
}
function loadConfig() {
  loadDotEnv(path.join(ROOT_DIR, ".env"));
  const cfg = {
    port: Number(process.env.PORT || 8000),
    groqBaseUrl: String(process.env.GROQ_BASE_URL || "https://api.groq.com/openai/v1").replace(/\/+$/, ""),
    groqModel: process.env.GROQ_MODEL || "llama-3.1-8b-instant",
    groqKey: process.env.GROQ_API_KEY || "",
    rootDir: ROOT_DIR,
    publicDir: path.join(ROOT_DIR, "public"),
    maxBodyBytes: 64 * 1024,
    maxMessages: 12,
    maxMessageChars: 2000,
    upstreamTimeoutMs: 30000,
    chatMaxPerMin: 30,
    // HSTS rollout: start short (300s) so a bad TLS setup self-heals fast.
    // Once HTTPS is stable, raise to 86400, then 31536000 (about a year).
    // HSTS_INCLUDE_SUBDOMAINS=1 only at the final stage.
    hstsMaxAge: process.env.HSTS_MAX_AGE !== undefined && process.env.HSTS_MAX_AGE !== "" ? Number(process.env.HSTS_MAX_AGE) : 300,
    hstsSubdomains: process.env.HSTS_INCLUDE_SUBDOMAINS === "1",
    // HTTP -> HTTPS redirect. Default OFF — only set FORCE_HTTPS=1 when TLS
    // is terminated in front of this server (host TLS + X-Forwarded-Proto).
    forceHttps: process.env.FORCE_HTTPS === "1"
  };
  if (!Number.isInteger(cfg.hstsMaxAge) || cfg.hstsMaxAge < 0) throw new Error("[config] HSTS_MAX_AGE must be an integer >= 0 (0 disables the header)");
  if (!Number.isInteger(cfg.port) || cfg.port < 1 || cfg.port > 65535) throw new Error("[config] PORT must be 1-65535");
  const httpsRe = new RegExp("^https://");
  if (!httpsRe.test(cfg.groqBaseUrl)) throw new Error("[config] GROQ_BASE_URL must start with https://");
  if (!cfg.groqModel) throw new Error("[config] GROQ_MODEL must not be empty");
  return Object.freeze(cfg);
}
module.exports = loadConfig();
