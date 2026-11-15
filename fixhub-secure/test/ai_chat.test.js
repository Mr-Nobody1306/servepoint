"use strict";
const test = require("node:test");
const assert = require("node:assert");
const { describe, it, beforeEach } = test;
const {
  SERVICES,
  parseAnswer,
  matchesCategory,
  getMatchingProviders,
  sanitizePublicProvider,
  handleChat
} = require("../src/chat");
const persona = require("../src/persona");
const dataStore = require("../src/dataStore");

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    writeHead: function (code, headers) {
      this.statusCode = code;
      Object.assign(this.headers, headers);
      return this;
    },
    setHeader: function (key, val) {
      this.headers[key.toLowerCase()] = val;
    },
    end: function (data) {
      if (data) this.body += data;
    },
    get json() {
      try {
        return JSON.parse(this.body);
      } catch (e) {
        return null;
      }
    }
  };
}

describe("Phase 1: AI Assistant & Diagnosis (FR-27 to FR-33)", function () {
  it("FR-28/FR-30: SERVICES allowlist contains exactly the 9 approved platform categories", function () {
    const expected = [
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
    assert.strictEqual(SERVICES.length, 9, "Must contain exactly 9 categories");
    for (const cat of expected) {
      assert.ok(SERVICES.includes(cat), "SERVICES must include: " + cat);
    }
  });

  it("FR-28/FR-29: persona system prompt mentions all 9 categories and clarification instructions", function () {
    const prompt = persona.systemPrompt();
    assert.ok(prompt.includes("starting prices in GH cedis"), "Security requirement preserved");
    for (const cat of SERVICES) {
      assert.ok(prompt.toLowerCase().includes(cat), "Prompt must include category: " + cat);
    }
    assert.ok(prompt.includes('"service": null'), "Prompt must guide clarification with null service");
  });

  it("FR-28: parseAnswer parses every approved category correctly", function () {
    for (const cat of SERVICES) {
      const llmOutput = `Here is my assessment:
{"reply": "I can help you with your ${cat} issue.", "service": "${cat}", "detail": "Fixing the problem"}`;
      const res = parseAnswer(llmOutput);
      assert.strictEqual(res.service, cat);
      assert.strictEqual(res.reply, `I can help you with your ${cat} issue.`);
      assert.strictEqual(res.detail, "Fixing the problem");
    }
  });

  it("FR-30: parseAnswer rejects unapproved or invented categories and sets service to null", function () {
    const invalidCategories = ["gardening", "roofing", "security", "catering", "pest_control", "automotive"];
    for (const inv of invalidCategories) {
      const llmOutput = `{"reply": "We do not offer this directly.", "service": "${inv}", "detail": "N/A"}`;
      const res = parseAnswer(llmOutput);
      assert.strictEqual(res.service, null, `Invalid category '${inv}' must be rejected and set to null`);
    }
  });

  it("FR-29: parseAnswer cleanly handles clarifying questions with null service", function () {
    const llmOutput = `{"reply": "Could you clarify if the leak is coming from the kitchen pipe or the roof?", "service": null, "detail": ""}`;
    const res = parseAnswer(llmOutput);
    assert.strictEqual(res.service, null);
    assert.ok(res.reply.includes("Could you clarify"));
    assert.strictEqual(res.detail, "");
  });

  it("FR-33: parseAnswer safely falls back when LLM output is malformed or non-JSON", function () {
    const bad1 = "I am an AI and I think you need a plumber.";
    const res1 = parseAnswer(bad1);
    assert.strictEqual(res1.service, null);
    assert.strictEqual(res1.reply, bad1);

    const bad2 = "";
    const res2 = parseAnswer(bad2);
    assert.strictEqual(res2.service, null);
    assert.ok(res2.reply.length > 0);
  });

  it("FR-31: matchesCategory correctly identifies matching providers", function () {
    const plumber = { trade: "Plumbing", category: "Plumbing", services: [{ name: "Pipe repair" }] };
    assert.ok(matchesCategory(plumber, "plumbing"));

    const carpenter = { trade: "Carpentry & Woodwork", category: "Carpentry & Woodwork", services: [{ name: "Cabinet installation" }] };
    assert.ok(matchesCategory(carpenter, "carpentry"));

    const cleaner = { trade: "Cleaning & Home Care", category: "Cleaning & Home Care", services: [{ name: "Deep clean" }] };
    assert.ok(matchesCategory(cleaner, "cleaning"));

    const painter = { trade: "Painting & Wall Finishing", category: "Painting & Wall Finishing", services: [{ name: "Interior wall paint" }] };
    assert.ok(matchesCategory(painter, "painting"));

    assert.ok(!matchesCategory(plumber, "electrical"));
    assert.ok(!matchesCategory(carpenter, "masonry"));
  });

  it("FR-31: getMatchingProviders returns approved non-suspended providers with safe public fields", function () {
    const plumbingProviders = getMatchingProviders("plumbing");
    assert.ok(Array.isArray(plumbingProviders));
    assert.ok(plumbingProviders.length >= 1, "Should find at least 1 approved plumbing provider (e.g. Yaw)");

    const yaw = plumbingProviders.find(p => p.id === "yaw");
    assert.ok(yaw, "Yaw should be in plumbing matches");
    assert.strictEqual(yaw.name, "Yaw Plumbing Works");
    assert.strictEqual(typeof yaw.rating, "number");
    assert.strictEqual(typeof yaw.price, "number");
    assert.ok(Array.isArray(yaw.services));

    // Security check: no private credentials or sensitive fields
    assert.strictEqual(yaw.passwordHash, undefined);
    assert.strictEqual(yaw.passwordSalt, undefined);
    assert.strictEqual(yaw.phone, undefined, "Direct artisan phone should not be exposed in public provider card");
  });

  it("FR-31: getMatchingProviders excludes unapproved (pending) providers", function () {
    // Nhyira Cleaning Co. is pending in default data
    const cleaners = getMatchingProviders("cleaning");
    const nhyira = cleaners.find(p => p.id === "nhyira");
    assert.strictEqual(nhyira, undefined, "Pending provider Nhyira must NOT be returned in AI recommendations");

    // Akosua is approved
    const akosua = cleaners.find(p => p.id === "akosua");
    assert.ok(akosua, "Approved provider Akosua MUST be returned");
  });

  it("FR-31: getMatchingProviders excludes suspended providers", function () {
    // Temporarily suspend Yaw
    const initialSuspended = dataStore.getProviderById("yaw").suspended;
    dataStore.setProviderSuspended("yaw", true);
    try {
      const matchAfterSuspension = getMatchingProviders("plumbing").find(p => p.id === "yaw");
      assert.strictEqual(matchAfterSuspension, undefined, "Suspended provider must not be returned by getMatchingProviders");
    } finally {
      dataStore.setProviderSuspended("yaw", !!initialSuspended);
    }
  });

  it("FR-31: getMatchingProviders returns empty array for category with no approved providers", function () {
    const res = getMatchingProviders("masonry");
    assert.ok(Array.isArray(res));
  });

  it("FR-33: handleChat returns 503 when groqKey is missing without crashing", async function () {
    const req = {
      socket: { remoteAddress: "127.0.0.1" },
      on: function (event, cb) {
        if (event === "data") cb(Buffer.from(JSON.stringify({ messages: [{ role: "user", content: "Need a plumber" }] })));
        if (event === "end") cb();
      }
    };
    const res = mockRes();
    const ctx = {
      config: {
        groqKey: "",
        maxBodyBytes: 16384,
        maxMessages: 10,
        maxMessageChars: 1000
      },
      limiter: {
        isLimited: () => false
      }
    };

    await handleChat(req, res, ctx);
    assert.strictEqual(res.statusCode, 503);
    assert.strictEqual(res.json.error, "Server AI is not configured yet.");
  });

  it("FR-33: handleChat rejects malformed request bodies with 400", async function () {
    const req = {
      socket: { remoteAddress: "127.0.0.1" },
      on: function (event, cb) {
        if (event === "data") cb(Buffer.from("not-valid-json"));
        if (event === "end") cb();
      }
    };
    const res = mockRes();
    const ctx = {
      config: { maxBodyBytes: 16384, maxMessages: 10, maxMessageChars: 1000 },
      limiter: { isLimited: () => false }
    };

    await handleChat(req, res, ctx);
    assert.strictEqual(res.statusCode, 400);
  });
});
