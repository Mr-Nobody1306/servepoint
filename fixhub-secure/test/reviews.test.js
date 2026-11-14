"use strict";
/**
 * Dedicated automated tests for ServePoint Reviews & Ratings (FR-12).
 * Run with: npm test (or: node --test test/reviews.test.js)
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

describe("Phase 5: Reviews & Ratings (FR-12)", function () {
  const customerAma = dataStore.getUserById("ama");
  const amaToken = dataStore.createSession(customerAma);

  const customerKofi = dataStore.getUserById("kofi") || dataStore.createUser({ id: "kofi", name: "Kofi Addo", role: "customer", email: "kofi@example.com" });
  const kofiToken = dataStore.createSession(customerKofi);

  const providerKwame = dataStore.getUserById("kwame");

  // Helper to create a test booking in completed status
  function createTestCompletedBooking(customerId, customerName, providerId) {
    const booking = dataStore.createBooking({
      customerId,
      customerName,
      providerId,
      serviceName: "Custom Joinery",
      date: "Monday, 10 June",
      time: "10:00",
      address: "East Legon, Accra",
      description: "Custom table",
      total: 500,
      bookingType: "request"
    });
    // Progress booking to completed
    dataStore.updateBookingStatus(booking.id, "accepted");
    dataStore.updateBookingStatus(booking.id, "in-progress");
    const res = dataStore.updateBookingStatus(booking.id, "completed");
    return res.booking;
  }

  it("1. Customer submits a valid review on their completed booking (201)", async function () {
    const completedBooking = createTestCompletedBooking("ama", "Ama Boateng", "kwame");

    const req = mockReq("POST", "/api/reviews", {
      bookingId: completedBooking.id,
      rating: 5,
      comment: "Superb craftsmanship! Kwame arrived right on time and built a stunning dining table."
    }, amaToken);
    const res = mockRes();

    await handleApiRequest(req, res, "/api/reviews", {});
    assert.strictEqual(res.statusCode, 201);
    assert.strictEqual(res.json.ok, true);
    assert.strictEqual(res.json.review.bookingId, completedBooking.id);
    assert.strictEqual(res.json.review.rating, 5);
    assert.strictEqual(res.json.review.customerId, "ama");
  });

  it("2. Updating review recalculates provider average rating on disk", async function () {
    const initialKwame = dataStore.getProviderById("kwame");
    const oldRating = initialKwame.rating;

    // Create another completed booking and submit a 4-star review
    const completedBooking2 = createTestCompletedBooking("ama", "Ama Boateng", "kwame");
    const req = mockReq("POST", "/api/reviews", {
      bookingId: completedBooking2.id,
      rating: 4,
      comment: "Good work, just slightly delayed by traffic."
    }, amaToken);
    const res = mockRes();

    await handleApiRequest(req, res, "/api/reviews", {});
    assert.strictEqual(res.statusCode, 201);

    const updatedKwame = dataStore.getProviderById("kwame");
    assert.ok(updatedKwame.rating > 0 && updatedKwame.rating <= 5, "Rating must be updated between 1 and 5");
  });

  it("3. Review persists on disk across reload", function () {
    const reviewsBefore = dataStore.getReviews("kwame");
    assert.ok(reviewsBefore.length >= 2, "Must have reviews for Kwame");

    // Force reload from disk
    const freshStore = new (dataStore.constructor)();
    const freshReviews = freshStore.getReviews("kwame");
    assert.strictEqual(freshReviews.length, reviewsBefore.length, "Reviews count must match across disk reloads");
  });

  it("4. Prevents duplicate reviews for the same booking (409 Conflict)", async function () {
    const completedBooking = createTestCompletedBooking("ama", "Ama Boateng", "kwame");

    // First review -> succeeds
    const req1 = mockReq("POST", "/api/reviews", {
      bookingId: completedBooking.id,
      rating: 5,
      comment: "First review"
    }, amaToken);
    const res1 = mockRes();
    await handleApiRequest(req1, res1, "/api/reviews", {});
    assert.strictEqual(res1.statusCode, 201);

    // Second review for same booking -> 409
    const req2 = mockReq("POST", "/api/reviews", {
      bookingId: completedBooking.id,
      rating: 4,
      comment: "Duplicate review attempt"
    }, amaToken);
    const res2 = mockRes();
    await handleApiRequest(req2, res2, "/api/reviews", {});
    assert.strictEqual(res2.statusCode, 409, "Must return 409 Conflict for duplicate review");
  });

  it("5. Prevents reviewing an incomplete booking (400 Bad Request)", async function () {
    // Create an uncompleted booking (status: pending)
    const pendingBooking = dataStore.createBooking({
      customerId: "ama",
      customerName: "Ama Boateng",
      providerId: "kwame",
      serviceName: "Pending Service",
      date: "Friday, 28 June",
      time: "14:00",
      address: "Adenta, Accra",
      description: "Fix frame",
      total: 350,
      bookingType: "request"
    });

    const req = mockReq("POST", "/api/reviews", {
      bookingId: pendingBooking.id,
      rating: 5,
      comment: "Attempting to review pending booking"
    }, amaToken);
    const res = mockRes();

    await handleApiRequest(req, res, "/api/reviews", {});
    assert.strictEqual(res.statusCode, 400, "Must return 400 for reviewing incomplete booking");
    assert.match(res.json.error, /Only completed services can be reviewed/i);
  });

  it("6. Forbids customer from reviewing another customer's booking (403 Forbidden)", async function () {
    // Booking belongs to Ama
    const amaBooking = createTestCompletedBooking("ama", "Ama Boateng", "kwame");

    // Kofi attempts to review Ama's booking
    const req = mockReq("POST", "/api/reviews", {
      bookingId: amaBooking.id,
      rating: 1,
      comment: "Malicious review from different customer"
    }, kofiToken);
    const res = mockRes();

    await handleApiRequest(req, res, "/api/reviews", {});
    assert.strictEqual(res.statusCode, 403, "Must return 403 Forbidden for cross-customer review");
  });

  it("7. Rejects unauthenticated review submission (401 Unauthorized)", async function () {
    const completedBooking = createTestCompletedBooking("ama", "Ama Boateng", "kwame");

    const req = mockReq("POST", "/api/reviews", {
      bookingId: completedBooking.id,
      rating: 5,
      comment: "Review with no token"
    }, null); // No token
    const res = mockRes();

    await handleApiRequest(req, res, "/api/reviews", {});
    assert.strictEqual(res.statusCode, 401, "Must return 401 Unauthorized");
  });

  it("8. Validates rating is integer between 1 and 5 (400)", async function () {
    const completedBooking = createTestCompletedBooking("ama", "Ama Boateng", "kwame");

    // Rating 6
    const req1 = mockReq("POST", "/api/reviews", { bookingId: completedBooking.id, rating: 6, comment: "Too high" }, amaToken);
    const res1 = mockRes();
    await handleApiRequest(req1, res1, "/api/reviews", {});
    assert.strictEqual(res1.statusCode, 400);

    // Rating 0
    const req2 = mockReq("POST", "/api/reviews", { bookingId: completedBooking.id, rating: 0, comment: "Too low" }, amaToken);
    const res2 = mockRes();
    await handleApiRequest(req2, res2, "/api/reviews", {});
    assert.strictEqual(res2.statusCode, 400);

    // Non-integer rating
    const req3 = mockReq("POST", "/api/reviews", { bookingId: completedBooking.id, rating: 4.5, comment: "Float rating" }, amaToken);
    const res3 = mockRes();
    await handleApiRequest(req3, res3, "/api/reviews", {});
    assert.strictEqual(res3.statusCode, 400);
  });

  it("9. Rejects review with empty comment (400)", async function () {
    const completedBooking = createTestCompletedBooking("ama", "Ama Boateng", "kwame");

    const req = mockReq("POST", "/api/reviews", {
      bookingId: completedBooking.id,
      rating: 5,
      comment: "   "
    }, amaToken);
    const res = mockRes();

    await handleApiRequest(req, res, "/api/reviews", {});
    assert.strictEqual(res.statusCode, 400);
    assert.match(res.json.error, /comment is required/i);
  });

  it("10. GET /api/reviews?providerId=kwame returns sorted reviews with summary metrics", async function () {
    const req = mockReq("GET", "/api/reviews?providerId=kwame", null, null);
    const res = mockRes();

    await handleApiRequest(req, res, "/api/reviews", {});
    assert.strictEqual(res.statusCode, 200);
    assert.ok(Array.isArray(res.json.reviews), "Must return reviews array");
    assert.ok(res.json.reviews.length >= 2, "Must contain Kwame's reviews");
    assert.ok(typeof res.json.averageRating === "number", "Must return numeric averageRating");
    assert.ok(typeof res.json.totalReviews === "number", "Must return numeric totalReviews");

    // Verify sorted newest first
    for (let i = 0; i < res.json.reviews.length - 1; i++) {
      const d1 = new Date(res.json.reviews[i].createdAt);
      const d2 = new Date(res.json.reviews[i + 1].createdAt);
      assert.ok(d1 >= d2, "Reviews must be sorted newest first");
    }
  });
});
