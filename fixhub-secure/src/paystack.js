"use strict";
const crypto = require("node:crypto");
const { sendJson } = require("./static");

const API = "https://api.paystack.co";
const MAX_BODY_BYTES = 64 * 1024;
function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0, chunks = [], tooLarge = false;
    req.on("data", (chunk) => {
      if (tooLarge) return;
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        reject(Object.assign(new Error("Request body is too large"), { statusCode: 413 }));
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", () => { if (!tooLarge) resolve(Buffer.concat(chunks)); });
    req.on("error", reject);
  });
}
function signatureMatches(rawBody, signature, secret) {
  if (!signature || !secret) return false;
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest();
  let actual;
  try { actual = Buffer.from(signature, "hex"); } catch (e) { return false; }
  return actual.length === expected.length && crypto.timingSafeEqual(actual, expected);
}
function fail(res, status, message) {
  return sendJson(res, status, { error: message });
}
function envReady(config, userAuth) {
  const ready = (value) => !!value && !/PASTE|YOUR_/i.test(value);
  return !!(ready(config.paystackSecretKey) && ready(config.supabaseUrl) && ready(config.supabaseServiceRoleKey) &&
    (!userAuth || ready(config.supabaseAnonKey)));
}
function serviceHeaders(config, extra) {
  return Object.assign({
    apikey: config.supabaseServiceRoleKey,
    Authorization: "Bearer " + config.supabaseServiceRoleKey,
    "Content-Type": "application/json"
  }, extra || {});
}
async function supabase(config, path, method, body, prefer) {
  const headers = serviceHeaders(config, prefer ? { Prefer: prefer } : {});
  const response = await fetch(config.supabaseUrl + "/rest/v1/" + path, {
    method: method || "GET", headers,
    body: body == null ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let data = null;
  if (text) {
    try { data = JSON.parse(text); }
    catch (e) { throw new Error("Supabase returned invalid JSON"); }
  }
  if (!response.ok) throw new Error("Supabase request failed: " + response.status);
  return data;
}
async function paystack(config, path, method, body) {
  let response;
  try {
    response = await fetch(API + path, {
      method: method || "GET",
      headers: Object.assign({ Authorization: "Bearer " + config.paystackSecretKey }, body == null ? {} : { "Content-Type": "application/json" }),
      body: body == null ? undefined : JSON.stringify(body)
    });
  } catch (cause) {
    const error = new Error("Paystack connection failed; transaction outcome may be unknown.");
    error.cause = cause;
    throw error;
  }
  let data;
  try { data = await response.json(); }
  catch (e) { throw new Error("Paystack returned invalid JSON"); }
  if (!response.ok || !data.status) {
    const error = new Error(data.message || "Paystack request failed");
    error.paystackStatus = response.status;
    throw error;
  }
  return data.data;
}
function notify(config, recipientId, bookingId, type, message) {
  if (!recipientId) return Promise.resolve();
  return supabase(config, "notifications", "POST", {
    recipient_id: recipientId, booking_id: bookingId, type, message
  }, "resolution=ignore-duplicates,return=minimal");
}
async function processPaymentEvent(config, event) {
  if (!event || event.event !== "charge.success" || !event.data || !event.data.reference) return;
  const reference = String(event.data.reference);
  const verified = await paystack(config, "/transaction/verify/" + encodeURIComponent(reference));
  if (!verified || verified.status !== "success" || verified.reference !== reference || verified.currency !== "GHS") {
    throw new Error("Paystack transaction verification did not match");
  }
  const bookings = await supabase(config, "bookings?select=id,total,customer_id,artisan_id&payment_reference=eq." +
    encodeURIComponent(reference) + "&limit=1");
  const booking = bookings && bookings[0];
  if (!booking) throw new Error("No booking matches the Paystack reference");
  const expectedPesewas = Math.round(Number(booking.total) * 100);
  if (!Number.isSafeInteger(expectedPesewas) || expectedPesewas < 1 || Number(verified.amount) !== expectedPesewas) {
    throw new Error("Verified Paystack amount does not match the booking total");
  }
  await supabase(config, "booking_payment_state", "POST", {
    booking_id: booking.id,
    payment_reference: reference,
    payment_status: "confirmed",
    payout_status: "awaiting_completion"
  }, "resolution=ignore-duplicates,return=minimal");
  await notify(config, booking.customer_id, booking.id, "payment_confirmed", "Payment confirmed for booking " + booking.id + ".");
}
async function handleWebhook(req, res, config) {
  if (req.method !== "POST") return fail(res, 405, "Use POST.");
  if (!envReady(config, false)) return fail(res, 503, "Paystack webhook is not configured on the server.");
  let raw;
  try { raw = await readBody(req); }
  catch (e) { return fail(res, e.statusCode || 400, e.message); }
  const signature = req.headers["x-paystack-signature"];
  if (!signatureMatches(raw, signature, config.paystackSecretKey)) return fail(res, 401, "Invalid webhook signature.");
  let event;
  try { event = JSON.parse(raw.toString("utf8")); }
  catch (e) { return fail(res, 400, "Invalid webhook payload."); }
  try {
    if (event.event === "charge.success") {
      await processPaymentEvent(config, event);
    } else if (event.event === "transfer.success" || event.event === "transfer.failed" || event.event === "transfer.reversed") {
      const transfer = event.data || {};
      if (!transfer.reference) throw new Error("Transfer event has no reference");
      const rows = await supabase(config, "booking_payment_state?select=booking_id&payout_reference=eq." +
        encodeURIComponent(String(transfer.reference)) + "&limit=1");
      const state = rows && rows[0];
      if (state) {
        const status = event.event === "transfer.success" ? "paid" : "failed";
        await supabase(config, "booking_payment_state?booking_id=eq." + encodeURIComponent(state.booking_id),
          "PATCH", { payout_status: status }, "return=minimal");
        const bookings = await supabase(config, "bookings?select=customer_id,artisan_id&id=eq." +
          encodeURIComponent(state.booking_id) + "&limit=1");
        const booking = bookings && bookings[0];
        if (booking) {
          await notify(config, booking.artisan_id, state.booking_id, "payout_" + status,
            status === "paid" ? "Your payout for booking " + state.booking_id + " has been sent." : "Payout for booking " + state.booking_id + " needs attention.");
          if (booking.customer_id) await notify(config, booking.customer_id, state.booking_id, "payout_" + status,
            status === "paid" ? "The artisan payout for booking " + state.booking_id + " is complete." : "The artisan payout for booking " + state.booking_id + " is being reviewed.");
        }
      }
    }
    return sendJson(res, 200, { received: true });
  } catch (e) {
    console.error("[paystack webhook]", e.message);
    return fail(res, 500, "Webhook processing failed; Paystack may retry this event.");
  }
}
async function currentUser(req, config) {
  const match = /^Bearer\s+(.+)$/i.exec(String(req.headers.authorization || ""));
  if (!match) return null;
  const response = await fetch(config.supabaseUrl + "/auth/v1/user", {
    headers: { apikey: config.supabaseAnonKey, Authorization: "Bearer " + match[1] }
  });
  if (!response.ok) return null;
  const user = await response.json();
  return user && user.id ? user : null;
}
async function handleBanks(req, res, config) {
  if (req.method !== "GET") return fail(res, 405, "Use GET.");
  if (!config.paystackSecretKey || /PASTE|YOUR_/i.test(config.paystackSecretKey)) return fail(res, 503, "Paystack is not configured on the server.");
  try {
    const banks = await paystack(config, "/bank?currency=GHS");
    return sendJson(res, 200, { banks: (banks || []).map((bank) => ({ name: bank.name, code: bank.code })) });
  } catch (e) {
    console.error("[payout banks]", e.message);
    return fail(res, 502, "Could not load payout banks.");
  }
}
async function handleRecipient(req, res, config) {
  if (req.method !== "POST") return fail(res, 405, "Use POST.");
  if (!envReady(config, true)) return fail(res, 503, "Payout setup is not configured on the server.");
  let user, body;
  try {
    user = await currentUser(req, config);
    if (!user) return fail(res, 401, "Please sign in again.");
    body = JSON.parse((await readBody(req)).toString("utf8"));
  } catch (e) { return fail(res, e.statusCode || 400, e.message || "Invalid request."); }
  const accountNumber = String(body.accountNumber || "").replace(/\s/g, "");
  const bankCode = String(body.bankCode || "");
  if (!/^\d{8,20}$/.test(accountNumber) || !/^[A-Za-z0-9_-]{1,32}$/.test(bankCode)) {
    return fail(res, 400, "Enter a valid Ghana bank account number and choose a bank.");
  }
  try {
    const profiles = await supabase(config, "profiles?select=id,name,role&id=eq." + encodeURIComponent(user.id) + "&limit=1");
    const profile = profiles && profiles[0];
    if (!profile || profile.role !== "artisan") return fail(res, 403, "Only artisan accounts can set up payouts.");
    const recipient = await paystack(config, "/transferrecipient", "POST", {
      type: "nuban", name: String(profile.name || "ServePoint artisan").slice(0, 100),
      account_number: accountNumber, bank_code: bankCode, currency: "GHS",
      description: "ServePoint artisan payout"
    });
    if (!recipient || !recipient.recipient_code) throw new Error("Paystack did not return a transfer recipient code");
    await supabase(config, "artisan_payout_accounts", "POST", {
      artisan_id: user.id, recipient_code: recipient.recipient_code
    }, "resolution=merge-duplicates,return=minimal");
    return sendJson(res, 200, { saved: true });
  } catch (e) {
    console.error("[payout recipient]", e.message);
    return fail(res, 502, "Could not save payout account. Check the bank details and try again.");
  }
}
async function handleCompletion(req, res, config) {
  if (req.method !== "POST") return fail(res, 405, "Use POST.");
  if (!envReady(config, true)) return fail(res, 503, "Payouts are not configured on the server.");
  let user, body;
  try {
    user = await currentUser(req, config);
    if (!user) return fail(res, 401, "Please sign in again.");
    body = JSON.parse((await readBody(req)).toString("utf8"));
  } catch (e) { return fail(res, e.statusCode || 400, e.message || "Invalid request."); }
  const bookingId = String(body.bookingId || "");
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(bookingId)) return fail(res, 400, "Invalid booking.");
  try {
    const bookings = await supabase(config, "bookings?select=id,total,status,customer_id,artisan_id&id=eq." +
      encodeURIComponent(bookingId) + "&customer_id=eq." + encodeURIComponent(user.id) + "&limit=1");
    const booking = bookings && bookings[0];
    if (!booking) return fail(res, 404, "Booking not found.");
    const payments = await supabase(config, "booking_payment_state?select=payment_status,payout_status,payout_reference&booking_id=eq." +
      encodeURIComponent(bookingId) + "&limit=1");
    const payment = payments && payments[0];
    if (!payment || payment.payment_status !== "confirmed") return fail(res, 409, "Payment must be verified before completion.");
    const retryingFailedPayout = booking.status === "completed" && payment.payout_status === "failed";
    if (!retryingFailedPayout && booking.status !== "arrived" && booking.status !== "working") {
      return fail(res, 409, "The booking is not ready to be completed.");
    }
    const applications = await supabase(config, "applications?select=artisan_id&booking_id=eq." +
      encodeURIComponent(bookingId) + "&status=eq.accepted&limit=1");
    const application = applications && applications[0];
    if (!application || !booking.artisan_id || application.artisan_id !== booking.artisan_id) return fail(res, 409, "No accepted artisan is assigned to this booking.");
    if (payment.payout_status === "paid" || payment.payout_status === "processing") {
      return sendJson(res, 200, { completed: true, payoutStatus: payment.payout_status });
    }
    const recipients = await supabase(config, "artisan_payout_accounts?select=recipient_code&artisan_id=eq." +
      encodeURIComponent(booking.artisan_id) + "&limit=1");
    const recipient = recipients && recipients[0];
    if (!recipient) return fail(res, 409, "The artisan has not set up a payout account yet.");
    const amountPesewas = Math.round(Number(booking.total) * 0.9 * 100);
    if (!Number.isSafeInteger(amountPesewas) || amountPesewas < 1) return fail(res, 409, "Invalid booking payout amount.");
    const reference = retryingFailedPayout ? "SP-" + crypto.randomUUID() :
      (payment.payout_reference || ("SP-" + crypto.randomUUID()));
    const expectedPayoutState = retryingFailedPayout ? "failed" : "awaiting_completion";
    const changed = await supabase(config, "booking_payment_state?booking_id=eq." + encodeURIComponent(bookingId) +
      "&payment_status=eq.confirmed&payout_status=eq." + expectedPayoutState, "PATCH",
      { payout_status: "processing", payout_reference: reference },
      "return=representation");
    if (!changed || !changed.length) return fail(res, 409, "Payout is already being processed or is not ready.");
    if (!retryingFailedPayout) {
      try {
        const completed = await supabase(config, "bookings?id=eq." + encodeURIComponent(bookingId) +
          "&status=in.(arrived,working)", "PATCH", { status: "completed" }, "return=representation");
        if (!completed || !completed.length) throw new Error("Booking completion could not be saved");
      } catch (error) {
        await supabase(config, "booking_payment_state?booking_id=eq." + encodeURIComponent(bookingId),
          "PATCH", { payout_status: expectedPayoutState, payout_reference: payment.payout_reference || null }, "return=minimal");
        throw error;
      }
    }
    try {
      await paystack(config, "/transfer", "POST", {
        source: "balance", amount: amountPesewas, recipient: recipient.recipient_code,
        reason: "ServePoint artisan payout for booking " + bookingId, reference
      });
    } catch (e) {
      if (Number.isInteger(e.paystackStatus) && e.paystackStatus < 500 && e.paystackStatus !== 409) {
        await supabase(config, "booking_payment_state?booking_id=eq." + encodeURIComponent(bookingId),
          "PATCH", { payout_status: "failed" }, "return=minimal");
      }
      throw e;
    }
    await notify(config, booking.artisan_id, bookingId, "job_completed", "The customer confirmed job " + bookingId + ". Your payout is processing.");
    return sendJson(res, 200, { completed: true, payoutStatus: "processing" });
  } catch (e) {
    console.error("[booking completion]", e.message);
    return fail(res, 500, "Could not complete booking or initiate payout.");
  }
}
async function handleBookingStatus(req, res, config) {
  if (req.method !== "POST") return fail(res, 405, "Use POST.");
  if (!config.supabaseUrl || !config.supabaseAnonKey || !config.supabaseServiceRoleKey ||
      /PASTE|YOUR_/i.test(config.supabaseUrl + config.supabaseAnonKey + config.supabaseServiceRoleKey)) {
    return fail(res, 503, "Booking updates are not configured on the server.");
  }
  let user, body;
  try {
    user = await currentUser(req, config);
    if (!user) return fail(res, 401, "Please sign in again.");
    body = JSON.parse((await readBody(req)).toString("utf8"));
  } catch (e) { return fail(res, e.statusCode || 400, e.message || "Invalid request."); }
  const bookingId = String(body.bookingId || "");
  const nextStatus = String(body.status || "");
  const previousStatus = nextStatus === "arrived" ? "enroute" : nextStatus === "working" ? "arrived" : "";
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(bookingId) || !previousStatus) return fail(res, 400, "Invalid booking update.");
  try {
    const accepted = await supabase(config, "applications?select=booking_id&booking_id=eq." +
      encodeURIComponent(bookingId) + "&artisan_id=eq." + encodeURIComponent(user.id) + "&status=eq.accepted&limit=1");
    if (!accepted || !accepted.length) return fail(res, 403, "Only the accepted artisan can update this request.");
    const rows = await supabase(config, "bookings?id=eq." + encodeURIComponent(bookingId) +
      "&artisan_id=eq." + encodeURIComponent(user.id) + "&status=eq." + previousStatus, "PATCH",
      { status: nextStatus }, "return=representation");
    if (!rows || !rows.length) return fail(res, 409, "The booking status has changed. Refresh and try again.");
    const customers = await supabase(config, "bookings?select=customer_id&id=eq." + encodeURIComponent(bookingId) + "&limit=1");
    if (customers && customers[0]) {
      await notify(config, customers[0].customer_id, bookingId, "artisan_" + nextStatus,
        nextStatus === "arrived" ? "Your artisan has arrived for booking " + bookingId + "." : "Work has started on booking " + bookingId + ".");
    }
    return sendJson(res, 200, { updated: true, status: nextStatus });
  } catch (e) {
    console.error("[booking status]", e.message);
    return fail(res, 500, "Could not update booking status.");
  }
}
async function handlePaymentStatus(req, res, config) {
  if (req.method !== "GET") return fail(res, 405, "Use GET.");
  if (!config.supabaseUrl || !config.supabaseAnonKey || !config.supabaseServiceRoleKey ||
      /PASTE|YOUR_/i.test(config.supabaseUrl + config.supabaseAnonKey + config.supabaseServiceRoleKey)) {
    return fail(res, 503, "Payment status is not configured on the server.");
  }
  const user = await currentUser(req, config);
  if (!user) return fail(res, 401, "Please sign in again.");
  const url = new URL(req.url || "/", "http://localhost");
  const bookingId = String(url.searchParams.get("bookingId") || "");
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(bookingId)) return fail(res, 400, "Invalid booking.");
  try {
    const bookings = await supabase(config, "bookings?select=id&id=eq." + encodeURIComponent(bookingId) +
      "&customer_id=eq." + encodeURIComponent(user.id) + "&limit=1");
    if (!bookings || !bookings.length) return fail(res, 404, "Booking not found.");
    const rows = await supabase(config, "booking_payment_state?select=payment_status,payout_status&booking_id=eq." +
      encodeURIComponent(bookingId) + "&limit=1");
    const state = rows && rows[0];
    return sendJson(res, 200, state || { payment_status: "pending", payout_status: "not_due" });
  } catch (e) {
    console.error("[payment status]", e.message);
    return fail(res, 500, "Could not load payment status.");
  }
}
module.exports = { handleWebhook, handleBanks, handleRecipient, handleCompletion, handleBookingStatus, handlePaymentStatus, signatureMatches, processPaymentEvent };
