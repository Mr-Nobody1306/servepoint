"use strict";
/**
 * Dedicated automated tests for Security Remediation: Provider Approval Enforcement
 * - Block bookings to unapproved (pending / declined) providers
 * - Block bookings to suspended providers
 * - Block service creation, updating, and deletion by unapproved / suspended providers
 * - Preserve approved provider and administrator capabilities
 *
 * Run with: node --test test/provider_approval_security.test.js
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

describe("Security Remediation: Provider Approval & Service Publication Enforcement", function () {
  let customerToken;
  let adminToken;
  let kwameToken;
  let pendingProviderToken;
  let declinedProviderToken;

  t.beforeEach(() => {
    // Session setup
    const customer = dataStore.getUserById("ama") || dataStore.createUser({ id: "ama", name: "Ama Boateng", role: "customer", email: "ama@example.com" });
    customerToken = dataStore.createSession(customer);

    const admin = dataStore.getUserById("admin") || dataStore.createUser({ id: "admin", name: "ServePoint Admin", role: "admin", email: "admin@servepoint.gh" });
    adminToken = dataStore.createSession(admin);

    const kwame = dataStore.getUserById("kwame") || dataStore.createUser({ id: "kwame", name: "Kwame Ofori", role: "artisan", email: "kwame@example.com" });
    kwameToken = dataStore.createSession(kwame);

    // Setup approved provider (Kwame)
    dataStore.updateProviderProfile("kwame", { status: "approved", suspended: false });

    // Setup pending provider
    let pendingUser = dataStore.getUserById("test-pending-artisan");
    if (!pendingUser) {
      pendingUser = dataStore.createUser({ id: "test-pending-artisan", name: "Pending Artisan", role: "artisan", email: "pending_artisan@test.com" });
    }
    pendingProviderToken = dataStore.createSession(pendingUser);
    dataStore.createProvider({
      id: "test-pending-artisan",
      name: "Pending Artisan",
      trade: "Plumbing",
      category: "Plumbing",
      status: "pending",
      suspended: false,
      services: [{ id: "srv-pend-1", name: "Basic Pipe Repair", price: 150 }]
    });

    // Setup declined provider
    let declinedUser = dataStore.getUserById("test-declined-artisan");
    if (!declinedUser) {
      declinedUser = dataStore.createUser({ id: "test-declined-artisan", name: "Declined Artisan", role: "artisan", email: "declined_artisan@test.com" });
    }
    declinedProviderToken = dataStore.createSession(declinedUser);
    dataStore.createProvider({
      id: "test-declined-artisan",
      name: "Declined Artisan",
      trade: "Electrical",
      category: "Electrical",
      status: "declined",
      suspended: false,
      services: [{ id: "srv-decl-1", name: "Faulty Wiring", price: 200 }]
    });
  });

  // ==========================================
  // SECTION 1: Booking Restrictions
  // ==========================================

  it("1. Rejects request booking to a pending provider with HTTP 403", async function () {
    const initialBookingCount = (dataStore.data.bookings || []).length;
    const req = mockReq("POST", "/api/bookings", {
      providerId: "test-pending-artisan",
      serviceName: "Basic Pipe Repair",
      bookingType: "request",
      date: "2026-12-01",
      time: "10:00",
      address: "Ridge, Accra"
    }, customerToken);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/bookings", {});

    assert.strictEqual(res.statusCode, 403, "Must return HTTP 403 Forbidden for pending provider");
    assert.match(res.json.error, /not been approved/i, "Must provide clear approval error message");
    assert.strictEqual((dataStore.data.bookings || []).length, initialBookingCount, "No booking record must be created");
  });

  it("2. Rejects instant booking to a pending provider with HTTP 403", async function () {
    const initialBookingCount = (dataStore.data.bookings || []).length;
    const req = mockReq("POST", "/api/bookings", {
      providerId: "test-pending-artisan",
      serviceName: "Basic Pipe Repair",
      bookingType: "instant",
      type: "instant",
      date: "2026-12-01",
      time: "11:00",
      address: "Ridge, Accra"
    }, customerToken);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/bookings", {});

    assert.strictEqual(res.statusCode, 403, "Must return HTTP 403 Forbidden for pending provider instant booking");
    assert.match(res.json.error, /not been approved/i);
    assert.strictEqual((dataStore.data.bookings || []).length, initialBookingCount, "No booking record must be created");
  });

  it("3. Rejects booking to a declined provider with HTTP 403", async function () {
    const initialBookingCount = (dataStore.data.bookings || []).length;
    const req = mockReq("POST", "/api/bookings", {
      providerId: "test-declined-artisan",
      serviceName: "Faulty Wiring",
      bookingType: "request",
      date: "2026-12-02",
      time: "14:00",
      address: "Cantonments, Accra"
    }, customerToken);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/bookings", {});

    assert.strictEqual(res.statusCode, 403, "Must return HTTP 403 Forbidden for declined provider");
    assert.match(res.json.error, /not been approved/i);
    assert.strictEqual((dataStore.data.bookings || []).length, initialBookingCount, "No booking record must be created");
  });

  it("4. Rejects booking to a suspended provider with HTTP 400", async function () {
    // Kwame is approved, but suspended
    dataStore.setProviderSuspended("kwame", true);

    const initialBookingCount = (dataStore.data.bookings || []).length;
    const req = mockReq("POST", "/api/bookings", {
      providerId: "kwame",
      serviceName: "Shelf installation & wall repair",
      bookingType: "request",
      date: "2026-12-03",
      time: "09:00",
      address: "East Legon, Accra"
    }, customerToken);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/bookings", {});

    assert.strictEqual(res.statusCode, 400, "Must return HTTP 400 Bad Request for suspended provider");
    assert.match(res.json.error, /currently suspended/i);
    assert.strictEqual((dataStore.data.bookings || []).length, initialBookingCount, "No booking record must be created");

    // Clean up
    dataStore.setProviderSuspended("kwame", false);
  });

  it("5. Accepts valid booking to an approved, active provider with HTTP 201", async function () {
    const initialBookingCount = (dataStore.data.bookings || []).length;
    const uniqueTime = "14:" + String(Math.floor(Math.random() * 50) + 10);
    const req = mockReq("POST", "/api/bookings", {
      providerId: "kwame",
      serviceName: "Shelf installation & wall repair",
      bookingType: "request",
      date: "2029-10-20",
      time: uniqueTime,
      address: "Airport Residential, Accra"
    }, customerToken);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/bookings", {});

    assert.strictEqual(res.statusCode, 201, "Must return HTTP 201 Created for approved active provider");
    assert.strictEqual(res.json.ok, true);
    assert.strictEqual(res.json.booking.providerId, "kwame");
    assert.strictEqual((dataStore.data.bookings || []).length, initialBookingCount + 1, "Booking record must be persisted");
  });

  // ==========================================
  // SECTION 2: Service Management Restrictions
  // ==========================================

  it("6. Pending provider cannot create or publish services (HTTP 403)", async function () {
    const provBefore = dataStore.getProviderById("test-pending-artisan");
    const countBefore = provBefore.services.length;

    const req = mockReq("POST", "/api/providers/test-pending-artisan/services", {
      name: "Emergency Leak Fix",
      price: 300,
      description: "Fast pipe repair"
    }, pendingProviderToken);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers/test-pending-artisan/services", {});

    assert.strictEqual(res.statusCode, 403, "Pending provider must receive HTTP 403 when creating services");
    assert.match(res.json.error, /approved by an administrator/i);

    const provAfter = dataStore.getProviderById("test-pending-artisan");
    assert.strictEqual(provAfter.services.length, countBefore, "Service catalog must not be modified");
  });

  it("7. Declined provider cannot create or publish services (HTTP 403)", async function () {
    const provBefore = dataStore.getProviderById("test-declined-artisan");
    const countBefore = provBefore.services.length;

    const req = mockReq("POST", "/api/providers/test-declined-artisan/services", {
      name: "Solar Inverter Wiring",
      price: 450
    }, declinedProviderToken);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers/test-declined-artisan/services", {});

    assert.strictEqual(res.statusCode, 403, "Declined provider must receive HTTP 403 when creating services");
    assert.match(res.json.error, /approved by an administrator/i);

    const provAfter = dataStore.getProviderById("test-declined-artisan");
    assert.strictEqual(provAfter.services.length, countBefore, "Service catalog must not be modified");
  });

  it("8. Suspended provider cannot create or publish services (HTTP 403)", async function () {
    dataStore.setProviderSuspended("kwame", true);

    const req = mockReq("POST", "/api/providers/kwame/services", {
      name: "Suspended Custom Joinery",
      price: 500
    }, kwameToken);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers/kwame/services", {});

    assert.strictEqual(res.statusCode, 403, "Suspended provider must receive HTTP 403 when creating services");
    assert.match(res.json.error, /suspended providers cannot publish/i);

    // Clean up
    dataStore.setProviderSuspended("kwame", false);
  });

  it("9. Pending provider cannot modify published services (HTTP 403)", async function () {
    const req = mockReq("PUT", "/api/providers/test-pending-artisan/services/srv-pend-1", {
      name: "Altered Drain Fix",
      price: 999
    }, pendingProviderToken);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers/test-pending-artisan/services/srv-pend-1", {});

    assert.strictEqual(res.statusCode, 403, "Pending provider must receive HTTP 403 when updating services");
    assert.match(res.json.error, /approved by an administrator/i);

    const srv = dataStore.getProviderById("test-pending-artisan").services.find(s => s.id === "srv-pend-1");
    assert.strictEqual(srv.name, "Basic Pipe Repair", "Service details must remain unchanged");
  });

  it("10. Pending provider cannot delete services (HTTP 403)", async function () {
    const req = mockReq("DELETE", "/api/providers/test-pending-artisan/services/srv-pend-1", null, pendingProviderToken);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers/test-pending-artisan/services/srv-pend-1", {});

    assert.strictEqual(res.statusCode, 403, "Pending provider must receive HTTP 403 when deleting services");
    assert.match(res.json.error, /approved by an administrator/i);

    const prov = dataStore.getProviderById("test-pending-artisan");
    assert.strictEqual(prov.services.length, 1, "Service must not be deleted");
  });

  it("11. Approved provider can manage their own services (HTTP 201/200)", async function () {
    // 1. Create service
    const reqCreate = mockReq("POST", "/api/providers/kwame/services", {
      name: "Approved Custom Table",
      price: 650,
      description: "Handcrafted mahogany dining table"
    }, kwameToken);
    const resCreate = mockRes();
    await handleApiRequest(reqCreate, resCreate, "/api/providers/kwame/services", {});

    assert.strictEqual(resCreate.statusCode, 201, "Approved provider can create service");
    const createdService = resCreate.json.provider.services.find(s => s.name === "Approved Custom Table");
    assert.ok(createdService, "Created service must exist in provider profile");

    // 2. Update service
    const reqUpdate = mockReq("PUT", `/api/providers/kwame/services/${createdService.id}`, {
      name: "Approved Custom Table (Varnished)",
      price: 700
    }, kwameToken);
    const resUpdate = mockRes();
    await handleApiRequest(reqUpdate, resUpdate, `/api/providers/kwame/services/${createdService.id}`, {});

    assert.strictEqual(resUpdate.statusCode, 200, "Approved provider can update service");
    assert.strictEqual(resUpdate.json.provider.services.find(s => s.id === createdService.id).name, "Approved Custom Table (Varnished)");

    // 3. Delete service
    const reqDelete = mockReq("DELETE", `/api/providers/kwame/services/${createdService.id}`, null, kwameToken);
    const resDelete = mockRes();
    await handleApiRequest(reqDelete, resDelete, `/api/providers/kwame/services/${createdService.id}`, {});

    assert.strictEqual(resDelete.statusCode, 200, "Approved provider can delete service");
    assert.ok(!resDelete.json.provider.services.some(s => s.id === createdService.id), "Deleted service must no longer exist");
  });

  it("12. Provider cannot modify another provider's services (HTTP 403)", async function () {
    // Kwame attempts to add service to Akosua
    const req = mockReq("POST", "/api/providers/akosua/services", {
      name: "Unauthorized Cleaning Pack",
      price: 100
    }, kwameToken);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers/akosua/services", {});

    assert.strictEqual(res.statusCode, 403, "Cross-provider service modification must return HTTP 403");
  });

  it("13. Administrator retains full permission to manage services for any provider (HTTP 201/200)", async function () {
    // Admin adds service to pending provider
    const req = mockReq("POST", "/api/providers/test-pending-artisan/services", {
      name: "Admin Authorized Diagnostic",
      price: 180
    }, adminToken);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers/test-pending-artisan/services", {});

    assert.strictEqual(res.statusCode, 201, "Administrator can add services to any provider");
    const prov = dataStore.getProviderById("test-pending-artisan");
    assert.ok(prov.services.some(s => s.name === "Admin Authorized Diagnostic"), "Service added by administrator must persist");
  });
});
