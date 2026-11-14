"use strict";
/**
 * Dedicated automated tests for Phase 3:
 * Service Discovery, Provider Service Management, and Availability Management.
 * Run with: npm test (or: node --test test/*.js)
 */
const t = require("node:test");
const describe = t.describe;
const it = t.it;
const assert = require("node:assert/strict");
const dataStore = require("../src/dataStore");

describe("Phase 3: Service & Availability Management", function () {
  it("loads the 9 approved MVP service categories", function () {
    const cats = dataStore.getCategories();
    assert.strictEqual(cats.length, 9, "Must contain exactly 9 approved categories");
    const names = cats.map(c => c.name);
    const expected = [
      "Plumbing",
      "Electrical",
      "Carpentry",
      "Painting",
      "Masonry",
      "Cleaning",
      "Appliance Repairs",
      "HVAC/Ventilation",
      "Home Installation & Assembly"
    ];
    for (const exp of expected) {
      assert.ok(names.includes(exp), `Category ${exp} must be present`);
    }
  });

  it("allows provider to add, edit, and delete their own services", function () {
    const providerId = "kwame";
    const initialCount = (dataStore.getProviderById(providerId).services || []).length;

    // Add service
    const newService = {
      name: "Custom Bookshelf Fitting",
      category: "Carpentry",
      price: 600,
      billing: "Fixed price",
      description: "Hardwood bookshelf construction"
    };
    const updated = dataStore.addProviderService(providerId, newService);
    assert.ok(updated, "Must return updated provider");
    const added = updated.services.find(s => s.name === "Custom Bookshelf Fitting");
    assert.ok(added, "Service must be added");
    assert.ok(added.id, "Service must have an ID");
    assert.strictEqual(added.price, 600);

    // Edit service
    const edited = dataStore.updateProviderService(providerId, added.id, {
      price: 750,
      description: "Updated description with finish"
    });
    assert.ok(edited, "Must return updated provider on edit");
    const foundEdited = edited.services.find(s => s.id === added.id);
    assert.strictEqual(foundEdited.price, 750);
    assert.strictEqual(foundEdited.description, "Updated description with finish");

    // Delete service
    const deleted = dataStore.deleteProviderService(providerId, added.id);
    assert.ok(deleted, "Must return updated provider on delete");
    assert.strictEqual(deleted.services.find(s => s.id === added.id), undefined, "Service must be removed");
    assert.strictEqual(deleted.services.length, initialCount, "Count must return to original");
  });

  it("manages and persists provider availability", function () {
    const providerId = "kwame";
    const initialAvail = dataStore.getProviderAvailability(providerId);
    assert.ok(initialAvail, "Must have availability record");

    // Update availability
    const newAvail = {
      acceptingBookings: false,
      workingDays: ["Monday", "Wednesday", "Friday"],
      workingHours: "09:00 - 15:00",
      emergencyAvailable: false
    };
    const saved = dataStore.updateProviderAvailability(providerId, newAvail);
    assert.strictEqual(saved.acceptingBookings, false);
    assert.deepStrictEqual(saved.workingDays, ["Monday", "Wednesday", "Friday"]);
    assert.strictEqual(saved.workingHours, "09:00 - 15:00");

    // Check persistence from store
    const retrieved = dataStore.getProviderAvailability(providerId);
    assert.strictEqual(retrieved.acceptingBookings, false);
    assert.deepStrictEqual(retrieved.workingDays, ["Monday", "Wednesday", "Friday"]);

    // Restore to accepting bookings
    dataStore.updateProviderAvailability(providerId, {
      acceptingBookings: true,
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      workingHours: "08:00 - 17:00"
    });
  });

  it("updates category metadata", function () {
    const cat = dataStore.updateCategory("plumbing", {
      description: "Updated description: Pipes, pumps, taps and water tanks"
    });
    assert.ok(cat, "Category must be updated");
    assert.strictEqual(cat.description, "Updated description: Pipes, pumps, taps and water tanks");
  });

  it("enforces HTTP authorization: one provider cannot edit another provider's services", async function () {
    const { handleApiRequest } = require("../src/apiRoutes");
    const { EventEmitter } = require("node:events");

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

    // Provider A (yaw) logs in / gets session
    const yawUser = dataStore.getUserById("yaw") || dataStore.createUser({ id: "yaw", name: "Yaw", role: "artisan", email: "yaw@example.com" });
    const yawToken = dataStore.createSession(yawUser);

    // Yaw attempts to modify Kwame's services -> MUST BE REJECTED 403
    const req1 = mockReq("POST", "/api/providers/kwame/services", { name: "Malicious Service", price: 100 }, yawToken);
    const res1 = mockRes();
    await handleApiRequest(req1, res1, "/api/providers/kwame/services", {});
    assert.strictEqual(res1.statusCode, 403, "Must forbid Provider A from adding services to Provider B");

    // Yaw attempts to update Kwame's availability -> MUST BE REJECTED 403
    const req2 = mockReq("PUT", "/api/providers/kwame/availability", { acceptingBookings: false }, yawToken);
    const res2 = mockRes();
    await handleApiRequest(req2, res2, "/api/providers/kwame/availability", {});
    assert.strictEqual(res2.statusCode, 403, "Must forbid Provider A from updating Provider B availability");

    // Kwame updates their own services -> ALLOWED 201
    const kwameUser = dataStore.getUserById("kwame");
    const kwameToken = dataStore.createSession(kwameUser);
    const req3 = mockReq("POST", "/api/providers/kwame/services", { name: "Kwame Real Service", price: 500, category: "Carpentry" }, kwameToken);
    const res3 = mockRes();
    await handleApiRequest(req3, res3, "/api/providers/kwame/services", {});
    assert.strictEqual(res3.statusCode, 201, "Kwame must be allowed to add their own service");

    // Customer or Artisan attempts to manage categories -> MUST BE REJECTED 403
    const req4 = mockReq("PUT", "/api/categories/carpentry", { description: "Hacked" }, kwameToken);
    const res4 = mockRes();
    await handleApiRequest(req4, res4, "/api/categories/carpentry", {});
    assert.strictEqual(res4.statusCode, 403, "Non-admin must not manage categories");

    // Admin manages categories -> ALLOWED 200
    const adminUser = dataStore.getUserById("admin");
    const adminToken = dataStore.createSession(adminUser);
    const req5 = mockReq("PUT", "/api/categories/carpentry", { description: "Master woodworking & finishings" }, adminToken);
    const res5 = mockRes();
    await handleApiRequest(req5, res5, "/api/categories/carpentry", {});
    assert.strictEqual(res5.statusCode, 200, "Admin must be allowed to update categories");
  });
});
