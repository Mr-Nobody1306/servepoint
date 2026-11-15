"use strict";
/**
 * Automated tests for FR-07:
 * Service Directory Filtering (Category, Minimum Rating, Service Area, Combined Filters).
 * Run with: npm test (or: node --test test/*.js)
 */
const t = require("node:test");
const describe = t.describe;
const it = t.it;
const assert = require("node:assert/strict");
const dataStore = require("../src/dataStore");
const { handleApiRequest } = require("../src/apiRoutes");

function mockReq(method, urlStr, body, token) {
  const headers = { "content-type": "application/json" };
  if (token) headers["authorization"] = `Bearer ${token}`;
  const chunks = body ? [Buffer.from(JSON.stringify(body), "utf8")] : [];
  return {
    method,
    url: urlStr,
    headers,
    on(event, handler) {
      if (event === "data") {
        for (const c of chunks) handler(c);
      }
      if (event === "end") {
        handler();
      }
      return this;
    }
  };
}

function mockRes() {
  let statusCode = 200;
  const headers = {};
  let body = "";
  return {
    writeHead(code, h) {
      statusCode = code;
      Object.assign(headers, h);
    },
    end(chunk) {
      if (chunk) body += chunk.toString("utf8");
    },
    get statusCode() {
      return statusCode;
    },
    get headers() {
      return headers;
    },
    get body() {
      return body;
    },
    get json() {
      try {
        return JSON.parse(body);
      } catch (e) {
        return null;
      }
    }
  };
}

describe("Phase 4: Service Directory Filtering (FR-07)", function () {
  t.before(() => {
    // Ensure Kwame, Akosua, Kwaku, Yaw, and Adom are in active approved non-suspended state
    const kwame = dataStore.getProviderById("kwame");
    if (kwame) {
      kwame.status = "approved";
      kwame.suspended = false;
    }
    const yaw = dataStore.getProviderById("yaw");
    if (yaw) {
      yaw.status = "approved";
      yaw.suspended = false;
    }
    dataStore.save();
  });

  // 1. Category Filtering
  it("FR-07: category filter returns only providers belonging to that category", async function () {
    const reqPlumbing = mockReq("GET", "/api/providers?category=Plumbing");
    const resPlumbing = mockRes();
    await handleApiRequest(reqPlumbing, resPlumbing, "/api/providers", {});

    assert.strictEqual(resPlumbing.statusCode, 200);
    assert.ok(Array.isArray(resPlumbing.json.providers));
    assert.ok(resPlumbing.json.providers.length > 0);
    for (const p of resPlumbing.json.providers) {
      const match = (p.category || "").toLowerCase().includes("plumb") ||
                    (p.trade || "").toLowerCase().includes("plumb");
      assert.ok(match, `Provider ${p.name} must belong to plumbing category`);
    }
    assert.ok(resPlumbing.json.providers.some(p => p.id === "yaw"), "Yaw must be in plumbing");
    assert.ok(!resPlumbing.json.providers.some(p => p.id === "kwame"), "Kwame must not be in plumbing");

    const reqCarpentry = mockReq("GET", "/api/providers?category=Carpentry");
    const resCarpentry = mockRes();
    await handleApiRequest(reqCarpentry, resCarpentry, "/api/providers", {});
    assert.strictEqual(resCarpentry.statusCode, 200);
    assert.ok(resCarpentry.json.providers.some(p => p.id === "kwame"), "Kwame must be in carpentry");
    assert.ok(!resCarpentry.json.providers.some(p => p.id === "yaw"), "Yaw must not be in carpentry");
  });

  // 2. Minimum Rating Filtering
  it("FR-07: minimum rating filter returns only providers meeting or exceeding the threshold", async function () {
    const reqHigh = mockReq("GET", "/api/providers?minRating=4.92");
    const resHigh = mockRes();
    await handleApiRequest(reqHigh, resHigh, "/api/providers", {});

    assert.strictEqual(resHigh.statusCode, 200);
    const providers = resHigh.json.providers;
    assert.ok(providers.length > 0);
    for (const p of providers) {
      assert.ok(Number(p.rating) >= 4.92, `Provider ${p.name} rating (${p.rating}) must be >= 4.92`);
    }
    assert.ok(providers.some(p => p.id === "akosua"), "Akosua (4.96) must be included");
    assert.ok(providers.some(p => p.id === "yaw"), "Yaw (4.93) must be included");
    assert.ok(!providers.some(p => p.id === "kwaku"), "Kwaku (4.88) must be excluded");
  });

  it("FR-07: rejects invalid, negative, or out-of-range minRating values with 400", async function () {
    for (const invalid of ["not-a-number", "-1", "6", "NaN", "Infinity"]) {
      const req = mockReq("GET", `/api/providers?minRating=${encodeURIComponent(invalid)}`);
      const res = mockRes();
      await handleApiRequest(req, res, "/api/providers", {});

      assert.strictEqual(res.statusCode, 400, `Expected 400 for minRating=${invalid}`);
      assert.match(res.json.error, /minRating must be a valid number between 0 and 5/i);
    }
  });

  // 3. Service Area Filtering
  it("FR-07: service area filter returns only providers operating in that area", async function () {
    const reqEastLegon = mockReq("GET", "/api/providers?area=East+Legon");
    const resEastLegon = mockRes();
    await handleApiRequest(reqEastLegon, resEastLegon, "/api/providers", {});

    assert.strictEqual(resEastLegon.statusCode, 200);
    const providers = resEastLegon.json.providers;
    assert.ok(providers.length > 0);
    assert.ok(providers.some(p => p.id === "akosua"), "Akosua (East Legon) must be included");
    assert.ok(!providers.some(p => p.id === "kwame"), "Kwame (Adenta) must not be in East Legon results");
    assert.ok(!providers.some(p => p.id === "yaw"), "Yaw (Spintex) must not be in East Legon results");
  });

  // 4. Case-Insensitive and Whitespace-Tolerant Area Matching
  it("FR-07: area matching is case-insensitive and tolerant of surrounding whitespace", async function () {
    for (const variant of ["east legon", "EAST LEGON", "  East Legon  ", "East Legon, Accra"]) {
      const req = mockReq("GET", `/api/providers?area=${encodeURIComponent(variant)}`);
      const res = mockRes();
      await handleApiRequest(req, res, "/api/providers", {});

      assert.strictEqual(res.statusCode, 200);
      assert.ok(
        res.json.providers.some(p => p.id === "akosua"),
        `Akosua must be found for area variant: '${variant}'`
      );
    }
  });

  // 5. Multiple Operating Areas
  it("FR-07: accounts for providers operating in multiple areas", async function () {
    // Add a temporary multi-area provider
    const multiProv = {
      id: "multi-area-artisan",
      name: "Accra Multi-Zone Repairs",
      trade: "Plumbing",
      category: "Plumbing",
      rating: 4.85,
      jobs: 50,
      price: 300,
      area: "Cantonments, Airport Residential, Osu",
      areas: ["Cantonments", "Airport Residential", "Osu"],
      status: "approved",
      suspended: false
    };
    dataStore.createProvider(multiProv);

    try {
      // Query by Cantonments
      const req1 = mockReq("GET", "/api/providers?area=Cantonments");
      const res1 = mockRes();
      await handleApiRequest(req1, res1, "/api/providers", {});
      assert.strictEqual(res1.statusCode, 200);
      assert.ok(res1.json.providers.some(p => p.id === "multi-area-artisan"));

      // Query by Airport Residential
      const req2 = mockReq("GET", "/api/providers?area=Airport+Residential");
      const res2 = mockRes();
      await handleApiRequest(req2, res2, "/api/providers", {});
      assert.strictEqual(res2.statusCode, 200);
      assert.ok(res2.json.providers.some(p => p.id === "multi-area-artisan"));

      // Query by unrelated area (e.g. Spintex)
      const req3 = mockReq("GET", "/api/providers?area=Spintex");
      const res3 = mockRes();
      await handleApiRequest(req3, res3, "/api/providers", {});
      assert.strictEqual(res3.statusCode, 200);
      assert.ok(!res3.json.providers.some(p => p.id === "multi-area-artisan"));
    } finally {
      dataStore.data.providers = (dataStore.data.providers || []).filter(p => p.id !== "multi-area-artisan");
      dataStore.save();
    }
  });

  // 6. Combined Category, Rating, and Area Filtering
  it("FR-07: combined category, rating, and area filters satisfy all conditions simultaneously", async function () {
    // Akosua is Cleaning & Home Care, rating 4.96, East Legon, Accra
    const req = mockReq("GET", "/api/providers?category=Cleaning&minRating=4.9&area=East+Legon");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers", {});

    assert.strictEqual(res.statusCode, 200);
    const providers = res.json.providers;
    assert.strictEqual(providers.length, 1);
    assert.strictEqual(providers[0].id, "akosua");

    // Conflicting criteria: Category Cleaning, minRating 4.9, but area is Spintex (Yaw is in Spintex, but Yaw is Plumbing)
    const reqConflict = mockReq("GET", "/api/providers?category=Cleaning&minRating=4.9&area=Spintex");
    const resConflict = mockRes();
    await handleApiRequest(reqConflict, resConflict, "/api/providers", {});

    assert.strictEqual(resConflict.statusCode, 200);
    assert.strictEqual(resConflict.json.providers.length, 0, "No provider matches all 3 conflicting criteria");
  });

  // 7. Providers Without Ratings
  it("FR-07: providers without a rating do not match positive minimum rating thresholds", async function () {
    const unratedProv = {
      id: "unrated-artisan",
      name: "Fresh Onboarded Craftsman",
      trade: "Carpentry & Woodwork",
      category: "Carpentry & Woodwork",
      rating: null,
      jobs: 0,
      price: 250,
      area: "Adenta, Accra",
      status: "approved",
      suspended: false
    };
    dataStore.createProvider(unratedProv);

    try {
      // With minRating=3.0, unrated provider must be excluded
      const reqFiltered = mockReq("GET", "/api/providers?category=Carpentry&minRating=3.0");
      const resFiltered = mockRes();
      await handleApiRequest(reqFiltered, resFiltered, "/api/providers", {});

      assert.strictEqual(resFiltered.statusCode, 200);
      assert.ok(!resFiltered.json.providers.some(p => p.id === "unrated-artisan"));

      // Without minRating filter (or minRating=0), unrated provider appears
      const reqUnfiltered = mockReq("GET", "/api/providers?category=Carpentry&minRating=0");
      const resUnfiltered = mockRes();
      await handleApiRequest(reqUnfiltered, resUnfiltered, "/api/providers", {});

      assert.strictEqual(resUnfiltered.statusCode, 200);
      assert.ok(resUnfiltered.json.providers.some(p => p.id === "unrated-artisan"));
    } finally {
      dataStore.data.providers = (dataStore.data.providers || []).filter(p => p.id !== "unrated-artisan");
      dataStore.save();
    }
  });

  // 8. Unapproved Providers
  it("FR-07: unapproved (pending) providers are excluded from public search and filtering", async function () {
    // Nhyira is Cleaning, area Madina, status: pending
    const req = mockReq("GET", "/api/providers?category=Cleaning&area=Madina");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers", {});

    assert.strictEqual(res.statusCode, 200);
    assert.ok(!res.json.providers.some(p => p.id === "nhyira"), "Pending provider Nhyira must be excluded");
  });

  // 9. Suspended Providers
  it("FR-07: suspended providers are excluded from public search and filtering even when approved", async function () {
    const kwame = dataStore.getProviderById("kwame");
    kwame.suspended = true;
    dataStore.save();

    try {
      const req = mockReq("GET", "/api/providers?category=Carpentry");
      const res = mockRes();
      await handleApiRequest(req, res, "/api/providers", {});

      assert.strictEqual(res.statusCode, 200);
      assert.ok(!res.json.providers.some(p => p.id === "kwame"), "Suspended provider Kwame must be excluded");
    } finally {
      kwame.suspended = false;
      dataStore.save();
    }
  });

  // 10. Clearing Filters Returns Full Eligible Set
  it("FR-07: clearing or omitting filters returns the full set of eligible approved providers", async function () {
    const req = mockReq("GET", "/api/providers");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers", {});

    assert.strictEqual(res.statusCode, 200);
    const providers = res.json.providers;
    assert.ok(providers.length >= 5, "Must return all approved non-suspended providers");
    assert.ok(providers.some(p => p.id === "kwame"));
    assert.ok(providers.some(p => p.id === "akosua"));
    assert.ok(providers.some(p => p.id === "kwaku"));
    assert.ok(providers.some(p => p.id === "yaw"));
    assert.ok(providers.some(p => p.id === "adom"));
  });

  // 11. Keyword Search Regression
  it("FR-07: keyword search works simultaneously with filters", async function () {
    const req = mockReq("GET", "/api/providers?category=Carpentry&search=cabinet");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers", {});

    assert.strictEqual(res.statusCode, 200);
    assert.ok(res.json.providers.some(p => p.id === "kwame"), "Kwame provides custom cabinet building");

    // Search term that doesn't match
    const reqMismatch = mockReq("GET", "/api/providers?category=Carpentry&search=underwater+welding");
    const resMismatch = mockRes();
    await handleApiRequest(reqMismatch, resMismatch, "/api/providers", {});
    assert.strictEqual(resMismatch.statusCode, 200);
    assert.strictEqual(resMismatch.json.providers.length, 0);
  });

  // --- Phase 4.2: Pending Provider Access Authorization ---
  it("Phase 4.2 Security: Guest requesting includePending=true receives 403 Forbidden", async function () {
    const req = mockReq("GET", "/api/providers?includePending=true");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers", {});

    assert.strictEqual(res.statusCode, 403);
    assert.match(res.json.error, /Administrator privileges required/i);
  });

  it("Phase 4.2 Security: Customer requesting includePending=true receives 403 Forbidden", async function () {
    const customerUser = dataStore.getUserById("ama");
    const customerToken = dataStore.createSession(customerUser);

    const req = mockReq("GET", "/api/providers?includePending=true", null, customerToken);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers", {});

    assert.strictEqual(res.statusCode, 403);
    assert.match(res.json.error, /Administrator privileges required/i);
  });

  it("Phase 4.2 Security: Provider requesting includePending=true receives 403 Forbidden", async function () {
    const providerUser = dataStore.getUserById("kwame");
    const providerToken = dataStore.createSession(providerUser);

    const req = mockReq("GET", "/api/providers?includePending=true", null, providerToken);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers", {});

    assert.strictEqual(res.statusCode, 403);
    assert.match(res.json.error, /Administrator privileges required/i);
  });

  it("Phase 4.2 Security: Administrator requesting includePending=true receives 200 with pending providers", async function () {
    const adminUser = dataStore.getUserById("admin");
    const adminToken = dataStore.createSession(adminUser);

    const req = mockReq("GET", "/api/providers?includePending=true", null, adminToken);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers", {});

    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.json.providers));
    assert.ok(res.json.providers.some(p => p.status === "pending"), "Pending providers must be included for admin");
    assert.ok(res.json.providers.some(p => p.id === "nhyira"), "Nhyira must be present in admin query");
  });

  it("Phase 4.2 Security: Guest normal directory request returns 200 with approved non-suspended only", async function () {
    const req = mockReq("GET", "/api/providers");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers", {});

    assert.strictEqual(res.statusCode, 200);
    const providers = res.json.providers;
    assert.ok(providers.length >= 5);
    for (const p of providers) {
      assert.strictEqual(p.status, "approved", "All public providers must be approved");
      assert.strictEqual(p.suspended || false, false, "All public providers must be non-suspended");
    }
    assert.ok(!providers.some(p => p.status === "pending"), "No pending providers in guest response");
  });

  it("Phase 4.2 Security: Customer normal directory request returns 200 with approved non-suspended only", async function () {
    const customerUser = dataStore.getUserById("ama");
    const customerToken = dataStore.createSession(customerUser);

    const req = mockReq("GET", "/api/providers", null, customerToken);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers", {});

    assert.strictEqual(res.statusCode, 200);
    const providers = res.json.providers;
    assert.ok(providers.length >= 5);
    for (const p of providers) {
      assert.strictEqual(p.status, "approved", "All providers must be approved");
      assert.strictEqual(p.suspended || false, false, "All providers must be non-suspended");
    }
    assert.ok(!providers.some(p => p.status === "pending"), "No pending providers in customer response");
  });

  it("Phase 4.2 Integrity: directory requests do not modify provider records", async function () {
    const beforeSnap = JSON.stringify(dataStore.getProviders(true));

    const req = mockReq("GET", "/api/providers?category=Carpentry&minRating=4.0&area=Adenta");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers", {});
    assert.strictEqual(res.statusCode, 200);

    const afterSnap = JSON.stringify(dataStore.getProviders(true));
    assert.strictEqual(beforeSnap, afterSnap, "Provider data must not be mutated by directory requests");
  });
});
