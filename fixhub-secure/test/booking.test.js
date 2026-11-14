"use strict";
/**
 * Dedicated automated tests for Phase 4:
 * Booking System & Status Tracking.
 * Run with: npm test (or: node --test test/*.js)
 */
const t = require("node:test");
const describe = t.describe;
const it = t.it;
const assert = require("node:assert/strict");
const { EventEmitter } = require("node:events");
const dataStore = require("../src/dataStore");
const { handleApiRequest } = require("../src/apiRoutes");

function mockReq(method, path, body, token) {
  const req = new EventEmitter();
  req.method = method;
  req.url = path;
  req.headers = {
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {})
  };
  process.nextTick(() => {
    if (body) req.emit("data", Buffer.from(JSON.stringify(body)));
    req.emit("end");
  });
  return req;
}

function mockRes() {
  return {
    statusCode: 200,
    headers: {},
    body: "",
    writeHead(code, headers) {
      this.statusCode = code;
      Object.assign(this.headers, headers);
    },
    end(data) {
      this.body = data ? data.toString("utf8") : "";
    }
  };
}

describe("Phase 4: Booking System & Status Tracking", function () {
  t.before(() => {
    // Clear ephemeral test bookings from prior runs for idempotency
    if (dataStore.data && dataStore.data.bookings) {
      dataStore.data.bookings = dataStore.data.bookings.filter(
        (b) => !["Monday, 24 June", "Friday, 21 June", "Friday, 28 June", "Monday, 1 July", "Tuesday, 2 July", "Wednesday, 3 July"].includes(b.date)
      );
      dataStore.save();
    }
    const c = dataStore.getUserById("ama");
    if (c) {
      c.status = "active";
      c.suspended = false;
    }
    const p = dataStore.getProviderById("kwame");
    if (p) {
      p.suspended = false;
    }
  });

  // Ensure seed users
  const customer = dataStore.getUserById("ama");
  const customerToken = dataStore.createSession(customer);

  const providerKwame = dataStore.getUserById("kwame");
  const kwameToken = dataStore.createSession(providerKwame);

  const providerYaw = dataStore.getUserById("yaw") || dataStore.createUser({ id: "yaw", name: "Yaw", role: "artisan", email: "yaw@example.com" });
  const yawToken = dataStore.createSession(providerYaw);

  it("1. Customer creates request-based booking with status 'pending'", async function () {
    const req = mockReq("POST", "/api/bookings", {
      providerId: "kwame",
      serviceName: "Shelf installation & wall repair",
      date: "Friday, 21 June",
      time: "10:00",
      address: "14 Airport Hills, Accra",
      notes: "Mount two oak floating shelves.",
      bookingType: "request"
    }, customerToken);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/bookings", {});

    assert.strictEqual(res.statusCode, 201, "Must return 201 Created");
    const json = JSON.parse(res.body);
    assert.strictEqual(json.ok, true);
    assert.strictEqual(json.booking.status, "pending");
    assert.strictEqual(json.booking.type, "request");
    assert.strictEqual(json.booking.customerId, "ama");
    assert.strictEqual(json.booking.providerId, "kwame");
    assert.strictEqual(json.booking.paymentMethod, "offline_completion");
    assert.ok(json.booking.id.startsWith("SP-"));
  });

  it("2. Customer creates instant booking with status 'accepted'", async function () {
    const req = mockReq("POST", "/api/bookings", {
      providerId: "kwame",
      serviceName: "Door hinge & lock fitting",
      date: "Monday, 24 June",
      time: "14:00",
      address: "22 Cantonments Rd, Accra",
      bookingType: "instant"
    }, customerToken);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/bookings", {});

    assert.strictEqual(res.statusCode, 201, "Must return 201 Created");
    const json = JSON.parse(res.body);
    assert.strictEqual(json.ok, true);
    assert.strictEqual(json.booking.status, "accepted");
    assert.strictEqual(json.booking.type, "instant");
    assert.strictEqual(json.booking.total, 350);
  });

  it("3. Provider accepts a pending booking", async function () {
    const booking = dataStore.createBooking({
      customerId: "ama",
      customerName: "Ama Boateng",
      providerId: "kwame",
      providerName: "Kwame Ofori",
      serviceName: "Custom cabinet building",
      date: "Wednesday, 26 June",
      time: "09:00",
      address: "Ridge, Accra",
      status: "pending"
    });

    const req = mockReq("POST", `/api/bookings/${booking.id}/respond`, {
      action: "accept",
      notes: "Confirmed. I will arrive 10 mins early."
    }, kwameToken);
    const res = mockRes();
    await handleApiRequest(req, res, `/api/bookings/${booking.id}/respond`, {});

    assert.strictEqual(res.statusCode, 200, "Must return 200 OK");
    const json = JSON.parse(res.body);
    assert.strictEqual(json.booking.status, "accepted");
    assert.strictEqual(json.booking.responseNotes, "Confirmed. I will arrive 10 mins early.");
  });

  it("4. Provider rejects a pending booking", async function () {
    const booking = dataStore.createBooking({
      customerId: "ama",
      customerName: "Ama Boateng",
      providerId: "kwame",
      providerName: "Kwame Ofori",
      serviceName: "Roof repairs",
      date: "Thursday, 27 June",
      time: "11:00",
      address: "Tema, Accra",
      status: "pending"
    });

    const req = mockReq("POST", `/api/bookings/${booking.id}/respond`, {
      action: "reject",
      notes: "Outside my service area."
    }, kwameToken);
    const res = mockRes();
    await handleApiRequest(req, res, `/api/bookings/${booking.id}/respond`, {});

    assert.strictEqual(res.statusCode, 200, "Must return 200 OK");
    const json = JSON.parse(res.body);
    assert.strictEqual(json.booking.status, "rejected");
  });

  it("5. Rejects unauthenticated booking creation (401)", async function () {
    const req = mockReq("POST", "/api/bookings", {
      providerId: "kwame",
      serviceName: "Door hinge fitting",
      date: "Friday, 28 June",
      time: "10:00",
      address: "Osu, Accra"
    }, null); // No token
    const res = mockRes();
    await handleApiRequest(req, res, "/api/bookings", {});

    assert.strictEqual(res.statusCode, 401, "Must return 401 Unauthorized");
  });

  it("6. Forbids cross-provider booking response (403)", async function () {
    const booking = dataStore.createBooking({
      customerId: "ama",
      providerId: "kwame",
      serviceName: "Woodwork",
      date: "Friday, 28 June",
      time: "12:00",
      address: "Accra",
      status: "pending"
    });

    // Yaw attempts to respond to Kwame's booking -> MUST BE 403
    const req = mockReq("POST", `/api/bookings/${booking.id}/respond`, {
      action: "accept"
    }, yawToken);
    const res = mockRes();
    await handleApiRequest(req, res, `/api/bookings/${booking.id}/respond`, {});

    assert.strictEqual(res.statusCode, 403, "Must return 403 Forbidden for cross-provider action");
  });

  it("7. Validates status transitions and rejects invalid jumps (400)", async function () {
    const booking = dataStore.createBooking({
      customerId: "ama",
      providerId: "kwame",
      serviceName: "Wall mounting",
      date: "Monday, 1 July",
      time: "10:00",
      address: "Accra",
      status: "pending"
    });

    // Cannot jump pending -> completed
    const req = mockReq("POST", `/api/bookings/${booking.id}/progress`, {
      action: "complete"
    }, kwameToken);
    const res = mockRes();
    await handleApiRequest(req, res, `/api/bookings/${booking.id}/progress`, {});

    assert.strictEqual(res.statusCode, 400, "Must reject invalid transition from pending to completed");
  });

  it("8. Prevents conflicting instant bookings on the same provider slot (409)", async function () {
    // Book slot first
    dataStore.createBooking({
      customerId: "kofi",
      providerId: "kwame",
      serviceName: "First Booking",
      date: "Tuesday, 2 July",
      time: "14:00",
      address: "Spintex",
      status: "accepted"
    });

    // Attempt second instant booking on exact same provider, date, time
    const req = mockReq("POST", "/api/bookings", {
      providerId: "kwame",
      serviceName: "Second Conflicting Booking",
      date: "Tuesday, 2 July",
      time: "14:00",
      address: "East Legon",
      bookingType: "instant"
    }, customerToken);
    const res = mockRes();
    await handleApiRequest(req, res, "/api/bookings", {});

    assert.strictEqual(res.statusCode, 409, "Must return 409 Conflict for double booking");
  });

  it("9. Rejects duplicate booking submissions within 15 seconds (409)", async function () {
    // First submission
    const req1 = mockReq("POST", "/api/bookings", {
      providerId: "kwame",
      serviceName: "Hinge Fitting",
      date: "Wednesday, 3 July",
      time: "09:00",
      address: "Adenta",
      bookingType: "request"
    }, customerToken);
    const res1 = mockRes();
    await handleApiRequest(req1, res1, "/api/bookings", {});
    assert.strictEqual(res1.statusCode, 201);

    // Immediate duplicate submission with exact same details
    const req2 = mockReq("POST", "/api/bookings", {
      providerId: "kwame",
      serviceName: "Hinge Fitting",
      date: "Wednesday, 3 July",
      time: "09:00",
      address: "Adenta",
      bookingType: "request"
    }, customerToken);
    const res2 = mockRes();
    await handleApiRequest(req2, res2, "/api/bookings", {});
    assert.strictEqual(res2.statusCode, 409, "Must detect duplicate submission");
  });

  it("10. Customer cancels their own pending or accepted booking", async function () {
    const booking = dataStore.createBooking({
      customerId: "ama",
      providerId: "kwame",
      serviceName: "Carpentry",
      date: "Thursday, 4 July",
      time: "15:00",
      address: "Accra",
      status: "pending"
    });

    const req = mockReq("POST", `/api/bookings/${booking.id}/cancel`, {
      reason: "Plans changed"
    }, customerToken);
    const res = mockRes();
    await handleApiRequest(req, res, `/api/bookings/${booking.id}/cancel`, {});

    assert.strictEqual(res.statusCode, 200, "Must allow cancellation");
    const json = JSON.parse(res.body);
    assert.strictEqual(json.booking.status, "cancelled");
  });

  it("11. Booking persists on disk after reload", function () {
    const newBooking = dataStore.createBooking({
      id: "SP-PERSIST-99",
      customerId: "ama",
      providerId: "kwame",
      serviceName: "Disk Persistence Test",
      date: "Friday, 5 July",
      time: "10:00",
      status: "accepted"
    });

    // Re-instantiate DataStore and verify from fresh load
    const fresh = dataStore.load();
    const found = fresh.bookings.find(b => b.id === "SP-PERSIST-99");
    assert.ok(found, "Booking must persist on disk in store.json");
    assert.strictEqual(found.status, "accepted");
    assert.strictEqual(found.serviceName, "Disk Persistence Test");
  });

  it("12. Correct booking visibility in customer and provider dashboards", async function () {
    const reqCustomer = mockReq("GET", "/api/bookings?customerId=ama", null, customerToken);
    const resCustomer = mockRes();
    await handleApiRequest(reqCustomer, resCustomer, "/api/bookings", {});
    const customerBookings = JSON.parse(resCustomer.body).bookings;
    assert.ok(customerBookings.every(b => b.customerId === "ama"), "Customer only sees their own bookings");

    const reqProvider = mockReq("GET", "/api/bookings?providerId=kwame", null, kwameToken);
    const resProvider = mockRes();
    await handleApiRequest(reqProvider, resProvider, "/api/bookings", {});
    const providerBookings = JSON.parse(resProvider.body).bookings;
    assert.ok(providerBookings.every(b => b.providerId === "kwame"), "Provider only sees their assigned bookings");
  });
});
