"use strict";

const crypto = require("node:crypto");
const { OAuth2Client } = require("google-auth-library");
const { createRateLimiter } = require("./rateLimit");

let clientInstance = null;
let customVerifier = null;

// Exact authorised origins for ServePoint
const ALLOWED_ORIGINS = new Set([
  "http://localhost:8000",
  "http://localhost:5173",
  "http://localhost:8443",
  "https://servepoint-o858.onrender.com",
]);

function isAllowedOrigin(origin) {
  if (!origin || typeof origin !== "string") return false;
  const normalized = origin.trim().replace(/\/$/, "");
  return ALLOWED_ORIGINS.has(normalized);
}

// In-memory single-use challenge store with automatic cleanup
const challenges = new Map();

function createAuthChallenge(opts = {}) {
  const origin = opts.origin || null;
  const ttlMs = opts.ttlMs || 5 * 60 * 1000; // 5 minutes standard lifetime
  const nonce = crypto.randomBytes(32).toString("hex");
  const challengeId = crypto.randomBytes(32).toString("hex");
  const now = Date.now();

  const challenge = {
    id: challengeId,
    nonce,
    origin,
    createdAt: now,
    expiresAt: now + ttlMs,
    consumed: false,
  };

  challenges.set(challengeId, challenge);

  // Lazy clean expired challenges
  if (challenges.size > 200) {
    for (const [id, ch] of challenges.entries()) {
      if (now > ch.expiresAt + 60000) challenges.delete(id);
    }
  }

  return challenge;
}

function getChallenge(challengeId) {
  if (!challengeId) return null;
  return challenges.get(challengeId) || null;
}

function getChallengeByNonce(nonce) {
  if (!nonce) return null;
  for (const challenge of challenges.values()) {
    if (challenge.nonce === nonce) return challenge;
  }
  return null;
}

function consumeChallenge(challengeId) {
  const ch = getChallenge(challengeId);
  if (ch) {
    ch.consumed = true;
  }
}

function setChallenge(challengeId, data) {
  challenges.set(challengeId, {
    id: challengeId,
    ...data,
  });
}

function clearChallenges() {
  challenges.clear();
}

// Rate limiter for password-confirmed account linking: max 5 failed attempts per 15-minute window
const accountLinkRateLimiter = createRateLimiter({
  max: 5,
  windowMs: 15 * 60 * 1000,
});

function getClient(clientId) {
  if (!clientInstance || clientInstance._clientId !== clientId) {
    clientInstance = new OAuth2Client(clientId);
  }
  return clientInstance;
}

/**
 * Verify a Google ID token using Google's official google-auth-library.
 * Validates:
 * - Cryptographic signature
 * - Audience (matches expectedAudience / GOOGLE_CLIENT_ID)
 * - Issuer (accounts.google.com or https://accounts.google.com)
 * - Expiration (exp claim)
 * - Email verified claim (email_verified)
 *
 * @param {string} idToken - The Google JWT credential from Google Identity Services
 * @param {string} expectedAudience - The configured GOOGLE_CLIENT_ID
 * @param {string} [expectedNonce] - Expected nonce claim for replay protection
 * @returns {Promise<object>} The verified token payload
 */
async function verifyGoogleIdToken(idToken, expectedAudience, expectedNonce) {
  if (customVerifier) {
    return customVerifier(idToken, expectedAudience, expectedNonce);
  }

  if (!idToken || typeof idToken !== "string") {
    const err = new Error("Google ID token is required.");
    err.statusCode = 400;
    throw err;
  }

  if (!expectedAudience) {
    const err = new Error("Server GOOGLE_CLIENT_ID configuration is missing.");
    err.statusCode = 503;
    throw err;
  }

  const client = getClient(expectedAudience);
  let ticket;
  try {
    ticket = await client.verifyIdToken({
      idToken,
      audience: expectedAudience,
    });
  } catch (verifyErr) {
    const err = new Error(`Google token verification failed: ${verifyErr.message}`);
    err.statusCode = 401;
    throw err;
  }

  const payload = ticket.getPayload();
  if (!payload || !payload.sub) {
    const err = new Error("Invalid Google token payload (missing subject claim).");
    err.statusCode = 401;
    throw err;
  }

  // Validate issuer
  const validIssuers = ["accounts.google.com", "https://accounts.google.com"];
  if (!validIssuers.includes(payload.iss)) {
    const err = new Error(`Invalid token issuer: ${payload.iss}`);
    err.statusCode = 401;
    throw err;
  }

  // Validate audience
  if (payload.aud !== expectedAudience) {
    const err = new Error(`Token audience mismatch: expected ${expectedAudience}, got ${payload.aud}`);
    err.statusCode = 401;
    throw err;
  }

  // Validate expiration
  if (payload.exp && payload.exp * 1000 < Date.now()) {
    const err = new Error("Google ID token has expired.");
    err.statusCode = 401;
    throw err;
  }

  // Validate email verified claim
  if (payload.email_verified !== true && payload.email_verified !== "true") {
    const err = new Error("Google account email address is not verified.");
    err.statusCode = 401;
    throw err;
  }

  // Validate nonce if expectedNonce provided
  if (expectedNonce && payload.nonce !== expectedNonce) {
    const err = new Error("Security nonce mismatch in Google ID token.");
    err.statusCode = 401;
    throw err;
  }

  return payload;
}

/**
 * For unit tests: allow injecting a mock verifier to avoid network dependencies
 */
function setGoogleTokenVerifier(verifier) {
  customVerifier = verifier;
}

function resetGoogleTokenVerifier() {
  customVerifier = null;
}

module.exports = {
  verifyGoogleIdToken,
  setGoogleTokenVerifier,
  resetGoogleTokenVerifier,
  createAuthChallenge,
  getChallenge,
  getChallengeByNonce,
  consumeChallenge,
  setChallenge,
  clearChallenges,
  isAllowedOrigin,
  ALLOWED_ORIGINS,
  accountLinkRateLimiter,
};

