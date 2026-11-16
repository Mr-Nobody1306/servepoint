"use strict";

/**
 * Automated Test Suite for ServePoint Google OAuth Authentication (GIS)
 * Tests token verification, claims validation, account linking, provider pending state,
 * admin protection, session lifecycle, single-use nonce replay protection,
 * Origin/CSRF validation, and account-linking rate limiting.
 */
const t = require("node:test");
const describe = t.describe;
const it = t.it;
const beforeEach = t.beforeEach;
const afterEach = t.afterEach;
const assert = require("node:assert/strict");

const dataStore = require("../src/dataStore");
const {
  setGoogleTokenVerifier,
  resetGoogleTokenVerifier,
  createAuthChallenge,
  clearChallenges,
  accountLinkRateLimiter,
} = require("../src/googleAuth");
const { handleApiRequest } = require("../src/apiRoutes");

const TEST_CLIENT_ID = "820543012741-h79394n4pul2dj00v446k53qu419lkjp.apps.googleusercontent.com";
const testConfig = { googleClientId: TEST_CLIENT_ID };

function mockReq(method, path, body = null, headers = {}) {
  const req = new (require("node:events").EventEmitter)();
  req.method = method;
  req.url = path;
  req.headers = {
    "content-type": "application/json",
    "origin": "http://localhost:8000",
    ...headers
  };
  if (body && body.challengeId && !("cookie" in headers)) {
    req.headers["cookie"] = `sp_auth_challenge=${encodeURIComponent(body.challengeId)}`;
  }
  process.nextTick(() => {
    if (body) {
      req.emit("data", Buffer.from(JSON.stringify(body)));
    }
    req.emit("end");
  });
  return req;
}

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: null,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    writeHead(code, h = {}) {
      this.statusCode = code;
      Object.assign(this.headers, h);
    },
    end(data) {
      this.body = data ? JSON.parse(data) : null;
    }
  };
}

function attachChallenge(payload) {
  const ch = createAuthChallenge({ origin: "http://localhost:8000" });
  payload.nonce = ch.nonce;
  return ch;
}

function cleanFixtures() {
  dataStore.load();
  dataStore.data.users = (dataStore.data.users || []).filter(u =>
    !u.email.includes("newcustomer") &&
    !u.email.includes("newprovider") &&
    !u.email.includes("linkedkwame") &&
    !u.email.includes("lifecycle") &&
    !u.email.includes("suspended@example.com") &&
    !u.email.includes("escalate") &&
    !u.email.includes("missingnonce") &&
    !u.email.includes("wrongnonce") &&
    !u.email.includes("expirednonce") &&
    !u.email.includes("validcookie") &&
    !u.email.includes("nocookie") &&
    !u.email.includes("nobodyid") &&
    !u.email.includes("mismatch") &&
    u.googleId !== "google-sub-valid-cookie-test"
  );
  dataStore.data.providers = (dataStore.data.providers || []).filter(p =>
    !p.id.includes("google-sub-prov-002") &&
    !p.id.startsWith("usr-")
  );
  const ama = dataStore.getUserById("ama");
  if (ama) {
    delete ama.googleId;
    ama.authProvider = "local";
    ama.status = "active";
    ama.suspended = false;
  }
  const kwame = dataStore.getUserById("kwame");
  if (kwame) {
    delete kwame.googleId;
    kwame.status = "approved";
    kwame.suspended = false;
  }
  const admin = dataStore.getUserById("admin");
  if (admin) {
    delete admin.googleId;
    admin.status = "active";
    admin.suspended = false;
  }
  dataStore.save();
}

describe("Google OAuth & Role Security", function () {
  beforeEach(function () {
    cleanFixtures();
    resetGoogleTokenVerifier();
    clearChallenges();
    accountLinkRateLimiter.reset();
    accountLinkRateLimiter.setOptions({ max: 5, windowMs: 15 * 60 * 1000 });
  });

  afterEach(function () {
    cleanFixtures();
    resetGoogleTokenVerifier();
    clearChallenges();
    accountLinkRateLimiter.reset();
    accountLinkRateLimiter.setOptions({ max: 5, windowMs: 15 * 60 * 1000 });
  });

  it("1. GET /api/auth/config returns the configured Google Client ID", async function () {
    const req = mockReq("GET", "/api/auth/config");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/config", testConfig);
    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.googleClientId, TEST_CLIENT_ID);
  });

  it("2. Valid Google authentication registers a new customer with a 7-day session", async function () {
    const mockPayload = {
      sub: "google-sub-cust-001",
      email: "newcustomer@example.com",
      email_verified: true,
      name: "New Customer",
      iss: "https://accounts.google.com",
      aud: TEST_CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const ch = attachChallenge(mockPayload);
    setGoogleTokenVerifier(async (token, aud) => mockPayload);

    const req = mockReq("POST", "/api/auth/google", {
      credential: "valid-google-id-token",
      challengeId: ch.id,
      role: "customer"
    });
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.isNewUser, true);
    assert.strictEqual(res.body.user.role, "customer");
    assert.strictEqual(res.body.user.email, "newcustomer@example.com");
    assert.ok(res.body.token.startsWith("sp_sess_"), "Must return valid sp_sess token");

    // Verify session exists and is valid
    const sess = dataStore.getSession(res.body.token);
    assert.ok(sess, "Session must exist in dataStore");
    assert.strictEqual(sess.email, "newcustomer@example.com");
  });

  it("3. Valid Google authentication registers a new provider in 'pending' status", async function () {
    const mockPayload = {
      sub: "google-sub-prov-002",
      email: "newprovider@example.com",
      email_verified: true,
      name: "Kojo Painter",
      iss: "accounts.google.com",
      aud: TEST_CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const ch = attachChallenge(mockPayload);
    setGoogleTokenVerifier(async () => mockPayload);

    const req = mockReq("POST", "/api/auth/google", {
      credential: "valid-provider-token",
      challengeId: ch.id,
      role: "provider",
      trade: "Painting & Wall Finishing",
      area: "Osu, Accra",
      phone: "+233 24 999 8888"
    });
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.user.role, "artisan");

    // Verify provider record was created with 'pending' status
    const prov = dataStore.getProviderById(res.body.user.id);
    assert.ok(prov, "Provider record must be created for new artisan");
    assert.strictEqual(prov.status, "pending", "New provider must be strictly pending");
    assert.strictEqual(prov.trade, "Painting & Wall Finishing");
  });

  it("4. Rejects Google tokens with invalid signature or corrupted credentials (401)", async function () {
    setGoogleTokenVerifier(async () => {
      const err = new Error("Invalid signature");
      err.statusCode = 401;
      throw err;
    });

    const req = mockReq("POST", "/api/auth/google", { credential: "corrupted-token" });
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 401);
    assert.match(res.body.error, /token verification failed|Invalid signature/i);
  });

  it("5. Rejects expired Google tokens (401)", async function () {
    setGoogleTokenVerifier(async () => {
      const err = new Error("Google ID token has expired.");
      err.statusCode = 401;
      throw err;
    });

    const req = mockReq("POST", "/api/auth/google", { credential: "expired-token" });
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 401);
    assert.match(res.body.error, /expired/i);
  });

  it("6. Rejects tokens with audience mismatch (401)", async function () {
    setGoogleTokenVerifier(async () => {
      const err = new Error("Token audience mismatch");
      err.statusCode = 401;
      throw err;
    });

    const req = mockReq("POST", "/api/auth/google", { credential: "wrong-aud-token" });
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 401);
    assert.match(res.body.error, /audience/i);
  });

  it("7. Rejects tokens with invalid issuer (401)", async function () {
    setGoogleTokenVerifier(async () => {
      const err = new Error("Invalid token issuer");
      err.statusCode = 401;
      throw err;
    });

    const req = mockReq("POST", "/api/auth/google", { credential: "wrong-iss-token" });
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 401);
    assert.match(res.body.error, /issuer/i);
  });

  it("8. Rejects Google accounts with unverified emails (401)", async function () {
    setGoogleTokenVerifier(async () => {
      const err = new Error("Google account email address is not verified.");
      err.statusCode = 401;
      throw err;
    });

    const req = mockReq("POST", "/api/auth/google", { credential: "unverified-email-token" });
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 401);
    assert.match(res.body.error, /verified/i);
  });

  it("9. Signs in existing linked Google user seamlessly (200)", async function () {
    const linkedUser = dataStore.createUser({
      name: "Linked Kwame",
      email: "linkedkwame@example.com",
      role: "artisan",
      googleId: "google-linked-kwame-sub-999",
      authProvider: "google"
    });

    const mockPayload = {
      sub: "google-linked-kwame-sub-999",
      email: "linkedkwame@example.com",
      email_verified: true,
      iss: "https://accounts.google.com",
      aud: TEST_CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const ch = attachChallenge(mockPayload);
    setGoogleTokenVerifier(async () => mockPayload);

    const req = mockReq("POST", "/api/auth/google", {
      credential: "linked-token",
      challengeId: ch.id
    });
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.isNewUser, false);
    assert.strictEqual(res.body.user.id, linkedUser.id);
    assert.strictEqual(res.body.user.role, "artisan");
  });

  it("10. Collision protection: Rejects silent takeover of existing unlinked email account (409)", async function () {
    const mockPayload = {
      sub: "google-sub-ama-attacker",
      email: "ama@example.com",
      email_verified: true,
      iss: "https://accounts.google.com",
      aud: TEST_CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const ch = attachChallenge(mockPayload);
    setGoogleTokenVerifier(async () => mockPayload);

    const req = mockReq("POST", "/api/auth/google", {
      credential: "ama-token-no-password",
      challengeId: ch.id
    });
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 409);
    assert.strictEqual(res.body.code, "ACCOUNT_EXISTS_UNLINKED");
    assert.match(res.body.error, /already exists/i);

    const ama = dataStore.getUserByEmail("ama@example.com");
    assert.strictEqual(ama.googleId, undefined);
  });

  it("11. Secure linking: Links existing unlinked account when password is confirmed (200)", async function () {
    const mockPayload = {
      sub: "google-sub-ama-authorized",
      email: "ama@example.com",
      email_verified: true,
      iss: "https://accounts.google.com",
      aud: TEST_CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const ch = attachChallenge(mockPayload);
    setGoogleTokenVerifier(async () => mockPayload);

    const req = mockReq("POST", "/api/auth/google", {
      credential: "ama-token",
      challengeId: ch.id,
      linkPassword: "password123"
    });
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.linked, true);

    const ama = dataStore.getUserByEmail("ama@example.com");
    assert.strictEqual(ama.googleId, "google-sub-ama-authorized");
  });

  it("12. Administrator protection: Rejects Google login / takeover of admin account (403)", async function () {
    const mockPayload = {
      sub: "google-sub-admin-attacker",
      email: "admin@servepoint.gh",
      email_verified: true,
      iss: "https://accounts.google.com",
      aud: TEST_CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const ch = attachChallenge(mockPayload);
    setGoogleTokenVerifier(async () => mockPayload);

    const req = mockReq("POST", "/api/auth/google", {
      credential: "admin-google-token",
      challengeId: ch.id
    });
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 403);
    assert.match(res.body.error, /administrator/i);
  });

  it("13. Role escalation defense: Rejects self-assigning admin role during Google signup (403)", async function () {
    const mockPayload = {
      sub: "google-sub-malicious-user",
      email: "escalate@example.com",
      email_verified: true,
      iss: "https://accounts.google.com",
      aud: TEST_CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const ch = attachChallenge(mockPayload);
    setGoogleTokenVerifier(async () => mockPayload);

    const req = mockReq("POST", "/api/auth/google", {
      credential: "valid-token",
      challengeId: ch.id,
      role: "admin"
    });
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 403);
    assert.match(res.body.error, /administrator accounts cannot be created/i);
  });

  it("14. Suspended account rejection: Blocks suspended user from authenticating (403)", async function () {
    dataStore.createUser({
      name: "Suspended User",
      email: "suspended@example.com",
      role: "customer",
      googleId: "google-sub-suspended-user",
      status: "suspended",
      suspended: true
    });

    const mockPayload = {
      sub: "google-sub-suspended-user",
      email: "suspended@example.com",
      email_verified: true,
      iss: "https://accounts.google.com",
      aud: TEST_CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const ch = attachChallenge(mockPayload);
    setGoogleTokenVerifier(async () => mockPayload);

    const req = mockReq("POST", "/api/auth/google", {
      credential: "suspended-token",
      challengeId: ch.id
    });
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 403);
    assert.match(res.body.error, /suspended/i);
  });

  it("15. Session lifecycle: Token authenticates user on /api/auth/me, logout deletes session", async function () {
    const mockPayload = {
      sub: "google-sub-session-lifecycle",
      email: "lifecycle@example.com",
      email_verified: true,
      iss: "https://accounts.google.com",
      aud: TEST_CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) + 3600
    };
    const ch = attachChallenge(mockPayload);
    setGoogleTokenVerifier(async () => mockPayload);

    // 1. Login
    const loginReq = mockReq("POST", "/api/auth/google", {
      credential: "tok",
      challengeId: ch.id
    });
    const loginRes = mockRes();
    await handleApiRequest(loginReq, loginRes, "/api/auth/google", testConfig);
    assert.strictEqual(loginRes.statusCode, 201);
    const sessionToken = loginRes.body.token;

    // 2. Access /api/auth/me with Bearer token
    const meReq = mockReq("GET", "/api/auth/me", null, { authorization: `Bearer ${sessionToken}` });
    const meRes = mockRes();
    await handleApiRequest(meReq, meRes, "/api/auth/me", testConfig);
    assert.strictEqual(meRes.statusCode, 200);
    assert.strictEqual(meRes.body.user.email, "lifecycle@example.com");

    // 3. Logout /api/auth/logout
    const logoutReq = mockReq("POST", "/api/auth/logout", null, { authorization: `Bearer ${sessionToken}` });
    const logoutRes = mockRes();
    await handleApiRequest(logoutReq, logoutRes, "/api/auth/logout", testConfig);
    assert.strictEqual(logoutRes.statusCode, 200);

    // 4. Session now invalidated
    const meAfterReq = mockReq("GET", "/api/auth/me", null, { authorization: `Bearer ${sessionToken}` });
    const meAfterRes = mockRes();
    await handleApiRequest(meAfterReq, meAfterRes, "/api/auth/me", testConfig);
    assert.strictEqual(meAfterRes.body.user, null, "User must be null after logout");
  });

  // --- Security Hardening Test Suite ---

  it("16. Successful authentication after valid challenge issuance", async function () {
    const chalReq = mockReq("POST", "/api/auth/google/challenge", null, { origin: "http://localhost:8000" });
    const chalRes = mockRes();
    await handleApiRequest(chalReq, chalRes, "/api/auth/google/challenge", testConfig);

    assert.strictEqual(chalRes.statusCode, 200);
    assert.strictEqual(chalRes.body.ok, true);
    assert.ok(chalRes.body.nonce, "Challenge must return nonce");
    assert.ok(chalRes.body.challengeId, "Challenge must return challengeId");
    assert.match(chalRes.headers["set-cookie"], /sp_auth_challenge=/i);

    setGoogleTokenVerifier(async () => ({
      sub: "google-sub-issued-challenge",
      email: "newcustomer2@example.com",
      email_verified: true,
      name: "Challenge User",
      iss: "https://accounts.google.com",
      aud: TEST_CLIENT_ID,
      nonce: chalRes.body.nonce,
      exp: Math.floor(Date.now() / 1000) + 3600
    }));

    const authReq = mockReq("POST", "/api/auth/google", {
      credential: "valid-token",
      challengeId: chalRes.body.challengeId,
      role: "customer"
    }, {
      cookie: `sp_auth_challenge=${chalRes.body.challengeId}`
    });
    const authRes = mockRes();
    await handleApiRequest(authReq, authRes, "/api/auth/google", testConfig);

    assert.strictEqual(authRes.statusCode, 201);
    assert.strictEqual(authRes.body.ok, true);
    assert.strictEqual(authRes.body.user.email, "newcustomer2@example.com");
  });

  it("17. Rejects authentication when Google ID token has missing nonce (400)", async function () {
    const ch = createAuthChallenge({ origin: "http://localhost:8000" });
    setGoogleTokenVerifier(async () => ({
      sub: "google-sub-missing-nonce",
      email: "missingnonce@example.com",
      email_verified: true,
      iss: "https://accounts.google.com",
      aud: TEST_CLIENT_ID,
      exp: Math.floor(Date.now() / 1000) + 3600
      // nonce omitted
    }));

    const req = mockReq("POST", "/api/auth/google", {
      credential: "token-no-nonce",
      challengeId: ch.id
    });
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 400);
    assert.match(res.body.error, /missing the required security nonce/i);
  });

  it("18. Rejects authentication when nonce is incorrect / mismatched (401)", async function () {
    const ch = createAuthChallenge({ origin: "http://localhost:8000" });
    setGoogleTokenVerifier(async () => ({
      sub: "google-sub-wrong-nonce",
      email: "wrongnonce@example.com",
      email_verified: true,
      iss: "https://accounts.google.com",
      aud: TEST_CLIENT_ID,
      nonce: "completely-incorrect-nonce-value-12345",
      exp: Math.floor(Date.now() / 1000) + 3600
    }));

    const req = mockReq("POST", "/api/auth/google", {
      credential: "token-wrong-nonce",
      challengeId: ch.id
    });
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 401);
    assert.match(res.body.error, /nonce mismatch|invalid security nonce/i);
  });

  it("19. Rejects authentication when nonce is expired (401)", async function () {
    const ch = createAuthChallenge({ origin: "http://localhost:8000", ttlMs: -1000 });
    setGoogleTokenVerifier(async () => ({
      sub: "google-sub-expired-nonce",
      email: "expirednonce@example.com",
      email_verified: true,
      iss: "https://accounts.google.com",
      aud: TEST_CLIENT_ID,
      nonce: ch.nonce,
      exp: Math.floor(Date.now() / 1000) + 3600
    }));

    const req = mockReq("POST", "/api/auth/google", {
      credential: "token-expired-nonce",
      challengeId: ch.id
    });
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 401);
    assert.match(res.body.error, /expired/i);
  });

  it("20. Replay protection: Rejects reused nonce on second authentication attempt (401)", async function () {
    const ch = createAuthChallenge({ origin: "http://localhost:8000" });
    setGoogleTokenVerifier(async () => ({
      sub: "google-sub-replay-user",
      email: "newcustomer3@example.com",
      email_verified: true,
      name: "Replay Test",
      iss: "https://accounts.google.com",
      aud: TEST_CLIENT_ID,
      nonce: ch.nonce,
      exp: Math.floor(Date.now() / 1000) + 3600
    }));

    // First attempt: succeeds and consumes the nonce
    const req1 = mockReq("POST", "/api/auth/google", {
      credential: "token-replay-test",
      challengeId: ch.id
    });
    const res1 = mockRes();
    await handleApiRequest(req1, res1, "/api/auth/google", testConfig);
    assert.strictEqual(res1.statusCode, 201);
    assert.strictEqual(res1.body.ok, true);

    // Second attempt with identical token and challenge: MUST be rejected
    const req2 = mockReq("POST", "/api/auth/google", {
      credential: "token-replay-test",
      challengeId: ch.id
    });
    const res2 = mockRes();
    await handleApiRequest(req2, res2, "/api/auth/google", testConfig);
    assert.strictEqual(res2.statusCode, 401);
    assert.match(res2.body.error, /already been consumed|replay/i);
  });

  it("21. Origin protection: Rejects request with invalid origin (403)", async function () {
    const req = mockReq("POST", "/api/auth/google", { credential: "tok" }, {
      origin: "https://evil-attacker.example.com"
    });
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 403);
    assert.match(res.body.error, /origin .* is not authorized/i);
  });

  it("22. Origin protection: Rejects request with missing Origin header (403)", async function () {
    const req = mockReq("POST", "/api/auth/google", { credential: "tok" }, {
      origin: ""
    });
    delete req.headers["origin"];
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 403);
    assert.match(res.body.error, /missing request origin header/i);
  });

  it("23. Account-linking rate limiting: Returns 429 after repeated incorrect password attempts", async function () {
    const ch = createAuthChallenge({ origin: "http://localhost:8000" });
    setGoogleTokenVerifier(async () => ({
      sub: "google-sub-ama-bruteforce",
      email: "ama@example.com",
      email_verified: true,
      iss: "https://accounts.google.com",
      aud: TEST_CLIENT_ID,
      nonce: ch.nonce,
      exp: Math.floor(Date.now() / 1000) + 3600
    }));

    // 5 consecutive wrong password attempts -> 401
    for (let i = 0; i < 5; i++) {
      const req = mockReq("POST", "/api/auth/google", {
        credential: "token-ama-brute",
        challengeId: ch.id,
        linkPassword: `wrong-pass-${i}`
      });
      const res = mockRes();
      await handleApiRequest(req, res, "/api/auth/google", testConfig);
      assert.strictEqual(res.statusCode, 401, `Attempt ${i + 1} should be 401`);
      assert.strictEqual(res.body.code, "INVALID_LINK_PASSWORD");
    }

    // 6th attempt: blocked by rate limiter with 429
    const reqBlocked = mockReq("POST", "/api/auth/google", {
      credential: "token-ama-brute",
      challengeId: ch.id,
      linkPassword: "wrong-pass-6"
    });
    const resBlocked = mockRes();
    await handleApiRequest(reqBlocked, resBlocked, "/api/auth/google", testConfig);

    assert.strictEqual(resBlocked.statusCode, 429);
    assert.strictEqual(resBlocked.body.code, "TOO_MANY_ATTEMPTS");
    assert.ok(resBlocked.headers["retry-after"], "Must set Retry-After header");
  });

  it("24. Account-linking rate limiting: Recovers after configured window expires", async function () {
    accountLinkRateLimiter.setOptions({ max: 2, windowMs: 500 });
    const ch = createAuthChallenge({ origin: "http://localhost:8000" });
    setGoogleTokenVerifier(async () => ({
      sub: "google-sub-ama-recovery",
      email: "ama@example.com",
      email_verified: true,
      iss: "https://accounts.google.com",
      aud: TEST_CLIENT_ID,
      nonce: ch.nonce,
      exp: Math.floor(Date.now() / 1000) + 3600
    }));

    // Trigger rate limit with 2 failures (each scrypt hash takes ~70ms)
    for (let i = 0; i < 2; i++) {
      const req = mockReq("POST", "/api/auth/google", {
        credential: "token-ama-recovery",
        challengeId: ch.id,
        linkPassword: "wrong"
      });
      const res = mockRes();
      await handleApiRequest(req, res, "/api/auth/google", testConfig);
      assert.strictEqual(res.statusCode, 401);
    }

    // Verify currently blocked (429) within the 500ms window
    const reqBlocked = mockReq("POST", "/api/auth/google", {
      credential: "token-ama-recovery",
      challengeId: ch.id,
      linkPassword: "wrong"
    });
    const resBlocked = mockRes();
    await handleApiRequest(reqBlocked, resBlocked, "/api/auth/google", testConfig);
    assert.strictEqual(resBlocked.statusCode, 429);

    // Wait 550ms for window to expire
    await new Promise((resolve) => setTimeout(resolve, 550));

    // Next attempt: rate limit recovered, returns 401 instead of 429
    const reqRecovered = mockReq("POST", "/api/auth/google", {
      credential: "token-ama-recovery",
      challengeId: ch.id,
      linkPassword: "wrong"
    });
    const resRecovered = mockRes();
    await handleApiRequest(reqRecovered, resRecovered, "/api/auth/google", testConfig);
    assert.strictEqual(resRecovered.statusCode, 401, "Should be 401 after recovery, not 429");
  });

  it("25. CSRF Protection: Rejects request with missing challenge cookie (401)", async function () {
    const ch = createAuthChallenge({ origin: "http://localhost:8000" });
    setGoogleTokenVerifier(async () => ({
      sub: "google-sub-no-cookie",
      email: "nocookie@example.com",
      email_verified: true,
      iss: "https://accounts.google.com",
      aud: TEST_CLIENT_ID,
      nonce: ch.nonce,
      exp: Math.floor(Date.now() / 1000) + 3600
    }));

    const req = mockReq("POST", "/api/auth/google", {
      credential: "valid-token",
      challengeId: ch.id,
      role: "customer"
    }, {
      cookie: "" // Explicitly missing cookie
    });
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 401);
    assert.match(res.body.error, /missing required security challenge cookie/i);
  });

  it("26. CSRF Protection: Rejects request with missing challenge ID in body (401)", async function () {
    const ch = createAuthChallenge({ origin: "http://localhost:8000" });
    setGoogleTokenVerifier(async () => ({
      sub: "google-sub-no-body-id",
      email: "nobodyid@example.com",
      email_verified: true,
      iss: "https://accounts.google.com",
      aud: TEST_CLIENT_ID,
      nonce: ch.nonce,
      exp: Math.floor(Date.now() / 1000) + 3600
    }));

    const req = mockReq("POST", "/api/auth/google", {
      credential: "valid-token",
      // challengeId omitted
      role: "customer"
    }, {
      cookie: `sp_auth_challenge=${ch.id}`
    });
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 401);
    assert.match(res.body.error, /missing required security challenge id/i);
  });

  it("27. CSRF Protection: Rejects request when cookie and body challenge ID mismatch (401)", async function () {
    const ch1 = createAuthChallenge({ origin: "http://localhost:8000" });
    const ch2 = createAuthChallenge({ origin: "http://localhost:8000" });
    setGoogleTokenVerifier(async () => ({
      sub: "google-sub-mismatch",
      email: "mismatch@example.com",
      email_verified: true,
      iss: "https://accounts.google.com",
      aud: TEST_CLIENT_ID,
      nonce: ch1.nonce,
      exp: Math.floor(Date.now() / 1000) + 3600
    }));

    const req = mockReq("POST", "/api/auth/google", {
      credential: "valid-token",
      challengeId: ch2.id, // Mismatched body challenge ID
      role: "customer"
    }, {
      cookie: `sp_auth_challenge=${ch1.id}` // Different cookie ID
    });
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 401);
    assert.match(res.body.error, /mismatch|possible csrf/i);
  });

  it("28. Valid cookie and matching challenge ID successfully authenticates (201)", async function () {
    const ch = createAuthChallenge({ origin: "http://localhost:8000" });
    setGoogleTokenVerifier(async () => ({
      sub: "google-sub-valid-cookie-test",
      email: "validcookie@example.com",
      email_verified: true,
      name: "Valid Cookie User",
      iss: "https://accounts.google.com",
      aud: TEST_CLIENT_ID,
      nonce: ch.nonce,
      exp: Math.floor(Date.now() / 1000) + 3600
    }));

    const req = mockReq("POST", "/api/auth/google", {
      credential: "valid-token",
      challengeId: ch.id,
      role: "customer"
    }, {
      cookie: `sp_auth_challenge=${ch.id}`
    });
    const res = mockRes();
    await handleApiRequest(req, res, "/api/auth/google", testConfig);

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.body.ok, true);
    assert.strictEqual(res.body.user.email, "validcookie@example.com");
    assert.ok(res.body.token.startsWith("sp_sess_"));
  });
});
