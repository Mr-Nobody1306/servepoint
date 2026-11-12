"use strict";
const t = require("node:test");
const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const { Readable } = require("node:stream");
const { signatureMatches, processPaymentEvent, handleCompletion } = require("../src/paystack");

const config = {
  paystackSecretKey: "sk_test_example",
  supabaseUrl: "https://project.supabase.co",
  supabaseAnonKey: "anon_test_example",
  supabaseServiceRoleKey: "service_role_test_example"
};
function response(data, status) {
  return new Response(data == null ? "" : JSON.stringify(data), {
    status: status || 200,
    headers: { "Content-Type": "application/json" }
  });
}
function makeRequest(method, url, body, authorization) {
  const req = Readable.from(body == null ? [] : [Buffer.from(JSON.stringify(body))]);
  req.method = method;
  req.url = url;
  req.headers = authorization ? { authorization } : {};
  return req;
}
function makeResponse() {
  return {
    headersSent: false,
    writeHead(status, headers) { this.statusCode = status; this.headers = headers; this.headersSent = true; },
    end(body) { this.body = body; }
  };
}
t.describe("Paystack payment and payout security", function () {
  t.it("compares Paystack webhook signatures in constant time", function () {
    const body = Buffer.from('{"event":"charge.success"}');
    const signature = crypto.createHmac("sha512", config.paystackSecretKey).update(body).digest("hex");
    assert.equal(signatureMatches(body, signature, config.paystackSecretKey), true);
    assert.equal(signatureMatches(body, "bad", config.paystackSecretKey), false);
    assert.equal(signatureMatches(body, signature, ""), false);
  });
  t.it("confirms only a verified GHS transaction for the exact booking amount", async function () {
    const originalFetch = global.fetch;
    const writes = [];
    global.fetch = async (url, options) => {
      if (String(url).includes("/transaction/verify/")) {
        return response({ status: true, data: { status: "success", reference: "pay-ref-1", currency: "GHS", amount: 12345 } });
      }
      if (String(url).includes("/rest/v1/bookings?")) {
        return response([{ id: "FX-1001", total: 123.45, customer_id: "customer-1", artisan_id: "artisan-1" }]);
      }
      writes.push({ url: String(url), options });
      return response([], 201);
    };
    try {
      await processPaymentEvent(config, { event: "charge.success", data: { reference: "pay-ref-1" } });
      const state = writes.find((item) => item.url.includes("/booking_payment_state"));
      assert.ok(state);
      assert.equal(JSON.parse(state.options.body).payment_status, "confirmed");
      assert.equal(JSON.parse(state.options.body).payout_status, "awaiting_completion");
      assert.ok(writes.some((item) => item.url.includes("/notifications")));
    } finally { global.fetch = originalFetch; }
  });
  t.it("refuses a transaction whose verified amount differs from the booking", async function () {
    const originalFetch = global.fetch;
    const writes = [];
    global.fetch = async (url) => {
      if (String(url).includes("/transaction/verify/")) {
        return response({ status: true, data: { status: "success", reference: "pay-ref-2", currency: "GHS", amount: 12344 } });
      }
      if (String(url).includes("/rest/v1/bookings?")) return response([{ id: "FX-1002", total: 123.45 }]);
      writes.push(String(url));
      return response([], 201);
    };
    try {
      await assert.rejects(processPaymentEvent(config, { event: "charge.success", data: { reference: "pay-ref-2" } }), /amount does not match/);
      assert.equal(writes.length, 0);
    } finally { global.fetch = originalFetch; }
  });
  t.it("releases 90 percent once after customer completion and confirmed payment", async function () {
    const originalFetch = global.fetch;
    const calls = [];
    global.fetch = async (url, options) => {
      calls.push({ url: String(url), options: options || {} });
      if (String(url).endsWith("/auth/v1/user")) return response({ id: "customer-1" });
      if (String(url).includes("/rest/v1/bookings?select=id,total,status")) {
        return response([{ id: "FX-1003", total: 123.45, status: "arrived", customer_id: "customer-1", artisan_id: "artisan-1" }]);
      }
      if (String(url).includes("/booking_payment_state?select=")) {
        return response([{ payment_status: "confirmed", payout_status: "awaiting_completion", payout_reference: null }]);
      }
      if (String(url).includes("/rest/v1/applications?")) return response([{ artisan_id: "artisan-1" }]);
      if (String(url).includes("/artisan_payout_accounts?")) return response([{ recipient_code: "RCP_test" }]);
      if (String(url).includes("/booking_payment_state?booking_id=")) return response([{ booking_id: "FX-1003" }]);
      if (String(url).includes("/rest/v1/bookings?id=")) return response([{ id: "FX-1003", status: "completed" }]);
      if (String(url).includes("api.paystack.co/transfer")) return response({ status: true, data: { status: "pending" } });
      return response([], 201);
    };
    try {
      const req = makeRequest("POST", "/api/bookings/complete", { bookingId: "FX-1003" }, "Bearer user-token");
      const res = makeResponse();
      await handleCompletion(req, res, config);
      assert.equal(res.statusCode, 200);
      assert.equal(JSON.parse(res.body).payoutStatus, "processing");
      const transfer = calls.find((call) => call.url.includes("api.paystack.co/transfer"));
      assert.ok(transfer);
      assert.equal(JSON.parse(transfer.options.body).amount, 11111);
      assert.equal(JSON.parse(transfer.options.body).recipient, "RCP_test");
    } finally { global.fetch = originalFetch; }
  });
});
