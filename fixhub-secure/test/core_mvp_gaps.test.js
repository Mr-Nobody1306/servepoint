"use strict";
/**
 * Dedicated automated tests for Phase 3: Core MVP Functional Gaps:
 * - FR-03: Customer Profile Updates
 * - FR-04: Provider Profile Updates
 * - FR-09: Provider Profile Management
 * - FR-13: Provider Booking Method Selection
 * Run with: npm test (or: node --test test/core_mvp_gaps.test.js)
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
    setHeader(k, v) { headers[k.toLowerCase()] = v; },
    getHeader(k) { return headers[k.toLowerCase()]; },
    end(data) {
      if (data) body += data;
    },
    get statusCode() { return statusCode; },
    get json() {
      try { return JSON.parse(body); } catch (e) { return null; }
    },
    get body() { return body; }
  };
}

describe("Phase 3: Core MVP Functional Gaps (FR-03, FR-04, FR-09, FR-13)", function () {
  t.beforeEach(() => {
    // Reset Ama's profile
    const ama = dataStore.getUserById("ama");
    if (ama) {
      ama.name = "Ama Boateng";
      ama.phone = "+233 24 555 0184";
      ama.address = "24 Kofi Annan Street, Adenta, Accra";
      ama.area = "Adenta, Accra";
      ama.role = "customer";
      ama.status = "active";
      ama.suspended = false;
    }

    // Reset Kwame's profile
    const kwame = dataStore.getProviderById("kwame");
    if (kwame) {
      kwame.name = "Kwame Ofori";
      kwame.trade = "Carpentry & Woodwork";
      kwame.category = "Carpentry & Woodwork";
      kwame.price = 450;
      kwame.area = "Adenta, Accra";
      kwame.phone = "+233 24 555 0184";
      kwame.bio = "Master carpenter with over 10 years of experience in furniture craft, roofing, and wall installations.";
      kwame.status = "approved";
      kwame.suspended = false;
      kwame.acceptInstantBookings = true;
      kwame.supportedBookingMethods = ["instant", "request"];
      if (kwame.availability) {
        kwame.availability.acceptInstantBookings = true;
        kwame.availability.supportedBookingMethods = ["instant", "request"];
      }
    }
    dataStore.save();
  });

  // --- FR-03: Customer Profile Updates ---
  it("FR-03: allows authenticated customer to update their own profile details", async function () {
    const req = mockReq("PUT", "/api/users/ama", {
      name: "Ama B. Boateng",
      phone: "+233 24 999 8888",
      address: "42 Independence Avenue, Ridge, Accra",
      area: "Ridge, Accra"
    }, "ama");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/users/ama", {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.ok, true);
    assert.strictEqual(res.json.user.name, "Ama B. Boateng");
    assert.strictEqual(res.json.user.phone, "+233 24 999 8888");
    assert.strictEqual(res.json.user.address, "42 Independence Avenue, Ridge, Accra");
    assert.strictEqual(res.json.user.area, "Ridge, Accra");

    // Verify persistence in dataStore
    const user = dataStore.getUserById("ama");
    assert.strictEqual(user.name, "Ama B. Boateng");
    assert.strictEqual(user.address, "42 Independence Avenue, Ridge, Accra");
  });

  it("FR-03: rejects unauthenticated user profile update with 401", async function () {
    const req = mockReq("PUT", "/api/users/ama", {
      name: "Attacker Name"
    }, null);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/users/ama", {});

    assert.strictEqual(res.statusCode, 401);
  });

  it("FR-03: forbids customer from updating another customer's profile (403)", async function () {
    const req = mockReq("PUT", "/api/users/admin", {
      name: "Compromised Admin"
    }, "ama");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/users/admin", {});

    assert.strictEqual(res.statusCode, 403);
  });

  it("FR-03: prevents customer from elevating role to admin via profile update", async function () {
    const req = mockReq("PUT", "/api/users/ama", {
      role: "admin"
    }, "ama");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/users/ama", {});

    assert.strictEqual(res.statusCode, 200);
    const user = dataStore.getUserById("ama");
    assert.strictEqual(user.role, "customer", "Role must not be changed to admin");
  });

  // --- FR-04 & FR-09: Provider Profile Updates / Management ---
  it("FR-04/FR-09: allows authenticated provider to update bio, area, contact, and pricing", async function () {
    const req = mockReq("PUT", "/api/providers/kwame", {
      name: "Kwame Ofori Custom Joinery",
      bio: "Master carpenter and certified cabinetmaker specializing in residential installations.",
      area: "East Legon & Adenta, Accra",
      phone: "+233 24 777 6666",
      price: 500
    }, "kwame");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers/kwame", {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.ok, true);
    assert.strictEqual(res.json.provider.name, "Kwame Ofori Custom Joinery");
    assert.strictEqual(res.json.provider.bio, "Master carpenter and certified cabinetmaker specializing in residential installations.");
    assert.strictEqual(res.json.provider.area, "East Legon & Adenta, Accra");
    assert.strictEqual(res.json.provider.price, 500);

    // Verify persistence
    const p = dataStore.getProviderById("kwame");
    assert.strictEqual(p.name, "Kwame Ofori Custom Joinery");
    assert.strictEqual(p.area, "East Legon & Adenta, Accra");
  });

  it("FR-04/FR-09: rejects unauthenticated provider profile update with 401", async function () {
    const req = mockReq("PUT", "/api/providers/kwame", {
      bio: "Unauthenticated update attempt"
    }, null);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers/kwame", {});

    assert.strictEqual(res.statusCode, 401);
  });

  it("FR-04/FR-09: forbids non-owner and non-admin from modifying provider profile (403)", async function () {
    const req = mockReq("PUT", "/api/providers/kwame", {
      bio: "Tampered bio by Ama"
    }, "ama");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers/kwame", {});

    assert.strictEqual(res.statusCode, 403);
  });

  // --- FR-13: Provider Booking Method Selection ---
  it("FR-13: provider can configure supported booking methods (disable instant bookings)", async function () {
    const req = mockReq("PUT", "/api/providers/kwame", {
      acceptInstantBookings: false,
      supportedBookingMethods: ["request"]
    }, "kwame");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers/kwame", {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.provider.acceptInstantBookings, false);
    assert.deepStrictEqual(res.json.provider.supportedBookingMethods, ["request"]);

    const p = dataStore.getProviderById("kwame");
    assert.strictEqual(p.acceptInstantBookings, false);
  });

  it("FR-13: customer can submit request-based booking to a request-only provider", async function () {
    // Configure Kwame to accept request-only bookings
    dataStore.updateProviderProfile("kwame", {
      acceptInstantBookings: false,
      supportedBookingMethods: ["request"]
    });

    const req = mockReq("POST", "/api/bookings", {
      providerId: "kwame",
      serviceName: "Custom cabinet building",
      date: "Friday, 21 June",
      time: "10:30",
      address: "10 Cantonments Road, Accra",
      bookingType: "request"
    }, "ama");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/bookings", {});

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.json.booking.status, "pending");
    assert.strictEqual(res.json.booking.type, "request");
  });

  it("FR-13: customer submitting instant booking to request-only provider is rejected (400)", async function () {
    // Configure Kwame to accept request-only bookings
    dataStore.updateProviderProfile("kwame", {
      acceptInstantBookings: false,
      supportedBookingMethods: ["request"]
    });

    const req = mockReq("POST", "/api/bookings", {
      providerId: "kwame",
      serviceName: "Custom cabinet building",
      date: "Friday, 21 June",
      time: "12:00",
      address: "10 Cantonments Road, Accra",
      bookingType: "instant"
    }, "ama");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/bookings", {});

    assert.strictEqual(res.statusCode, 400);
    assert.match(res.json.error, /accepts request-based bookings only/i);
  });

  it("FR-13: re-enabling instant bookings allows instant bookings to succeed", async function () {
    dataStore.updateProviderProfile("kwame", {
      acceptInstantBookings: true,
      supportedBookingMethods: ["instant", "request"]
    });

    dataStore.data.bookings = (dataStore.data.bookings || []).filter(
      b => !(b.providerId === "kwame" && b.date === "Monday, 15 July" && b.time === "10:30")
    );

    const req = mockReq("POST", "/api/bookings", {
      providerId: "kwame",
      serviceName: "Door hinge & lock fitting",
      date: "Monday, 15 July",
      time: "10:30",
      address: "10 Cantonments Road, Accra",
      bookingType: "instant"
    }, "ama");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/bookings", {});

    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.json.booking.status, "accepted");
    assert.strictEqual(res.json.booking.type, "instant");

    dataStore.data.bookings = (dataStore.data.bookings || []).filter(b => b.id !== res.json.booking?.id);
    dataStore.save();
  });

  // --- Security Hardening: Protected Provider Fields ---
  it("Security Hardening: provider cannot modify status via PUT /api/providers/:id", async function () {
    const pBefore = dataStore.getProviderById("kwame");
    pBefore.status = "pending";
    dataStore.save();

    try {
      const req = mockReq("PUT", "/api/providers/kwame", {
        status: "approved"
      }, "kwame");
      const res = mockRes();
      await handleApiRequest(req, res, "/api/providers/kwame", {});

      assert.strictEqual(res.statusCode, 200);
      const pAfter = dataStore.getProviderById("kwame");
      assert.strictEqual(pAfter.status, "pending", "Status must not be modified via provider profile endpoint");
    } finally {
      pBefore.status = "approved";
      dataStore.save();
    }
  });

  it("Security Hardening: provider cannot modify suspended status via PUT /api/providers/:id", async function () {
    const pBefore = dataStore.getProviderById("kwame");
    pBefore.suspended = true;
    dataStore.save();

    try {
      const req = mockReq("PUT", "/api/providers/kwame", {
        suspended: false
      }, "kwame");
      const res = mockRes();
      await handleApiRequest(req, res, "/api/providers/kwame", {});

      assert.strictEqual(res.statusCode, 200);
      const pAfter = dataStore.getProviderById("kwame");
      assert.strictEqual(pAfter.suspended, true, "Suspension status must not be modified via provider profile endpoint");
    } finally {
      pBefore.suspended = false;
      dataStore.save();
    }
  });

  it("Security Hardening: provider cannot modify rating or jobs metrics", async function () {
    const pBefore = dataStore.getProviderById("kwame");
    const originalRating = pBefore.rating;
    const originalJobs = pBefore.jobs;

    const req = mockReq("PUT", "/api/providers/kwame", {
      rating: 5.0,
      jobs: 9999
    }, "kwame");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers/kwame", {});

    assert.strictEqual(res.statusCode, 200);
    const pAfter = dataStore.getProviderById("kwame");
    assert.strictEqual(pAfter.rating, originalRating);
    assert.strictEqual(pAfter.jobs, originalJobs);
  });

  it("Security Hardening: provider cannot modify protected identity or administrative fields", async function () {
    const req = mockReq("PUT", "/api/providers/kwame", {
      id: "malicious-id",
      role: "admin",
      documents: { idVerified: true, insurance: true, references: 99 },
      passwordHash: "hacked",
      passwordSalt: "hacked"
    }, "kwame");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers/kwame", {});

    assert.strictEqual(res.statusCode, 200);
    const pAfter = dataStore.getProviderById("kwame");
    assert.strictEqual(pAfter.id, "kwame");
    assert.notStrictEqual(pAfter.documents?.references, 99);
  });

  // --- Input Validation: Provider Price ---
  it("Validation Hardening: rejects negative price with 400", async function () {
    const req = mockReq("PUT", "/api/providers/kwame", {
      price: -50
    }, "kwame");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers/kwame", {});

    assert.strictEqual(res.statusCode, 400);
    assert.match(res.json.error, /non-negative number/i);
  });

  it("Validation Hardening: rejects non-numeric or non-finite price with 400", async function () {
    for (const invalidPrice of ["not-a-number", Infinity, -Infinity, NaN, null, ""]) {
      const req = mockReq("PUT", "/api/providers/kwame", {
        price: invalidPrice
      }, "kwame");
      const res = mockRes();
      await handleApiRequest(req, res, "/api/providers/kwame", {});

      assert.strictEqual(res.statusCode, 400, `Expected 400 for price: ${invalidPrice}`);
      assert.match(res.json.error, /non-negative number/i);
    }
  });

  it("Validation Hardening: preserves valid zero price (200)", async function () {
    const req = mockReq("PUT", "/api/providers/kwame", {
      price: 0
    }, "kwame");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers/kwame", {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.provider.price, 0);
    const p = dataStore.getProviderById("kwame");
    assert.strictEqual(p.price, 0);
  });

  // --- Input Validation: Provider Name ---
  it("Validation Hardening: rejects empty or whitespace-only name with 400", async function () {
    for (const emptyName of ["", "   ", "\t\n"]) {
      const req = mockReq("PUT", "/api/providers/kwame", {
        name: emptyName
      }, "kwame");
      const res = mockRes();
      await handleApiRequest(req, res, "/api/providers/kwame", {});

      assert.strictEqual(res.statusCode, 400, `Expected 400 for name: '${emptyName}'`);
      assert.match(res.json.error, /name cannot be empty/i);
    }
  });

  it("Validation Hardening: rejects names exceeding 100 characters with 400", async function () {
    const longName = "A".repeat(101);
    const req = mockReq("PUT", "/api/providers/kwame", {
      name: longName
    }, "kwame");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers/kwame", {});

    assert.strictEqual(res.statusCode, 400);
    assert.match(res.json.error, /must not exceed 100 characters/i);
  });

  it("Validation Hardening: accepts valid name and trims whitespace (200)", async function () {
    const req = mockReq("PUT", "/api/providers/kwame", {
      name: "   Kwame Master Craft Woodworks   "
    }, "kwame");
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers/kwame", {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.provider.name, "Kwame Master Craft Woodworks");
    const p = dataStore.getProviderById("kwame");
    assert.strictEqual(p.name, "Kwame Master Craft Woodworks");
  });

  // --- FR-13: Contradictory Booking Preferences ---
  it("FR-13 Hardening: contradictory preferences cannot enable instant booking when supportedBookingMethods excludes it", async function () {
    // Contradictory state: acceptInstantBookings is true, BUT supportedBookingMethods is only ['request']
    dataStore.updateProviderProfile("kwame", {
      acceptInstantBookings: true,
      supportedBookingMethods: ["request"]
    });

    try {
      const req = mockReq("POST", "/api/bookings", {
        providerId: "kwame",
        serviceName: "Custom cabinet building",
        date: "Friday, 21 June",
        time: "16:00",
        address: "15 Cantonments Road, Accra",
        bookingType: "instant"
      }, "ama");
      const res = mockRes();
      await handleApiRequest(req, res, "/api/bookings", {});

      assert.strictEqual(res.statusCode, 400);
      assert.match(res.json.error, /accepts request-based bookings only/i);
    } finally {
      dataStore.updateProviderProfile("kwame", {
        acceptInstantBookings: true,
        supportedBookingMethods: ["instant", "request"]
      });
    }
  });

  t.after(() => {
    const kwame = dataStore.getProviderById("kwame");
    if (kwame) {
      kwame.name = "Kwame Ofori";
      kwame.trade = "Carpentry & Woodwork";
      kwame.category = "Carpentry & Woodwork";
      kwame.price = 450;
      kwame.area = "Adenta, Accra";
      kwame.phone = "+233 24 555 0184";
      kwame.bio = "Master carpenter with over 10 years of experience in furniture craft, roofing, and wall installations.";
      kwame.status = "approved";
      kwame.suspended = false;
      kwame.acceptInstantBookings = true;
      kwame.supportedBookingMethods = ["instant", "request"];
      if (kwame.availability) {
        kwame.availability.acceptInstantBookings = true;
        kwame.availability.supportedBookingMethods = ["instant", "request"];
      }
      dataStore.save();
    }
  });
});
