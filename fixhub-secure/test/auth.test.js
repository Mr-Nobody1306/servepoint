"use strict";
/**
 * Dedicated automated tests for ServePoint authentication and role-based access control.
 * Run with: npm test (or: node --test test/*.js)
 */
const t = require("node:test");
const describe = t.describe;
const it = t.it;
const assert = require("node:assert/strict");
const dataStore = require("../src/dataStore");

describe("Authentication & Role Security", function () {
  it("hashes and verifies passwords using timing-safe scrypt", function () {
    const { hash, salt } = dataStore.hashPassword("SuperSecret123!");
    assert.ok(hash && salt, "Must return hash and salt");
    assert.ok(dataStore.verifyPassword("SuperSecret123!", hash, salt), "Must verify correct password");
    assert.strictEqual(dataStore.verifyPassword("WrongPassword", hash, salt), false, "Must reject incorrect password");
    assert.strictEqual(dataStore.verifyPassword("", hash, salt), false, "Must reject empty password");
  });

  it("sanitizes user profile before sending to client", function () {
    const raw = {
      id: "usr-test-1",
      name: "Test User",
      email: "test@example.com",
      role: "customer",
      passwordHash: "abcdef",
      passwordSalt: "123456"
    };
    const sanitized = dataStore.sanitizeUser(raw);
    assert.strictEqual(sanitized.id, "usr-test-1");
    assert.strictEqual(sanitized.email, "test@example.com");
    assert.strictEqual(sanitized.passwordHash, undefined, "passwordHash must be stripped");
    assert.strictEqual(sanitized.passwordSalt, undefined, "passwordSalt must be stripped");
  });

  it("creates, validates, expires, and deletes sessions with 7-day TTL", function () {
    const testUser = { id: "usr-sess-test", role: "customer", email: "sess@test.com", name: "Sess User" };
    const token = dataStore.createSession(testUser);
    assert.ok(token.startsWith("sp_sess_"), "Token must have sp_sess_ prefix");

    const validSession = dataStore.getSession(token);
    assert.ok(validSession, "Must retrieve valid session");
    assert.strictEqual(validSession.userId, "usr-sess-test");
    assert.ok(validSession.expiresAt > Date.now(), "Session expires in future");

    // Test expired session
    dataStore.data.sessions[token].expiresAt = Date.now() - 1000;
    const expired = dataStore.getSession(token);
    assert.strictEqual(expired, null, "Expired session must return null and be purged");
    assert.strictEqual(dataStore.data.sessions[token], undefined, "Expired session must be deleted from store");

    // Test delete / logout
    const token2 = dataStore.createSession(testUser);
    assert.ok(dataStore.getSession(token2), "Session 2 must be valid");
    const deleted = dataStore.deleteSession(token2);
    assert.strictEqual(deleted, true, "deleteSession must return true");
    assert.strictEqual(dataStore.getSession(token2), null, "Deleted session must return null");
  });

  it("handles non-existent or invalid session tokens safely", function () {
    assert.strictEqual(dataStore.getSession(null), null);
    assert.strictEqual(dataStore.getSession(""), null);
    assert.strictEqual(dataStore.getSession("sp_sess_nonexistent"), null);
    assert.strictEqual(dataStore.deleteSession("invalid-token"), false);
  });

  it("initializes and verifies all three demo accounts with valid hashes and correct roles", function () {
    dataStore.load(); // Ensures demo accounts are synchronized
    const ama = dataStore.getUserById("ama");
    const kwame = dataStore.getUserById("kwame");
    const admin = dataStore.getUserById("admin");

    assert.ok(ama, "Customer demo account 'ama' must exist");
    assert.strictEqual(ama.role, "customer", "Ama role must be customer");
    assert.ok(ama.passwordHash && ama.passwordSalt, "Ama must have valid password hash and salt");
    assert.ok(dataStore.verifyPassword("password123", ama.passwordHash, ama.passwordSalt), "Ama password must verify with password123");
    assert.strictEqual(dataStore.verifyPassword("wrongpass", ama.passwordHash, ama.passwordSalt), false, "Ama must reject wrong password");

    assert.ok(kwame, "Artisan demo account 'kwame' must exist");
    assert.strictEqual(kwame.role, "artisan", "Kwame role must be internal 'artisan'");
    assert.ok(kwame.passwordHash && kwame.passwordSalt, "Kwame must have valid password hash and salt");
    assert.ok(dataStore.verifyPassword("password123", kwame.passwordHash, kwame.passwordSalt), "Kwame password must verify with password123");

    // Provider record verification
    const kwameProv = dataStore.getProviderById("kwame");
    assert.ok(kwameProv, "Kwame provider record must exist");
    assert.strictEqual(kwameProv.status, "approved", "Kwame provider status must be approved");

    assert.ok(admin, "Admin demo account 'admin' must exist");
    assert.strictEqual(admin.role, "admin", "Admin role must be admin");
    assert.ok(admin.passwordHash && admin.passwordSalt, "Admin must have valid password hash and salt");
    assert.ok(dataStore.verifyPassword("password123", admin.passwordHash, admin.passwordSalt), "Admin password must verify with password123");
  });

  it("disables demo account initialization and default credentials in production environments", function () {
    const prevEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = "production";
      const prodStore = new (dataStore.constructor)();
      prodStore.data = { users: [], providers: [] };
      prodStore.ensureDemoAccounts();
      assert.strictEqual(prodStore.data.users.length, 0, "No demo accounts may be created when NODE_ENV is production");
    } finally {
      process.env.NODE_ENV = prevEnv;
    }
  });
});
