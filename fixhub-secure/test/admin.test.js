"use strict";
/**
 * Dedicated automated tests for Phase 6: Admin Operations (FR-13 & FR-14).
 * Run with: npm test (or: node --test test/admin.test.js)
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

describe("Phase 6: Admin Operations (FR-13 & FR-14)", function () {
  t.beforeEach(() => {
    const customer = dataStore.getUserById("ama");
    if (customer) {
      customer.status = "active";
      customer.suspended = false;
    }
    const kwame = dataStore.getProviderById("kwame");
    if (kwame) {
      kwame.suspended = false;
    }
  });

  t.after(() => {
    const customer = dataStore.getUserById("ama");
    if (customer) {
      customer.status = "active";
      customer.suspended = false;
    }
    const kwame = dataStore.getProviderById("kwame");
    if (kwame) {
      kwame.suspended = false;
    }
  });
  const adminUser = dataStore.getUserById("admin") || dataStore.createUser({
    id: "admin",
    name: "ServePoint Admin",
    role: "admin",
    email: "admin@servepoint.gh"
  });
  const adminToken = dataStore.createSession(adminUser);

  const customerUser = dataStore.getUserById("ama") || dataStore.createUser({
    id: "ama",
    name: "Ama Boateng",
    role: "customer",
    email: "ama@example.com"
  });
  const customerToken = dataStore.createSession(customerUser);

  const providerUser = dataStore.getUserById("kwame");
  const providerToken = dataStore.createSession(providerUser);

  it("1. GET /api/admin/customers returns 200 with customer records for admin", async function () {
    const req = mockReq("GET", "/api/admin/customers", null, adminToken);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/admin/customers", {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.ok, true);
    assert.ok(Array.isArray(res.json.customers));
    const foundAma = res.json.customers.find(c => c.id === "ama");
    assert.ok(foundAma, "Ama must be returned in customer list");
    assert.ok(typeof foundAma.grossSpendGhs === "number");
    assert.ok(typeof foundAma.totalBookings === "number");
  });

  it("2. GET /api/admin/customers rejects unauthenticated (401) and non-admin (403)", async function () {
    // Unauthenticated
    const req1 = mockReq("GET", "/api/admin/customers", null, null);
    const res1 = mockRes();
    await handleApiRequest(req1, res1, "/api/admin/customers", {});
    assert.strictEqual(res1.statusCode, 401);

    // Customer
    const req2 = mockReq("GET", "/api/admin/customers", null, customerToken);
    const res2 = mockRes();
    await handleApiRequest(req2, res2, "/api/admin/customers", {});
    assert.strictEqual(res2.statusCode, 403);
  });

  it("3. Admin suspends customer account and blocks customer from creating bookings", async function () {
    // Create test customer
    const testCust = dataStore.createUser({
      id: "test-cust-1",
      name: "Test Customer",
      role: "customer",
      email: "testcust1@example.com"
    });
    const testCustToken = dataStore.createSession(testCust);

    // Admin suspends test customer
    const reqSuspend = mockReq("PUT", "/api/admin/customers/test-cust-1/status", {
      status: "suspended",
      reason: "Policy violation"
    }, adminToken);
    const resSuspend = mockRes();
    await handleApiRequest(reqSuspend, resSuspend, "/api/admin/customers/test-cust-1/status", {});

    assert.strictEqual(resSuspend.statusCode, 200);
    assert.strictEqual(resSuspend.json.user.status, "suspended");

    // Suspended customer attempts to create a booking -> 403 Forbidden
    const reqBook = mockReq("POST", "/api/bookings", {
      providerId: "kwame",
      serviceName: "Woodwork",
      date: "Monday, 15 Dec",
      time: "10:00",
      address: "Accra"
    }, testCustToken);
    const resBook = mockRes();
    await handleApiRequest(reqBook, resBook, "/api/bookings", {});

    assert.strictEqual(resBook.statusCode, 403, "Suspended customer must be blocked from creating bookings");
    assert.match(resBook.json.error, /Account suspended/i);

    // Existing bookings remain accessible
    const reqGetBookings = mockReq("GET", "/api/bookings", null, testCustToken);
    const resGetBookings = mockRes();
    await handleApiRequest(reqGetBookings, resGetBookings, "/api/bookings", {});
    assert.strictEqual(resGetBookings.statusCode, 200, "Suspended customer can still view booking history");

    // Admin reactivates customer
    const reqReactivate = mockReq("PUT", "/api/admin/customers/test-cust-1/status", {
      status: "active"
    }, adminToken);
    const resReactivate = mockRes();
    await handleApiRequest(reqReactivate, resReactivate, "/api/admin/customers/test-cust-1/status", {});

    assert.strictEqual(resReactivate.statusCode, 200);
    assert.strictEqual(resReactivate.json.user.status, "active");
  });

  it("4. Prevents admin from suspending their own admin account (403)", async function () {
    const req = mockReq("PUT", `/api/admin/customers/${adminUser.id}/status`, {
      status: "suspended"
    }, adminToken);
    const res = mockRes();
    await handleApiRequest(req, res, `/api/admin/customers/${adminUser.id}/status`, {});

    assert.strictEqual(res.statusCode, 403);
    assert.match(res.json.error, /cannot suspend their own admin account/i);
  });

  it("5. Admin suspends provider without altering approval status; provider suspension blocks new bookings", async function () {
    const kwame = dataStore.getProviderById("kwame");
    assert.strictEqual(kwame.status, "approved", "Kwame is approved");

    // Admin suspends Kwame
    const reqSuspend = mockReq("POST", "/api/providers/kwame/suspend", {
      suspended: true,
      reason: "Temporary audit"
    }, adminToken);
    const resSuspend = mockRes();
    await handleApiRequest(reqSuspend, resSuspend, "/api/providers/kwame/suspend", {});

    assert.strictEqual(resSuspend.statusCode, 200);
    assert.strictEqual(resSuspend.json.provider.suspended, true);
    assert.strictEqual(resSuspend.json.provider.status, "approved", "Approval status must remain 'approved'");

    // Customer attempts to book suspended provider -> 400 Bad Request
    const reqBook = mockReq("POST", "/api/bookings", {
      providerId: "kwame",
      serviceName: "Woodwork",
      date: "Tuesday, 16 Dec",
      time: "11:00",
      address: "Accra"
    }, customerToken);
    const resBook = mockRes();
    await handleApiRequest(reqBook, resBook, "/api/bookings", {});

    assert.strictEqual(resBook.statusCode, 400, "Must reject booking for suspended provider");
    assert.match(resBook.json.error, /currently suspended/i);

    // Existing bookings for Kwame remain intact
    const kwameBookings = dataStore.getBookings({ providerId: "kwame" });
    assert.ok(kwameBookings.length > 0, "Existing bookings must not be deleted or modified by suspension");

    // Admin reactivates provider
    const reqReactivate = mockReq("POST", "/api/providers/kwame/suspend", {
      suspended: false
    }, adminToken);
    const resReactivate = mockRes();
    await handleApiRequest(reqReactivate, resReactivate, "/api/providers/kwame/suspend", {});

    assert.strictEqual(resReactivate.statusCode, 200);
    assert.strictEqual(resReactivate.json.provider.suspended, false);
    assert.strictEqual(resReactivate.json.provider.status, "approved");
  });

  it("6. Non-admin attempts to suspend provider return 403", async function () {
    const req = mockReq("POST", "/api/providers/kwame/suspend", { suspended: true }, customerToken);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/providers/kwame/suspend", {});

    assert.strictEqual(res.statusCode, 403);
  });

  it("7. Administrative cancellation persists reason and audit trail in booking history", async function () {
    // Create an active test booking
    const booking = dataStore.createBooking({
      id: "SP-ADMIN-CANCEL-1",
      customerId: "ama",
      customerName: "Ama Boateng",
      providerId: "kwame",
      serviceName: "Shelf repair",
      date: "Wednesday, 17 Dec",
      time: "14:00",
      address: "Airport Hills",
      status: "pending"
    });

    // Admin cancels booking
    const req = mockReq("POST", `/api/admin/bookings/${booking.id}/cancel`, {
      reason: "Emergency water pipe issue on site"
    }, adminToken);
    const res = mockRes();
    await handleApiRequest(req, res, `/api/admin/bookings/${booking.id}/cancel`, {});

    assert.strictEqual(res.statusCode, 200);
    assert.strictEqual(res.json.ok, true);
    assert.strictEqual(res.json.booking.status, "cancelled");

    const audit = res.json.booking.history.find(h => h.action === "admin_cancellation");
    assert.ok(audit, "Must record admin_cancellation in history");
    assert.strictEqual(audit.changedBy, adminUser.id);
    assert.strictEqual(audit.reason, "Emergency water pipe issue on site");
  });

  it("8. Completed bookings resist administrative cancellation (400)", async function () {
    const completedBooking = dataStore.createBooking({
      id: "SP-ADMIN-COMPLETED-1",
      customerId: "ama",
      customerName: "Ama Boateng",
      providerId: "kwame",
      serviceName: "Completed Job",
      date: "Thursday, 18 Dec",
      time: "14:00",
      address: "Airport Hills",
      status: "completed"
    });

    const req = mockReq("POST", `/api/admin/bookings/${completedBooking.id}/cancel`, {
      reason: "Too late to cancel"
    }, adminToken);
    const res = mockRes();
    await handleApiRequest(req, res, `/api/admin/bookings/${completedBooking.id}/cancel`, {});

    assert.strictEqual(res.statusCode, 400);
    assert.match(res.json.error, /already completed or cancelled/i);
  });

  it("9. Administrative cancellation with empty reason is rejected (400)", async function () {
    const booking = dataStore.createBooking({
      id: "SP-ADMIN-CANCEL-EMPTY",
      customerId: "ama",
      providerId: "kwame",
      serviceName: "Job",
      status: "pending"
    });

    const req = mockReq("POST", `/api/admin/bookings/${booking.id}/cancel`, {
      reason: "   "
    }, adminToken);
    const res = mockRes();
    await handleApiRequest(req, res, `/api/admin/bookings/${booking.id}/cancel`, {});

    assert.strictEqual(res.statusCode, 400);
  });

  it("10. Core MVP categories cannot be deactivated or deleted (400)", async function () {
    // Attempt to deactivate plumbing
    const reqDeactivate = mockReq("PUT", "/api/categories/plumbing", {
      active: false
    }, adminToken);
    const resDeactivate = mockRes();
    await handleApiRequest(reqDeactivate, resDeactivate, "/api/categories/plumbing", {});

    assert.strictEqual(resDeactivate.statusCode, 400);
    assert.match(resDeactivate.json.error, /core MVP service categories cannot be deactivated/i);

    // Attempt to delete plumbing
    const reqDelete = mockReq("DELETE", "/api/categories/plumbing", null, adminToken);
    const resDelete = mockRes();
    await handleApiRequest(reqDelete, resDelete, "/api/categories/plumbing", {});

    assert.strictEqual(resDelete.statusCode, 400);
    assert.match(resDelete.json.error, /core MVP service categories cannot be deleted/i);

    // Legitimate edit of description succeeds
    const reqEdit = mockReq("PUT", "/api/categories/plumbing", {
      description: "Pipes, drains, taps and modern water filtration"
    }, adminToken);
    const resEdit = mockRes();
    await handleApiRequest(reqEdit, resEdit, "/api/categories/plumbing", {});

    assert.strictEqual(resEdit.statusCode, 200);
    assert.strictEqual(resEdit.json.category.description, "Pipes, drains, taps and modern water filtration");
  });

  it("11. Customer gross spend calculates only completed bookings", async function () {
    const statsUser = dataStore.createUser({
      id: "cust-stats-calc",
      name: "Stats Customer",
      role: "customer",
      email: "statscust@example.com"
    });

    // 1 completed booking for 500
    dataStore.createBooking({
      id: "SP-STAT-COMPLETED",
      customerId: statsUser.id,
      customerName: statsUser.name,
      providerId: "kwame",
      serviceName: "Completed Work",
      status: "completed",
      total: 500
    });

    // 1 pending booking for 350 (should NOT be counted in gross spend)
    dataStore.createBooking({
      id: "SP-STAT-PENDING",
      customerId: statsUser.id,
      customerName: statsUser.name,
      providerId: "kwame",
      serviceName: "Pending Work",
      status: "pending",
      total: 350
    });

    // 1 cancelled booking for 400 (should NOT be counted in gross spend)
    dataStore.createBooking({
      id: "SP-STAT-CANCELLED",
      customerId: statsUser.id,
      customerName: statsUser.name,
      providerId: "kwame",
      serviceName: "Cancelled Work",
      status: "cancelled",
      total: 400
    });

    const customers = dataStore.getCustomersWithStats();
    const target = customers.find(c => c.id === statsUser.id);
    assert.ok(target);
    assert.strictEqual(target.totalBookings, 3, "Total bookings must be 3");
    assert.strictEqual(target.completedBookingsCount, 1, "Completed bookings must be 1");
    assert.strictEqual(target.grossSpendGhs, 500, "Gross spend must be exactly 500 (completed bookings only)");
  });
});
