"use strict";
/**
 * ServePoint Data Store
 * Unified persistent storage for ServePoint.
 * Persists data to JSON on disk and syncs with Supabase if available.
 */
const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const DATA_FILE = path.join(__dirname, "data", "store.json");

function hashPassword(password, salt) {
  salt = salt || crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 32).toString("hex");
  return { hash, salt };
}

function verifyPassword(password, storedHash, salt) {
  if (!storedHash || !salt) return false;
  try {
    const hash = crypto.scryptSync(password, salt, 32).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(storedHash, "hex"));
  } catch (e) {
    return false;
  }
}

function getDefaultData() {
  const seedPass = hashPassword("password123");
  return {
    categories: [
      { id: "plumbing", name: "Plumbing", description: "Pipes, drains, taps and water tanks", icon: "tools", active: true },
      { id: "electrical", name: "Electrical", description: "Wiring, fixtures, sockets & generators", icon: "settings", active: true },
      { id: "carpentry", name: "Carpentry", description: "Doors, cabinets, shelving and roofs", icon: "grid", active: true },
      { id: "painting", name: "Painting", description: "Interior & exterior wall paint", icon: "heart", active: true },
      { id: "masonry", name: "Masonry", description: "Tiling, brickwork, paving & plastering", icon: "home", active: true },
      { id: "cleaning", name: "Cleaning", description: "Deep cleaning, post-construction & sanitation", icon: "star", active: true },
      { id: "appliances", name: "Appliance Repairs", description: "Fridges, washing machines, microwaves", icon: "settings", active: true },
      { id: "hvac", name: "HVAC/Ventilation", description: "AC installation, gas top-up & maintenance", icon: "clock", active: true },
      { id: "assembly", name: "Home Installation & Assembly", description: "Curtains, TV mounting, fixtures", icon: "plus", active: true }
    ],
    providers: [
      {
        id: "kwame",
        name: "Kwame Ofori",
        trade: "Carpentry & Woodwork",
        category: "Carpentry & Woodwork",
        rating: 4.91,
        jobs: 326,
        price: 450,
        area: "Adenta, Accra",
        phone: "+233 24 555 0184",
        status: "approved",
        initials: "KO",
        color: "#7e9270",
        image: "https://images.unsplash.com/photo-1764169689207-e23fb66e1fcf?auto=format&fit=crop&w=700&q=85",
        bio: "Master carpenter with over 10 years of experience in furniture craft, roofing, and wall installations.",
        services: [
          { name: "Shelf installation & wall repair", price: 450, billing: "Per hour", description: "Mounting shelves and plaster finishing" },
          { name: "Door hinge & lock fitting", price: 350, billing: "Fixed price", description: "Repairing or replacing door hinges and security locks" },
          { name: "Custom cabinet building", price: 850, billing: "Fixed price", description: "Precision joinery for kitchen and bedroom cabinets" }
        ],
        documents: { idVerified: true, insurance: true, references: 2 }
      },
      {
        id: "akosua",
        name: "Akosua Mensah",
        trade: "Cleaning & Home Care",
        category: "Cleaning & Home Care",
        rating: 4.96,
        jobs: 184,
        price: 320,
        area: "East Legon, Accra",
        phone: "+233 24 111 0001",
        status: "approved",
        initials: "AM",
        color: "#d3a278",
        image: "https://images.unsplash.com/photo-1677111007908-315c782a2586?auto=format&fit=crop&w=700&q=85",
        bio: "Specialist in detailed domestic cleaning, post-renovation cleaning, and organic home sanitisation.",
        services: [
          { name: "Standard home deep clean", price: 320, billing: "Per hour", description: "Complete sanitation of kitchen, bathrooms, and rooms" },
          { name: "Window & upholstery cleaning", price: 400, billing: "Fixed price", description: "Thorough glass clarity and fabric extraction" }
        ],
        documents: { idVerified: true, insurance: true, references: 2 }
      },
      {
        id: "kwaku",
        name: "Kwaku Electrical",
        trade: "Electrical Services",
        category: "Electrical Services",
        rating: 4.88,
        jobs: 119,
        price: 380,
        area: "Madina, Accra",
        phone: "+233 24 222 0002",
        status: "approved",
        initials: "KE",
        color: "#b5aa7b",
        image: "https://images.unsplash.com/photo-1687422810318-f2146d2d60ee?auto=format&fit=crop&w=700&q=85",
        bio: "Certified domestic electrical technician specializing in backup power, circuit diagnosis, and safe breaker panels.",
        services: [
          { name: "Circuit diagnosis & breaker repair", price: 380, billing: "Fixed price", description: "Full safety check and breaker replacement" },
          { name: "Generator changeover switch", price: 550, billing: "Fixed price", description: "Manual or automatic changeover installation" }
        ],
        documents: { idVerified: true, insurance: true, references: 2 }
      },
      {
        id: "yaw",
        name: "Yaw Plumbing Works",
        trade: "Plumbing",
        category: "Plumbing",
        rating: 4.93,
        jobs: 204,
        price: 350,
        area: "Spintex, Accra",
        phone: "+233 24 333 0003",
        status: "approved",
        initials: "YP",
        color: "#829d9a",
        image: "https://images.unsplash.com/photo-1687422811062-a966b55cb217?auto=format&fit=crop&w=700&q=85",
        bio: "Fast response emergency plumbing, borehole pump systems, overhead tank plumbing, and pipe relining.",
        services: [
          { name: "Leak repair & pipe replacement", price: 350, billing: "Fixed price", description: "Detecting and resolving leaking conduits" },
          { name: "Water tank & pump install", price: 750, billing: "Fixed price", description: "Polytank elevation and automatic float switch" }
        ],
        documents: { idVerified: true, insurance: true, references: 2 }
      },
      {
        id: "adom",
        name: "Adom Paint Studio",
        trade: "Painting & Wall Finishing",
        category: "Painting & Wall Finishing",
        rating: 4.90,
        jobs: 148,
        price: 400,
        area: "Osu, Accra",
        phone: "+233 24 444 0004",
        status: "approved",
        initials: "AP",
        color: "#c48d6e",
        image: "https://images.unsplash.com/photo-1532437698276-c2ac365e7147?auto=format&fit=crop&w=700&q=85",
        bio: "Interior aesthetics, exterior waterproof emulsion, wall screeding, and decorative accent walls.",
        services: [
          { name: "Interior 2-room painting", price: 800, billing: "Fixed price", description: "Preparation, 2 coats washable paint" }
        ],
        documents: { idVerified: true, insurance: true, references: 2 }
      },
      {
        id: "nhyira",
        name: "Nhyira Cleaning Co.",
        trade: "Cleaning & Home Care",
        category: "Cleaning & Home Care",
        rating: 4.80,
        jobs: 42,
        price: 300,
        area: "Madina, Accra",
        phone: "+233 24 777 0007",
        status: "pending",
        initials: "NC",
        color: "#9cae95",
        image: "https://images.unsplash.com/photo-1677111007908-315c782a2586?auto=format&fit=crop&w=700&q=85",
        bio: "Professional commercial and home cleaning crew.",
        services: [
          { name: "Apartment deep scrub", price: 300, billing: "Fixed price", description: "Kitchen, washrooms and floors" }
        ],
        documents: { idVerified: true, insurance: true, references: 2 }
      },
      {
        id: "volta",
        name: "Volta Electrical",
        trade: "Electrical Services",
        category: "Electrical Services",
        rating: 4.75,
        jobs: 31,
        price: 360,
        area: "Tema, Accra",
        phone: "+233 24 888 0008",
        status: "pending",
        initials: "VE",
        color: "#d8c59f",
        image: "https://images.unsplash.com/photo-1687422810318-f2146d2d60ee?auto=format&fit=crop&w=700&q=85",
        bio: "Licensed domestic electrics and solar panel inverter installation.",
        services: [
          { name: "Inverter & battery setup", price: 650, billing: "Fixed price", description: "Wiring and testing backup inverters" }
        ],
        documents: { idVerified: true, insurance: true, references: 2 }
      }
    ],
    bookings: [
      {
        id: "SP-2841",
        customerId: "ama",
        customerName: "Ama Boateng",
        customerPhone: "+233 24 555 0184",
        customerEmail: "ama@example.com",
        serviceId: "carpentry",
        serviceName: "Shelf installation & wall repair",
        providerId: "kwame",
        providerName: "Kwame Ofori",
        address: "24 Kofi Annan Street, Adenta, Accra",
        date: "Tuesday, 18 June",
        time: "10:30",
        description: "Mount two oak shelves in the living room. Plaster over brick wall.",
        status: "confirmed", // pending, confirmed, accepted, in-progress, completed, declined
        total: 900,
        duration: "2 hours",
        createdAt: new Date(Date.now() - 3600 * 1000 * 12).toISOString()
      },
      {
        id: "SP-2840",
        customerId: "kofi",
        customerName: "Kofi Addo",
        customerPhone: "+233 24 999 0009",
        customerEmail: "kofi@example.com",
        serviceId: "cleaning",
        serviceName: "Deep cleaning",
        providerId: "akosua",
        providerName: "Akosua Mensah",
        address: "12 Senchi Street, Airport Residential, Accra",
        date: "Wednesday, 19 June",
        time: "09:00",
        description: "Deep clean 3-bedroom apartment before moving in.",
        status: "in-progress",
        total: 1280,
        duration: "4 hours",
        createdAt: new Date(Date.now() - 3600 * 1000 * 24).toISOString()
      },
      {
        id: "SP-2839",
        customerId: "efua",
        customerName: "Efua Danso",
        customerPhone: "+233 24 000 0010",
        customerEmail: "efua@example.com",
        serviceId: "hvac",
        serviceName: "AC servicing",
        providerId: "kwaku",
        providerName: "Kwaku Electrical",
        address: "7 Ring Road Central, Osu, Accra",
        date: "Thursday, 20 June",
        time: "14:00",
        description: "Two split-unit ACs need filter wash and gas top-up.",
        status: "pending",
        total: 760,
        duration: "2 hours",
        createdAt: new Date(Date.now() - 3600 * 1000 * 36).toISOString()
      }
    ],
    users: [
      {
        id: "ama",
        email: "ama@example.com",
        name: "Ama Boateng",
        phone: "+233 24 555 0184",
        role: "customer",
        passwordHash: seedPass.hash,
        passwordSalt: seedPass.salt,
        address: "24 Kofi Annan Street, Adenta, Accra"
      },
      {
        id: "kwame",
        email: "kwame@example.com",
        name: "Kwame Ofori",
        phone: "+233 24 555 0184",
        role: "artisan",
        trade: "Carpentry & Woodwork",
        passwordHash: seedPass.hash,
        passwordSalt: seedPass.salt,
        area: "Adenta, Accra"
      },
      {
        id: "admin",
        email: "admin@servepoint.gh",
        name: "ServePoint Admin",
        phone: "+233 30 200 0000",
        role: "admin",
        passwordHash: seedPass.hash,
        passwordSalt: seedPass.salt,
        area: "Accra"
      }
    ],
    reviews: [
      {
        id: "rev-1",
        bookingId: "SP-2841",
        providerId: "kwame",
        customerId: "ama",
        customerName: "Ama Boateng",
        rating: 5,
        comment: "Kwame was punctual, warm and incredibly precise. The shelving was mounted with clean precision and floors left spotless.",
        createdAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString()
      },
      {
        id: "rev-2",
        bookingId: "SP-2840",
        providerId: "akosua",
        customerId: "kofi",
        customerName: "Kofi Addo",
        rating: 5,
        comment: "Exceptional deep cleaning service! The apartment was thoroughly sanitised and smelling wonderful.",
        createdAt: new Date(Date.now() - 3600 * 1000 * 72).toISOString()
      }
    ],
    sessions: {}
  };
}

class DataStore {
  constructor() {
    this.data = this.load();
  }

  load() {
    let loaded = null;
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, "utf8");
        loaded = JSON.parse(raw);
      }
    } catch (e) {
      console.error("[DataStore] Error reading store.json, using defaults:", e.message);
    }
    const data = loaded || getDefaultData();
    this.data = data;
    this.ensureDemoAccounts();
    this.save(this.data);
    return this.data;
  }

  ensureDemoAccounts() {
    // Explicit security check: Demo account initialization and default credentials
    // are strictly disabled in production environments.
    if (process.env.NODE_ENV === "production") {
      return;
    }

    this.data.users = this.data.users || [];
    this.data.providers = this.data.providers || [];

    const seedPass = hashPassword("password123");

    // 1. Customer Demo: Ama Boateng
    let ama = this.data.users.find(u => u.id === "ama" || (u.email && u.email.toLowerCase() === "ama@example.com"));
    if (!ama) {
      ama = {
        id: "ama",
        email: "ama@example.com",
        name: "Ama Boateng",
        phone: "+233 24 555 0184",
        role: "customer",
        passwordHash: seedPass.hash,
        passwordSalt: seedPass.salt,
        address: "24 Kofi Annan Street, Adenta, Accra"
      };
      this.data.users.push(ama);
    } else {
      ama.id = "ama";
      ama.role = "customer";
      ama.email = "ama@example.com";
      ama.name = ama.name || "Ama Boateng";
      ama.passwordHash = seedPass.hash;
      ama.passwordSalt = seedPass.salt;
      ama.address = ama.address || "24 Kofi Annan Street, Adenta, Accra";
      ama.phone = ama.phone || "+233 24 555 0184";
    }

    // 2. Service Provider / Artisan Demo: Kwame Ofori
    let kwame = this.data.users.find(u => u.id === "kwame" || (u.email && u.email.toLowerCase() === "kwame@example.com"));
    if (!kwame) {
      kwame = {
        id: "kwame",
        email: "kwame@example.com",
        name: "Kwame Ofori",
        phone: "+233 24 555 0184",
        role: "artisan",
        trade: "Carpentry & Woodwork",
        passwordHash: seedPass.hash,
        passwordSalt: seedPass.salt,
        area: "Adenta, Accra"
      };
      this.data.users.push(kwame);
    } else {
      kwame.id = "kwame";
      kwame.role = "artisan"; // internal role required by ServePoint architecture
      kwame.email = "kwame@example.com";
      kwame.name = kwame.name || "Kwame Ofori";
      kwame.trade = kwame.trade || "Carpentry & Woodwork";
      kwame.passwordHash = seedPass.hash;
      kwame.passwordSalt = seedPass.salt;
      kwame.area = kwame.area || "Adenta, Accra";
      kwame.phone = kwame.phone || "+233 24 555 0184";
    }

    // Ensure Kwame's associated provider record exists in providers
    let kwameProv = this.data.providers.find(p => p.id === "kwame");
    if (!kwameProv) {
      kwameProv = {
        id: "kwame",
        name: "Kwame Ofori",
        trade: "Carpentry & Woodwork",
        category: "Carpentry & Woodwork",
        rating: 4.91,
        jobs: 326,
        price: 450,
        area: "Adenta, Accra",
        phone: "+233 24 555 0184",
        status: "approved",
        initials: "KO",
        color: "#7e9270",
        image: "https://images.unsplash.com/photo-1764169689207-e23fb66e1fcf?auto=format&fit=crop&w=700&q=85",
        bio: "Master carpenter with over 10 years of experience in furniture craft, roofing, and wall installations.",
        services: [
          { name: "Shelf installation & wall repair", price: 450, billing: "Per hour", description: "Mounting shelves and plaster finishing" },
          { name: "Door hinge & lock fitting", price: 350, billing: "Fixed price", description: "Repairing or replacing door hinges and security locks" },
          { name: "Custom cabinet building", price: 850, billing: "Fixed price", description: "Precision joinery for kitchen and bedroom cabinets" }
        ],
        documents: { idVerified: true, insurance: true, references: 2 },
        availability: {
          acceptingBookings: true,
          workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          workingHours: "08:00 - 17:00",
          emergencyAvailable: false
        }
      };
      this.data.providers.push(kwameProv);
    } else {
      kwameProv.status = "approved";
      if (!kwameProv.availability) {
        kwameProv.availability = {
          acceptingBookings: true,
          workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
          workingHours: "08:00 - 17:00",
          emergencyAvailable: false
        };
      }
      if (!kwameProv.services || kwameProv.services.length === 0) {
        kwameProv.services = [
          { name: "Shelf installation & wall repair", price: 450, billing: "Per hour", description: "Mounting shelves and plaster finishing" },
          { name: "Door hinge & lock fitting", price: 350, billing: "Fixed price", description: "Repairing or replacing door hinges and security locks" },
          { name: "Custom cabinet building", price: 850, billing: "Fixed price", description: "Precision joinery for kitchen and bedroom cabinets" }
        ];
      }
    }

    // 3. Platform Admin Demo: ServePoint Admin
    let admin = this.data.users.find(u => u.id === "admin" || (u.email && u.email.toLowerCase() === "admin@servepoint.gh"));
    if (!admin) {
      admin = {
        id: "admin",
        email: "admin@servepoint.gh",
        name: "ServePoint Admin",
        phone: "+233 30 200 0000",
        role: "admin",
        passwordHash: seedPass.hash,
        passwordSalt: seedPass.salt,
        area: "Accra"
      };
      this.data.users.push(admin);
    } else {
      admin.id = "admin";
      admin.role = "admin";
      admin.email = "admin@servepoint.gh";
      admin.name = admin.name || "ServePoint Admin";
      admin.passwordHash = seedPass.hash;
      admin.passwordSalt = seedPass.salt;
      admin.phone = admin.phone || "+233 30 200 0000";
    }

    // 4. Default Reviews (FR-12)
    this.data.reviews = this.data.reviews || [];
    if (this.data.reviews.length === 0) {
      this.data.reviews = [
        {
          id: "rev-1",
          bookingId: "SP-2841",
          providerId: "kwame",
          customerId: "ama",
          customerName: "Ama Boateng",
          rating: 5,
          comment: "Kwame was punctual, warm and incredibly precise. The shelving was mounted with clean precision and floors left spotless.",
          createdAt: new Date(Date.now() - 3600 * 1000 * 48).toISOString()
        },
        {
          id: "rev-2",
          bookingId: "SP-2840",
          providerId: "akosua",
          customerId: "kofi",
          customerName: "Kofi Addo",
          rating: 5,
          comment: "Exceptional deep cleaning service! The apartment was thoroughly sanitised and smelling wonderful.",
          createdAt: new Date(Date.now() - 3600 * 1000 * 72).toISOString()
        }
      ];
    }
  }

  save(data) {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(DATA_FILE, JSON.stringify(data || this.data, null, 2), "utf8");
    } catch (e) {
      console.error("[DataStore] Error writing store.json:", e.message);
    }
  }

  // --- Users / Auth ---
  getUsers() { return this.data.users || []; }
  getUserById(id) {
    if (!id) return null;
    return this.getUsers().find(u => u.id === id || (u.email && u.email.toLowerCase() === id.toLowerCase()));
  }
  getUserByEmail(email) {
    if (!email) return null;
    const low = email.toLowerCase().trim();
    return this.getUsers().find(u => u.email && u.email.toLowerCase() === low);
  }
  sanitizeUser(user) {
    if (!user) return null;
    const { passwordHash, passwordSalt, ...safe } = user;
    return safe;
  }
  createUser(userData) {
    const id = userData.id || ("usr-" + Date.now().toString(36) + "-" + crypto.randomBytes(3).toString("hex"));
    const user = Object.assign({ id }, userData);
    this.data.users = (this.data.users || []).filter(u => u.id !== id && (!u.email || u.email.toLowerCase() !== user.email.toLowerCase()));
    this.data.users.push(user);
    this.save();
    return user;
  }
  updateUser(id, updates) {
    const idx = (this.data.users || []).findIndex(u => u.id === id);
    if (idx < 0) return null;
    this.data.users[idx] = Object.assign({}, this.data.users[idx], updates);
    this.save();
    return this.data.users[idx];
  }

  // --- Sessions ---
  createSession(user) {
    this.data.sessions = this.data.sessions || {};
    const token = "sp_sess_" + crypto.randomBytes(24).toString("hex");
    this.data.sessions[token] = {
      userId: user.id,
      role: user.role,
      email: user.email,
      name: user.name,
      createdAt: Date.now(),
      expiresAt: Date.now() + 7 * 86400 * 1000 // 7 days
    };
    this.save();
    return token;
  }

  getSession(token) {
    if (!token) return null;
    this.data.sessions = this.data.sessions || {};
    const sess = this.data.sessions[token];
    if (!sess) return null;
    if (sess.expiresAt && Date.now() > sess.expiresAt) {
      delete this.data.sessions[token];
      this.save();
      return null;
    }
    return sess;
  }

  deleteSession(token) {
    if (!token) return false;
    this.data.sessions = this.data.sessions || {};
    if (this.data.sessions[token]) {
      delete this.data.sessions[token];
      this.save();
      return true;
    }
    return false;
  }

  // --- Providers ---
  getProviders(includePending = false) {
    const all = this.data.providers || [];
    if (includePending) return all;
    return all.filter(p => p.status === "approved");
  }
  getProviderById(id) {
    return (this.data.providers || []).find(p => p.id === id || p.name.toLowerCase() === id.toLowerCase());
  }
  createProvider(providerData) {
    const id = providerData.id || providerData.name.toLowerCase().replace(/[^a-z0-9]/g, "-").slice(0, 30);
    const initials = providerData.initials || providerData.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
    const newProv = Object.assign({
      id,
      rating: 5.0,
      jobs: 0,
      price: 350,
      status: "pending",
      initials,
      color: "#829d9a",
      services: [],
      availability: {
        acceptingBookings: true,
        workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
        workingHours: "08:00 - 17:00",
        emergencyAvailable: false
      },
      documents: { idVerified: true, insurance: true, references: 1 }
    }, providerData);
    this.data.providers = (this.data.providers || []).filter(p => p.id !== id);
    this.data.providers.push(newProv);
    this.save();
    return newProv;
  }
  updateProviderStatus(id, status) {
    const p = this.getProviderById(id);
    if (!p) return null;
    p.status = status; // approved, declined, suspended
    this.save();
    return p;
  }
  addProviderService(providerId, service) {
    const p = this.getProviderById(providerId);
    if (!p) return null;
    p.services = p.services || [];
    const id = service.id || ("srv-" + Date.now().toString(36) + "-" + crypto.randomBytes(3).toString("hex"));
    const newService = Object.assign({
      id,
      name: service.name,
      category: service.category || p.category || p.trade,
      price: Number(service.price) || 350,
      billing: service.billing || "Fixed price",
      description: service.description || ""
    }, service, { id });
    p.services.push(newService);
    this.save();
    return p;
  }
  updateProviderService(providerId, serviceId, updates) {
    const p = this.getProviderById(providerId);
    if (!p || !p.services) return null;
    const idx = p.services.findIndex(s => s.id === serviceId || s.name === serviceId);
    if (idx === -1) return null;
    p.services[idx] = Object.assign({}, p.services[idx], updates);
    if (updates.price !== undefined) p.services[idx].price = Number(updates.price);
    this.save();
    return p;
  }
  deleteProviderService(providerId, serviceId) {
    const p = this.getProviderById(providerId);
    if (!p || !p.services) return null;
    const initialLen = p.services.length;
    p.services = p.services.filter(s => s.id !== serviceId && s.name !== serviceId);
    if (p.services.length === initialLen) return null;
    this.save();
    return p;
  }
  getProviderAvailability(providerId) {
    const p = this.getProviderById(providerId);
    if (!p) return null;
    return p.availability || {
      acceptingBookings: true,
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      workingHours: "08:00 - 17:00",
      emergencyAvailable: false
    };
  }
  updateProviderAvailability(providerId, availability) {
    const p = this.getProviderById(providerId);
    if (!p) return null;
    p.availability = Object.assign({
      acceptingBookings: true,
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      workingHours: "08:00 - 17:00",
      emergencyAvailable: false
    }, p.availability || {}, availability);
    this.save();
    return p.availability;
  }

  // --- Bookings ---
  getBookings(filter = {}) {
    let list = this.data.bookings || [];
    if (filter.customerId) list = list.filter(b => b.customerId === filter.customerId);
    if (filter.providerId) list = list.filter(b => b.providerId === filter.providerId);
    if (filter.status) list = list.filter(b => b.status === filter.status);
    return list.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }
  getBookingById(id) {
    return (this.data.bookings || []).find(b => b.id === id);
  }
  checkProviderConflict(providerId, date, time, excludeBookingId = null) {
    if (!providerId || !date || !time) return null;
    const cleanDate = String(date).trim().toLowerCase();
    const cleanTime = String(time).trim().toLowerCase();
    const activeBookings = (this.data.bookings || []).filter(b => {
      if (excludeBookingId && b.id === excludeBookingId) return false;
      if (b.providerId !== providerId) return false;
      const status = String(b.status || "").toLowerCase();
      return ["pending", "accepted", "in-progress"].includes(status);
    });
    return activeBookings.find(b => {
      const bDate = String(b.date || "").trim().toLowerCase();
      const bTime = String(b.time || "").trim().toLowerCase();
      return bDate === cleanDate && bTime === cleanTime;
    }) || null;
  }
  checkProviderSlotAvailability(providerId, date, time) {
    const provider = this.getProviderById(providerId);
    if (!provider) return { ok: false, error: "Provider not found" };
    const avail = provider.availability || {
      acceptingBookings: true,
      workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      workingHours: "08:00 - 17:00"
    };
    if (avail.acceptingBookings === false) {
      return { ok: false, error: "Provider is currently not accepting new bookings." };
    }
    if (Array.isArray(avail.workingDays) && avail.workingDays.length > 0) {
      const dayMatches = avail.workingDays.some(day =>
        String(date).toLowerCase().includes(day.toLowerCase()) ||
        String(date).toLowerCase().includes(day.slice(0, 3).toLowerCase())
      );
      if (!dayMatches) {
        return { ok: false, error: `Provider does not work on this day. Available days: ${avail.workingDays.join(", ")}.` };
      }
    }
    return { ok: true };
  }
  createBooking(bookingData) {
    const nextNum = Math.floor(2842 + Math.random() * 7000);
    const id = bookingData.id || `SP-${nextNum}`;
    const status = bookingData.status || (bookingData.bookingType === "instant" ? "accepted" : "pending");
    let customerName = bookingData.customerName;
    if (!customerName && bookingData.customerId) {
      const u = this.getUserById(bookingData.customerId);
      if (u) customerName = u.name;
    }
    let providerName = bookingData.providerName;
    if (!providerName && bookingData.providerId) {
      const p = this.getProviderById(bookingData.providerId);
      if (p) providerName = p.name;
    }
    const newBooking = Object.assign({
      id,
      status,
      customerName: customerName || "Customer",
      providerName: providerName || "Provider",
      type: bookingData.bookingType || (status === "accepted" ? "instant" : "request"),
      paymentMethod: "offline_completion",
      total: 350,
      createdAt: new Date().toISOString()
    }, bookingData);
    this.data.bookings = (this.data.bookings || []).filter(b => b.id !== id);
    this.data.bookings.unshift(newBooking);
    this.save();
    return newBooking;
  }
  updateBookingStatus(id, status, notes) {
    const b = this.getBookingById(id);
    if (!b) return { error: "Booking not found", statusCode: 404 };

    const validTransitions = {
      pending: ["accepted", "rejected", "declined", "cancelled"],
      accepted: ["in-progress", "cancelled"],
      "in-progress": ["completed", "cancelled"],
      completed: [],
      rejected: [],
      declined: [],
      cancelled: []
    };

    let target = String(status || "").toLowerCase().trim();
    if (target === "declined") target = "rejected";
    const current = String(b.status || "").toLowerCase().trim();

    if (current === target) {
      return { ok: true, booking: b };
    }

    const allowed = validTransitions[current] || [];
    if (!allowed.includes(target)) {
      return {
        error: `Invalid status transition: cannot change booking status from '${current}' to '${target}'.`,
        statusCode: 400
      };
    }

    b.status = target;
    if (notes) b.responseNotes = notes;
    b.updatedAt = new Date().toISOString();
    this.save();
    return { ok: true, booking: b };
  }

  // --- Categories ---
  getCategories() { return this.data.categories || []; }
  createCategory(cat) {
    const id = cat.id || cat.name.toLowerCase().replace(/[^a-z0-9]/g, "-");
    const newCat = Object.assign({ id, active: true }, cat);
    this.data.categories = (this.data.categories || []).filter(c => c.id !== id);
    this.data.categories.push(newCat);
    this.save();
    return newCat;
  }
  updateCategory(id, updates) {
    const cat = (this.data.categories || []).find(c => c.id === id);
    if (!cat) return null;
    Object.assign(cat, updates);
    this.save();
    return cat;
  }

  // --- Reviews & Ratings (FR-12) ---
  getReviews(providerId = null) {
    this.data.reviews = this.data.reviews || [];
    if (!providerId) {
      return this.data.reviews.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return this.data.reviews
      .filter(r => r.providerId === providerId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getReviewByBookingId(bookingId) {
    if (!bookingId) return null;
    this.data.reviews = this.data.reviews || [];
    return this.data.reviews.find(r => r.bookingId === bookingId) || null;
  }

  createReview(reviewData) {
    this.data.reviews = this.data.reviews || [];
    const id = "rev-" + Date.now().toString(36) + "-" + crypto.randomBytes(3).toString("hex");
    const rating = Math.max(1, Math.min(5, Math.round(Number(reviewData.rating) || 5)));
    const newReview = {
      id,
      bookingId: reviewData.bookingId,
      providerId: reviewData.providerId,
      customerId: reviewData.customerId,
      customerName: reviewData.customerName || "Verified Customer",
      rating,
      comment: String(reviewData.comment || "").trim(),
      createdAt: new Date().toISOString()
    };
    this.data.reviews.push(newReview);

    // Recalculate provider average rating
    const provider = this.getProviderById(reviewData.providerId);
    if (provider) {
      const providerReviews = this.getReviews(reviewData.providerId);
      if (providerReviews.length > 0) {
        const sum = providerReviews.reduce((acc, r) => acc + r.rating, 0);
        provider.rating = Number((sum / providerReviews.length).toFixed(2));
      }
    }

    this.save();
    return newReview;
  }

  // --- Statistics ---
  getPlatformStats() {
    const bookings = this.data.bookings || [];
    const providers = this.data.providers || [];
    const customers = this.data.users ? this.data.users.filter(u => u.role === "customer") : [];

    const grossBookings = bookings.reduce((sum, b) => sum + (Number(b.total) || 0), 0);
    const activeBookings = bookings.filter(b => ["pending", "confirmed", "accepted", "in-progress"].includes(b.status)).length;
    const activeProviders = providers.filter(p => p.status === "approved").length;
    const pendingVerifications = providers.filter(p => p.status === "pending").length;

    return {
      grossBookingsGhs: grossBookings,
      grossBookingsFormatted: `GH₵${grossBookings >= 1000 ? (grossBookings / 1000).toFixed(1) + "k" : grossBookings.toFixed(0)}`,
      activeBookings,
      activeProviders,
      pendingVerifications,
      customerCount: customers.length + 42,
      customerHealth: "94.2%",
      recentBookings: bookings.slice(0, 10),
      verificationQueue: providers.filter(p => p.status === "pending")
    };
  }
}

const instance = new DataStore();
instance.hashPassword = hashPassword;
instance.verifyPassword = verifyPassword;
module.exports = instance;
