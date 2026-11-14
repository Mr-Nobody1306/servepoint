"use strict";
/**
 * ServePoint REST API Routes
 * Clean, safe server endpoints for customer, provider, and admin workflows.
 */
const { sendJson } = require("./static");
const dataStore = require("./dataStore");

const MAX_BODY_BYTES = 64 * 1024;

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    let tooLarge = false;
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
    req.on("end", () => {
      if (tooLarge) return;
      if (chunks.length === 0) return resolve({});
      try {
        const bodyStr = Buffer.concat(chunks).toString("utf8");
        resolve(bodyStr ? JSON.parse(bodyStr) : {});
      } catch (err) {
        reject(Object.assign(new Error("Invalid JSON"), { statusCode: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function parseAuth(req) {
  const auth = req.headers["authorization"] || "";
  if (auth.startsWith("Bearer ")) {
    const token = auth.slice(7).trim();
    // 1. Check session in dataStore
    const sess = dataStore.getSession(token);
    if (sess) {
      const user = dataStore.getUserById(sess.userId);
      if (user) return user;
    }
    // 2. Fallback to direct user lookup for seed accounts / test tokens
    const user = dataStore.getUserById(token);
    if (user) return user;
  }
  return null;
}

async function handleApiRequest(req, res, pathname, config) {
  const method = req.method;
  const url = new URL(req.url || "/", "http://localhost");

  // --- Auth Endpoints ---
  if (pathname === "/api/auth/me" && method === "GET") {
    const user = parseAuth(req) || (url.searchParams.get("userId") ? dataStore.getUserById(url.searchParams.get("userId")) : null);
    return sendJson(res, 200, { user: dataStore.sanitizeUser(user) });
  }

  if (pathname === "/api/auth/login" && method === "POST") {
    const body = await readJsonBody(req);
    const identifier = String(body.email || body.userId || "").trim().toLowerCase();
    if (!identifier) {
      return sendJson(res, 400, { error: "Email or username is required." });
    }
    const user = dataStore.getUserByEmail(identifier) || dataStore.getUserById(identifier);
    if (!user) {
      return sendJson(res, 401, { error: "Invalid credentials: no account found with that email." });
    }
    if (user.passwordHash && user.passwordSalt) {
      if (!body.password || !dataStore.verifyPassword(body.password, user.passwordHash, user.passwordSalt)) {
        return sendJson(res, 401, { error: "Invalid password. Please check your credentials." });
      }
    } else {
      return sendJson(res, 401, { error: "Invalid credentials: password authentication is not configured for this account." });
    }
    const token = dataStore.createSession(user);
    return sendJson(res, 200, { ok: true, user: dataStore.sanitizeUser(user), token });
  }

  if (pathname === "/api/auth/register" && method === "POST") {
    const body = await readJsonBody(req);
    if (!body.name || !body.email || !body.password) {
      return sendJson(res, 400, { error: "Full name, email address, and password are required." });
    }
    const email = String(body.email).trim().toLowerCase();
    if (dataStore.getUserByEmail(email)) {
      return sendJson(res, 409, { error: "An account with this email address already exists. Please log in." });
    }

    // Role security: Never allow users to self-assign administrator role
    let role = String(body.role || "customer").trim().toLowerCase();
    if (role === "admin") {
      return sendJson(res, 403, { error: "Forbidden: Administrator accounts cannot be self-registered." });
    }
    // Retain internal backend role identifier 'artisan' for service providers
    if (role === "provider" || role === "service provider") {
      role = "artisan";
    }
    if (role !== "customer" && role !== "artisan") {
      role = "customer";
    }

    const { hash, salt } = dataStore.hashPassword(body.password);
    const user = dataStore.createUser({
      name: String(body.name).trim(),
      email,
      phone: body.phone ? String(body.phone).trim() : "",
      role,
      passwordHash: hash,
      passwordSalt: salt,
      trade: body.trade ? String(body.trade).trim() : null,
      area: body.area ? String(body.area).trim() : "Accra",
      address: body.address ? String(body.address).trim() : ""
    });

    // If an artisan registers, create their provider listing with status 'pending'
    if (role === "artisan") {
      dataStore.createProvider({
        id: user.id,
        name: user.name,
        trade: user.trade || "General Handyman",
        category: user.trade || "General Handyman",
        phone: user.phone,
        area: user.area,
        price: body.price ? Number(body.price) : 350,
        status: "pending",
        bio: body.bio || `Vetted independent artisan specializing in ${user.trade || "home maintenance"}.`
      });
    }

    const token = dataStore.createSession(user);
    return sendJson(res, 201, { ok: true, user: dataStore.sanitizeUser(user), token });
  }

  if (pathname === "/api/auth/logout" && method === "POST") {
    const auth = req.headers["authorization"] || "";
    if (auth.startsWith("Bearer ")) {
      const token = auth.slice(7).trim();
      dataStore.deleteSession(token);
    }
    return sendJson(res, 200, { ok: true });
  }

  // --- Providers Endpoints ---
  if (pathname === "/api/providers" && method === "GET") {
    const includePending = url.searchParams.get("includePending") === "true";
    const providers = dataStore.getProviders(includePending);
    return sendJson(res, 200, { providers });
  }

  if (pathname === "/api/providers/onboard" && method === "POST") {
    const body = await readJsonBody(req);
    if (!body.name || !body.trade) {
      return sendJson(res, 400, { error: "Provider name and trade are required" });
    }
    const provider = dataStore.createProvider(body);
    return sendJson(res, 201, { ok: true, provider });
  }

  const verifyMatch = pathname.match(/^\/api\/providers\/([^/]+)\/verify$/);
  if (verifyMatch && method === "POST") {
    const authUser = parseAuth(req);
    if (!authUser || authUser.role !== "admin") {
      return sendJson(res, 403, { error: "Forbidden: Administrator privileges required to verify providers." });
    }
    const providerId = decodeURIComponent(verifyMatch[1]);
    const body = await readJsonBody(req);
    let status = body.status || "approved";
    if (status !== "approved" && status !== "declined" && status !== "pending") {
      status = "approved";
    }
    const updated = dataStore.updateProviderStatus(providerId, status);
    if (!updated) return sendJson(res, 404, { error: "Provider not found" });
    return sendJson(res, 200, { ok: true, provider: updated });
  }

  const suspendMatch = pathname.match(/^\/api\/providers\/([^/]+)\/suspend$/);
  if (suspendMatch && method === "POST") {
    const authUser = parseAuth(req);
    if (!authUser || authUser.role !== "admin") {
      return sendJson(res, 403, { error: "Forbidden: Administrator privileges required to manage provider suspension." });
    }
    const providerId = decodeURIComponent(suspendMatch[1]);
    const body = await readJsonBody(req);
    const suspended = body.suspended !== undefined ? Boolean(body.suspended) : true;
    const updated = dataStore.setProviderSuspended(providerId, suspended);
    if (!updated) return sendJson(res, 404, { error: "Provider not found" });
    return sendJson(res, 200, { ok: true, provider: updated });
  }

  const provServiceMatch = pathname.match(/^\/api\/providers\/([^/]+)\/services$/);
  if (provServiceMatch && method === "POST") {
    const authUser = parseAuth(req);
    const providerId = decodeURIComponent(provServiceMatch[1]);
    if (!authUser || (authUser.role !== "admin" && authUser.id !== providerId)) {
      return sendJson(res, 403, { error: "Forbidden: You are not authorized to modify this provider's services." });
    }
    const body = await readJsonBody(req);
    if (!body.name || !String(body.name).trim()) {
      return sendJson(res, 400, { error: "Service name is required." });
    }
    if (body.price !== undefined && (isNaN(Number(body.price)) || Number(body.price) < 0)) {
      return sendJson(res, 400, { error: "Service price must be a valid non-negative number." });
    }
    const updated = dataStore.addProviderService(providerId, body);
    if (!updated) return sendJson(res, 404, { error: "Provider not found." });
    return sendJson(res, 201, { ok: true, provider: updated });
  }

  const provServiceItemMatch = pathname.match(/^\/api\/providers\/([^/]+)\/services\/([^/]+)$/);
  if (provServiceItemMatch && (method === "PUT" || method === "PATCH")) {
    const authUser = parseAuth(req);
    const providerId = decodeURIComponent(provServiceItemMatch[1]);
    const serviceId = decodeURIComponent(provServiceItemMatch[2]);
    if (!authUser || (authUser.role !== "admin" && authUser.id !== providerId)) {
      return sendJson(res, 403, { error: "Forbidden: You are not authorized to modify this provider's services." });
    }
    const body = await readJsonBody(req);
    const updated = dataStore.updateProviderService(providerId, serviceId, body);
    if (!updated) return sendJson(res, 404, { error: "Provider or service not found." });
    return sendJson(res, 200, { ok: true, provider: updated });
  }

  if (provServiceItemMatch && method === "DELETE") {
    const authUser = parseAuth(req);
    const providerId = decodeURIComponent(provServiceItemMatch[1]);
    const serviceId = decodeURIComponent(provServiceItemMatch[2]);
    if (!authUser || (authUser.role !== "admin" && authUser.id !== providerId)) {
      return sendJson(res, 403, { error: "Forbidden: You are not authorized to delete this provider's services." });
    }
    const updated = dataStore.deleteProviderService(providerId, serviceId);
    if (!updated) return sendJson(res, 404, { error: "Provider or service not found." });
    return sendJson(res, 200, { ok: true, provider: updated });
  }

  // --- Provider Availability ---
  const provAvailMatch = pathname.match(/^\/api\/providers\/([^/]+)\/availability$/);
  if (provAvailMatch && method === "GET") {
    const providerId = decodeURIComponent(provAvailMatch[1]);
    const availability = dataStore.getProviderAvailability(providerId);
    if (!availability) return sendJson(res, 404, { error: "Provider not found." });
    return sendJson(res, 200, { ok: true, availability });
  }

  if (provAvailMatch && (method === "PUT" || method === "POST")) {
    const authUser = parseAuth(req);
    const providerId = decodeURIComponent(provAvailMatch[1]);
    if (!authUser || (authUser.role !== "admin" && authUser.id !== providerId)) {
      return sendJson(res, 403, { error: "Forbidden: You are not authorized to update this provider's availability." });
    }
    const body = await readJsonBody(req);
    const availability = dataStore.updateProviderAvailability(providerId, body);
    if (!availability) return sendJson(res, 404, { error: "Provider not found." });
    return sendJson(res, 200, { ok: true, availability });
  }

  // --- Bookings Endpoints ---
  if (pathname === "/api/bookings" && method === "GET") {
    const authUser = parseAuth(req);
    const filter = {};
    if (url.searchParams.get("customerId")) filter.customerId = url.searchParams.get("customerId");
    if (url.searchParams.get("providerId")) filter.providerId = url.searchParams.get("providerId");
    if (url.searchParams.get("status")) filter.status = url.searchParams.get("status");

    // Scoped visibility based on authenticated role
    if (authUser && authUser.role !== "admin") {
      if (authUser.role === "customer" && !filter.customerId) {
        filter.customerId = authUser.id;
      } else if ((authUser.role === "artisan" || authUser.role === "provider") && !filter.providerId) {
        filter.providerId = authUser.id;
      }
    }

    const bookings = dataStore.getBookings(filter);
    return sendJson(res, 200, { bookings });
  }

  if (pathname === "/api/bookings" && method === "POST") {
    const authUser = parseAuth(req);
    if (!authUser) {
      return sendJson(res, 401, { error: "Authentication required to book a service. Please sign in." });
    }

    // Customer suspension guard
    const customerUser = dataStore.getUserById(authUser.id);
    if (customerUser && (customerUser.status === "suspended" || customerUser.suspended)) {
      return sendJson(res, 403, { error: "Account suspended: You cannot create new bookings while your account is suspended. Please contact support." });
    }

    const body = await readJsonBody(req);
    const providerId = String(body.providerId || "").trim();
    if (!providerId) {
      return sendJson(res, 400, { error: "Provider ID is required." });
    }
    const provider = dataStore.getProviderById(providerId);
    if (!provider) {
      return sendJson(res, 404, { error: "Service provider not found." });
    }

    // Provider suspension guard
    if (provider.suspended) {
      return sendJson(res, 400, { error: "This service provider is currently suspended and cannot receive new service requests." });
    }

    const serviceName = String(body.serviceName || "").trim();
    if (!serviceName) {
      return sendJson(res, 400, { error: "Service name is required." });
    }
    const date = String(body.date || "").trim();
    if (!date) {
      return sendJson(res, 400, { error: "Booking date is required." });
    }
    const time = String(body.time || "").trim();
    if (!time) {
      return sendJson(res, 400, { error: "Booking time is required." });
    }
    const address = String(body.address || "").trim();
    if (!address) {
      return sendJson(res, 400, { error: "Service address is required." });
    }

    // Protection against duplicate submissions within 15 seconds
    const recentDuplicates = dataStore.getBookings({
      customerId: authUser.id,
      providerId: provider.id
    }).filter(b => {
      const isSameSlot = String(b.date).trim().toLowerCase() === date.toLowerCase() &&
                         String(b.time).trim().toLowerCase() === time.toLowerCase();
      const createdRecently = (Date.now() - new Date(b.createdAt).getTime()) < 15000;
      return isSameSlot && createdRecently;
    });
    if (recentDuplicates.length > 0) {
      return sendJson(res, 409, { error: "Duplicate booking submission detected. You have recently submitted a booking for this time slot." });
    }

    // Server-side price calculation: calculate rate from provider's catalog
    let total = 350;
    if (provider.services && provider.services.length > 0) {
      const matched = provider.services.find(s => s.name.toLowerCase() === serviceName.toLowerCase() || (s.id && s.id === body.serviceId));
      if (matched && Number(matched.price) > 0) {
        total = Number(matched.price);
      } else {
        total = Number(provider.services[0].price) || 350;
      }
    } else if (provider.price && Number(provider.price) > 0) {
      total = Number(provider.price) * 10;
    }

    // Check instant booking vs request-based booking
    const isInstant = body.bookingType === "instant" || body.type === "instant";
    if (isInstant) {
      const availCheck = dataStore.checkProviderSlotAvailability(provider.id, date, time);
      if (!availCheck.ok) {
        return sendJson(res, 400, { error: availCheck.error });
      }
      const conflict = dataStore.checkProviderConflict(provider.id, date, time);
      if (conflict) {
        return sendJson(res, 409, { error: `Time slot unavailable: ${provider.name} is already booked on ${date} at ${time}.` });
      }
    }

    const booking = dataStore.createBooking({
      customerId: authUser.id,
      customerName: authUser.name || body.customerName || "Customer",
      customerPhone: body.customerPhone || authUser.phone || "+233 24 000 0000",
      customerEmail: authUser.email || "",
      serviceId: body.serviceId || provider.category.toLowerCase().replace(/[^a-z0-9]/g, "-"),
      serviceName,
      providerId: provider.id,
      providerName: provider.name,
      address,
      date,
      time,
      description: body.description ? String(body.description).trim() : (body.notes ? String(body.notes).trim() : ""),
      total,
      status: isInstant ? "accepted" : "pending",
      bookingType: isInstant ? "instant" : "request",
      type: isInstant ? "instant" : "request",
      paymentMethod: "offline_completion",
      duration: body.duration || "2 hours"
    });

    return sendJson(res, 201, { ok: true, booking });
  }

  const bookingRespondMatch = pathname.match(/^\/api\/bookings\/([^/]+)\/respond$/);
  if (bookingRespondMatch && method === "POST") {
    const authUser = parseAuth(req);
    if (!authUser) {
      return sendJson(res, 401, { error: "Unauthorized: Sign in required to respond to bookings." });
    }
    const bookingId = decodeURIComponent(bookingRespondMatch[1]);
    const booking = dataStore.getBookingById(bookingId);
    if (!booking) return sendJson(res, 404, { error: "Booking not found." });

    if (authUser.role !== "admin" && authUser.id !== booking.providerId) {
      return sendJson(res, 403, { error: "Forbidden: You are not authorized to respond to this booking." });
    }

    const body = await readJsonBody(req);
    let action = String(body.action || "accepted").toLowerCase().trim();
    if (action === "accept") action = "accepted";
    if (action === "reject" || action === "decline") action = "rejected";

    if (!["accepted", "rejected"].includes(action)) {
      return sendJson(res, 400, { error: "Invalid response action. Allowed: 'accepted', 'rejected'." });
    }

    const result = dataStore.updateBookingStatus(bookingId, action, body.notes);
    if (result.error) {
      return sendJson(res, result.statusCode || 400, { error: result.error });
    }
    return sendJson(res, 200, { ok: true, booking: result.booking });
  }

  const bookingCancelMatch = pathname.match(/^\/api\/bookings\/([^/]+)\/cancel$/);
  if (bookingCancelMatch && method === "POST") {
    const authUser = parseAuth(req);
    if (!authUser) {
      return sendJson(res, 401, { error: "Unauthorized: Sign in required to cancel a booking." });
    }
    const bookingId = decodeURIComponent(bookingCancelMatch[1]);
    const booking = dataStore.getBookingById(bookingId);
    if (!booking) return sendJson(res, 404, { error: "Booking not found." });

    if (authUser.role !== "admin" && authUser.id !== booking.customerId && authUser.id !== booking.providerId) {
      return sendJson(res, 403, { error: "Forbidden: You are not authorized to cancel this booking." });
    }

    const body = await readJsonBody(req);
    const result = dataStore.updateBookingStatus(bookingId, "cancelled", body.reason || "Cancelled by user");
    if (result.error) {
      return sendJson(res, result.statusCode || 400, { error: result.error });
    }
    return sendJson(res, 200, { ok: true, booking: result.booking });
  }

  const bookingProgressMatch = pathname.match(/^\/api\/bookings\/([^/]+)\/progress$/);
  if (bookingProgressMatch && method === "POST") {
    const authUser = parseAuth(req);
    if (!authUser) {
      return sendJson(res, 401, { error: "Unauthorized: Sign in required to update booking progress." });
    }
    const bookingId = decodeURIComponent(bookingProgressMatch[1]);
    const booking = dataStore.getBookingById(bookingId);
    if (!booking) return sendJson(res, 404, { error: "Booking not found." });

    if (authUser.role !== "admin" && authUser.id !== booking.providerId) {
      return sendJson(res, 403, { error: "Forbidden: You are not authorized to update progress on this booking." });
    }

    const body = await readJsonBody(req);
    let action = String(body.action || "").toLowerCase().trim();
    let targetStatus = action;
    if (action === "start") targetStatus = "in-progress";
    if (action === "complete") targetStatus = "completed";

    if (!["in-progress", "completed"].includes(targetStatus)) {
      return sendJson(res, 400, { error: "Invalid progress action. Allowed: 'start' (in-progress), 'complete' (completed)." });
    }

    const result = dataStore.updateBookingStatus(bookingId, targetStatus, body.notes);
    if (result.error) {
      return sendJson(res, result.statusCode || 400, { error: result.error });
    }
    return sendJson(res, 200, { ok: true, booking: result.booking });
  }

  // --- Reviews & Ratings Endpoints (FR-12) ---
  if (pathname === "/api/reviews" && method === "GET") {
    const providerId = url.searchParams.get("providerId");
    const bookingId = url.searchParams.get("bookingId");
    if (bookingId) {
      const review = dataStore.getReviewByBookingId(bookingId);
      return sendJson(res, 200, { review });
    }
    const reviews = dataStore.getReviews(providerId);
    let averageRating = 5.0;
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
      averageRating = Number((sum / reviews.length).toFixed(2));
    }
    return sendJson(res, 200, { reviews, averageRating, totalReviews: reviews.length });
  }

  if (pathname === "/api/reviews" && method === "POST") {
    const authUser = parseAuth(req);
    if (!authUser) {
      return sendJson(res, 401, { error: "Authentication required to submit a review." });
    }

    const body = await readJsonBody(req);
    const bookingId = String(body.bookingId || "").trim();
    if (!bookingId) {
      return sendJson(res, 400, { error: "Booking ID is required." });
    }

    const booking = dataStore.getBookingById(bookingId);
    if (!booking) {
      return sendJson(res, 404, { error: "Booking not found." });
    }

    if (booking.status !== "completed") {
      return sendJson(res, 400, { error: "Only completed services can be reviewed." });
    }

    if (authUser.role !== "admin" && authUser.id !== booking.customerId && authUser.name !== booking.customerName) {
      return sendJson(res, 403, { error: "Forbidden: You can only review your own completed bookings." });
    }

    const existingReview = dataStore.getReviewByBookingId(bookingId);
    if (existingReview) {
      return sendJson(res, 409, { error: "This booking has already been reviewed." });
    }

    const rating = Number(body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return sendJson(res, 400, { error: "Rating must be an integer between 1 and 5." });
    }

    const comment = String(body.comment || "").trim();
    if (!comment) {
      return sendJson(res, 400, { error: "Review comment is required." });
    }

    const review = dataStore.createReview({
      bookingId: booking.id,
      providerId: booking.providerId,
      customerId: authUser.id || booking.customerId,
      customerName: authUser.name || booking.customerName,
      rating,
      comment
    });

    const updatedProvider = dataStore.getProviderById(booking.providerId);
    const providerReviews = dataStore.getReviews(booking.providerId);

    return sendJson(res, 201, {
      ok: true,
      review,
      providerRating: updatedProvider ? updatedProvider.rating : rating,
      totalReviews: providerReviews.length
    });
  }

  // --- Categories Endpoints ---
  if (pathname === "/api/categories" && method === "GET") {
    const categories = dataStore.getCategories();
    return sendJson(res, 200, { categories });
  }

  if (pathname === "/api/categories" && method === "POST") {
    const authUser = parseAuth(req);
    if (!authUser || authUser.role !== "admin") {
      return sendJson(res, 403, { error: "Forbidden: Administrator privileges required to manage categories." });
    }
    const body = await readJsonBody(req);
    if (!body.name) return sendJson(res, 400, { error: "Category name is required" });
    const category = dataStore.createCategory(body);
    return sendJson(res, 201, { ok: true, category });
  }

  const catItemMatch = pathname.match(/^\/api\/categories\/([^/]+)$/);
  if (catItemMatch && (method === "PUT" || method === "PATCH")) {
    const authUser = parseAuth(req);
    if (!authUser || authUser.role !== "admin") {
      return sendJson(res, 403, { error: "Forbidden: Administrator privileges required to manage categories." });
    }
    const catId = decodeURIComponent(catItemMatch[1]);
    const body = await readJsonBody(req);
    const CORE_CATEGORY_IDS = [
      "plumbing", "electrical", "carpentry", "painting", "masonry",
      "cleaning", "appliances", "hvac", "assembly"
    ];
    if (CORE_CATEGORY_IDS.includes(String(catId).toLowerCase()) && body.active === false) {
      return sendJson(res, 400, { error: "The 9 core MVP service categories cannot be deactivated." });
    }
    const updated = dataStore.updateCategory(catId, body);
    if (!updated) return sendJson(res, 404, { error: "Category not found." });
    return sendJson(res, 200, { ok: true, category: updated });
  }

  if (catItemMatch && method === "DELETE") {
    const authUser = parseAuth(req);
    if (!authUser || authUser.role !== "admin") {
      return sendJson(res, 403, { error: "Forbidden: Administrator privileges required to manage categories." });
    }
    const catId = decodeURIComponent(catItemMatch[1]);
    const result = dataStore.deleteCategory(catId);
    if (result && result.error) return sendJson(res, result.statusCode || 400, { error: result.error });
    return sendJson(res, 200, result);
  }

  // --- Admin Customer Management ---
  if (pathname === "/api/admin/customers" && method === "GET") {
    const authUser = parseAuth(req);
    if (!authUser) {
      return sendJson(res, 401, { error: "Authentication required." });
    }
    if (authUser.role !== "admin") {
      return sendJson(res, 403, { error: "Forbidden: Administrator privileges required." });
    }
    const customers = dataStore.getCustomersWithStats();
    return sendJson(res, 200, { ok: true, customers });
  }

  const customerStatusMatch = pathname.match(/^\/api\/admin\/customers\/([^/]+)\/status$/);
  if (customerStatusMatch && (method === "PUT" || method === "POST")) {
    const authUser = parseAuth(req);
    if (!authUser) {
      return sendJson(res, 401, { error: "Authentication required." });
    }
    if (authUser.role !== "admin") {
      return sendJson(res, 403, { error: "Forbidden: Administrator privileges required." });
    }
    const targetCustomerId = decodeURIComponent(customerStatusMatch[1]);
    if (authUser.id === targetCustomerId) {
      return sendJson(res, 403, { error: "Administrators cannot suspend their own admin account." });
    }
    const body = await readJsonBody(req);
    const status = String(body.status || "active").toLowerCase().trim();
    if (status !== "active" && status !== "suspended") {
      return sendJson(res, 400, { error: "Invalid status: must be 'active' or 'suspended'." });
    }
    const result = dataStore.updateCustomerStatus(targetCustomerId, status, body.reason);
    if (result.error) {
      return sendJson(res, result.statusCode || 400, { error: result.error });
    }
    return sendJson(res, 200, result);
  }

  // --- Admin Booking Interventions ---
  const adminCancelMatch = pathname.match(/^\/api\/admin\/bookings\/([^/]+)\/cancel$/);
  if (adminCancelMatch && method === "POST") {
    const authUser = parseAuth(req);
    if (!authUser) {
      return sendJson(res, 401, { error: "Authentication required." });
    }
    if (authUser.role !== "admin") {
      return sendJson(res, 403, { error: "Forbidden: Administrator privileges required to administratively cancel bookings." });
    }
    const bookingId = decodeURIComponent(adminCancelMatch[1]);
    const body = await readJsonBody(req);
    const reason = String(body.reason || "").trim();
    if (!reason) {
      return sendJson(res, 400, { error: "A non-empty cancellation reason is required." });
    }
    const result = dataStore.adminCancelBooking(bookingId, authUser, reason);
    if (result.error) {
      return sendJson(res, result.statusCode || 400, { error: result.error });
    }
    return sendJson(res, 200, result);
  }

  // --- Stats / Admin Dashboard ---
  if (pathname === "/api/stats" && method === "GET") {
    const stats = dataStore.getPlatformStats();
    return sendJson(res, 200, { stats });
  }

  return sendJson(res, 404, { error: "API endpoint not found." });
}

module.exports = { handleApiRequest };
