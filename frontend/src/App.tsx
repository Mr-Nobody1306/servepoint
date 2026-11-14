import { useEffect, useMemo, useState } from "react";
import { api, type Booking, type Category, type PlatformStats, type Provider, type Review, type User } from "./api";

type View = "home" | "explore" | "provider" | "booking" | "customer" | "pro" | "admin";
type IconName =
  | "arrow"
  | "calendar"
  | "check"
  | "chevron"
  | "clock"
  | "close"
  | "grid"
  | "heart"
  | "home"
  | "menu"
  | "message"
  | "more"
  | "plus"
  | "search"
  | "settings"
  | "star"
  | "trend"
  | "users"
  | "wallet";

const photos = {
  home: "/images/home.jpg",
  room: "/images/room.jpg",
  drill: "/images/drill.jpg",
  maker: "/images/maker.jpg",
  tools: "/images/tools.jpg",
};

const initialProviders: Provider[] = [
  {
    id: "akosua",
    name: "Akosua Mensah",
    trade: "Cleaning & home care",
    category: "Cleaning & Home Care",
    rating: "4.96",
    jobs: 184,
    price: 32,
    color: "#d3a278",
    initials: "AM",
    area: "East Legon, Accra",
    phone: "+233 24 111 0001",
    status: "approved",
    image: "/images/akosua.jpg",
    bio: "Specialist in detailed domestic cleaning, post-renovation cleaning, and organic home sanitisation.",
    services: [
      { name: "Standard home deep clean", price: 320, billing: "Per hour", description: "Complete sanitation of kitchen, bathrooms, and rooms" },
      { name: "Window & upholstery cleaning", price: 400, billing: "Fixed price", description: "Thorough glass clarity and fabric extraction" }
    ],
    documents: { idVerified: true, insurance: true, references: 2 }
  },
  {
    id: "kwame",
    name: "Kwame Ofori",
    trade: "Carpentry & home installation",
    category: "Carpentry & Woodwork",
    rating: "4.91",
    jobs: 326,
    price: 45,
    color: "#7e9270",
    initials: "KO",
    area: "Adenta, Accra",
    phone: "+233 24 555 0184",
    status: "approved",
    image: "/images/kwame.jpg",
    bio: "Master carpenter with over 10 years of experience in furniture craft, roofing, and wall installations.",
    services: [
      { name: "Shelf installation & wall repair", price: 450, billing: "Per hour", description: "Mounting shelves and plaster finishing" },
      { name: "Furniture assembly", price: 550, billing: "Fixed price", description: "Careful assembly for all furniture types" },
      { name: "Custom shelving", price: 1800, billing: "Fixed price", description: "Measured, built and fitted for your space" }
    ],
    documents: { idVerified: true, insurance: true, references: 2 }
  },
  {
    id: "kwaku",
    name: "Mr.Thopmson Electrical",
    trade: "Electrical & generator services",
    category: "Electrical Services",
    rating: "4.88",
    jobs: 119,
    price: 38,
    color: "#b5aa7b",
    initials: "KE",
    area: "Madina, Accra",
    phone: "+233 24 222 0002",
    status: "approved",
    image: "/images/kwaku.jpg",
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
    trade: "Plumbing & water systems",
    category: "Plumbing",
    rating: "4.93",
    jobs: 204,
    price: 35,
    color: "#829d9a",
    initials: "YP",
    area: "Spintex, Accra",
    phone: "+233 24 333 0003",
    status: "approved",
    image: "/images/yaw.jpg",
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
    trade: "Painting & wall finishing",
    category: "Painting & Wall Finishing",
    rating: "4.90",
    jobs: 148,
    price: 40,
    color: "#c48d6e",
    initials: "AP",
    area: "Osu, Accra",
    phone: "+233 24 444 0004",
    status: "approved",
    image: "/images/adom.jpg",
    bio: "Interior aesthetics, exterior waterproof emulsion, wall screeding, and decorative accent walls.",
    services: [
      { name: "Interior 2-room painting", price: 800, billing: "Fixed price", description: "Preparation, 2 coats washable paint" }
    ],
    documents: { idVerified: true, insurance: true, references: 2 }
  },
  {
    id: "kojo",
    name: "Kojo Build & Tile",
    trade: "Tiling, plastering & masonry",
    category: "Masonry & Construction",
    rating: "4.87",
    jobs: 172,
    price: 50,
    color: "#a69b8b",
    initials: "KB",
    area: "Tema, Accra",
    phone: "+233 24 666 0006",
    status: "approved",
    image: "/images/kojo.jpg",
    bio: "Precision floor and wall tiling, terrazzo restoration, blockwork, and concrete finishing.",
    services: [
      { name: "Floor tiling per sq meter", price: 65, billing: "Per hour", description: "Subfloor preparation and grouting" }
    ],
    documents: { idVerified: true, insurance: true, references: 2 }
  },
  {
    id: "nhyira",
    name: "Nhyira Cleaning Co.",
    trade: "Deep cleaning & sanitation",
    category: "Cleaning & Home Care",
    rating: "4.80",
    jobs: 42,
    price: 30,
    color: "#9cae95",
    initials: "NC",
    area: "Madina, Accra",
    phone: "+233 24 777 0007",
    status: "pending",
    image: "/images/akosua.jpg",
    bio: "Professional commercial and home cleaning crew.",
    services: [
      { name: "Apartment deep scrub", price: 300, billing: "Fixed price", description: "Kitchen, washrooms and floors" }
    ],
    documents: { idVerified: true, insurance: true, references: 2 }
  },
  {
    id: "volta",
    name: "Volta Electrical",
    trade: "Electrical & solar installations",
    category: "Electrical Services",
    rating: "4.75",
    jobs: 31,
    price: 36,
    color: "#d8c59f",
    initials: "VE",
    area: "Tema, Accra",
    phone: "+233 24 888 0008",
    status: "pending",
    image: "/images/kwaku.jpg",
    bio: "Licensed domestic electrics and solar panel inverter installation.",
    services: [
      { name: "Inverter & battery setup", price: 650, billing: "Fixed price", description: "Wiring and testing backup inverters" }
    ],
    documents: { idVerified: true, insurance: true, references: 2 }
  }
];

const services = [
  { name: "Plumbing", count: "48 trusted professionals", symbol: "⌇" },
  { name: "Electrical", count: "46 trusted professionals", symbol: "ϟ" },
  { name: "Carpentry", count: "37 trusted professionals", symbol: "⌁" },
  { name: "Painting", count: "39 trusted professionals", symbol: "◫" },
  { name: "Masonry", count: "31 trusted professionals", symbol: "▦" },
  { name: "Cleaning", count: "126 trusted professionals", symbol: "✦" },
  { name: "Appliance Repairs", count: "62 trusted professionals", symbol: "◉" },
  { name: "HVAC/Ventilation", count: "43 trusted professionals", symbol: "≈" },
  { name: "Home Installation & Assembly", count: "54 trusted professionals", symbol: "↗" },
  { name: "Home essentials", count: "Shop maintenance supplies", symbol: "＋" },
];

const situations = [
  "Something is broken",
  "I need an installation",
  "I want to improve my home",
  "Regular maintenance",
  "Repair an appliance or gadget",
  "I need home essentials",
];

const essentials = [
  { name: "LED light bulbs", detail: "Energy-saving · 12W", symbol: "◉" },
  { name: "Surge protector", detail: "6-way · Individual switches",  symbol: "ϟ" },
  { name: "Premium shower head", detail: "Chrome · 5 spray modes",  symbol: "⌇" },
  { name: "Door handle set", detail: "Satin finish · Lock included", symbol: "⌁" },
];

const categoryData = [
  ["Plumbing", "48 professionals", "12 active jobs"],
  ["Electrical", "46 professionals", "18 active jobs"],
  ["Carpentry", "37 professionals", "9 active jobs"],
  ["Painting", "39 professionals", "14 active jobs"],
  ["Masonry", "31 professionals", "7 active jobs"],
  ["Cleaning", "126 professionals", "34 active jobs"],
  ["Appliance Repairs", "62 professionals", "11 active jobs"],
  ["HVAC/Ventilation", "43 professionals", "15 active jobs"],
  ["Home Installation & Assembly", "54 professionals", "8 active jobs"],
];

function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const paths: Record<IconName, React.ReactNode> = {
    arrow: (
      <>
        <path d="M5 12h14M14 7l5 5-5 5" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    check: <path d="m5 12 4 4L19 6" />,
    chevron: <path d="m9 18 6-6-6-6" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    close: <path d="m6 6 12 12M18 6 6 18" />,
    grid: (
      <>
        <rect x="4" y="4" width="6" height="6" rx="1" />
        <rect x="14" y="4" width="6" height="6" rx="1" />
        <rect x="4" y="14" width="6" height="6" rx="1" />
        <rect x="14" y="14" width="6" height="6" rx="1" />
      </>
    ),
    heart: (
      <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z" />
    ),
    home: (
      <>
        <path d="m3 11 9-8 9 8" />
        <path d="M5 10v11h14V10M9 21v-7h6v7" />
      </>
    ),
    menu: <path d="M4 7h16M4 12h16M4 17h16" />,
    message: <path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z" />,
    more: (
      <>
        <circle cx="5" cy="12" r="1" fill="currentColor" />
        <circle cx="12" cy="12" r="1" fill="currentColor" />
        <circle cx="19" cy="12" r="1" fill="currentColor" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3A1.7 1.7 0 0 0 10 3V2.8h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z" />
      </>
    ),
    star: <path d="m12 2.7 2.8 5.8 6.4.9-4.6 4.5 1.1 6.4-5.7-3-5.7 3 1.1-6.4-4.6-4.5 6.4-.9Z" />,
    trend: (
      <>
        <path d="m3 17 6-6 4 4 8-9" />
        <path d="M15 6h6v6" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8" />
      </>
    ),
    wallet: (
      <>
        <path d="M4 6h15a2 2 0 0 1 2 2v11H5a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3h13v3" />
        <path d="M16 11h5v4h-5a2 2 0 0 1 0-4Z" />
      </>
    ),
  };
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {paths[name]}
    </svg>
  );
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <div
      className={`site-logo ${light ? "site-logo-light" : ""}`}
      onClick={() => window.dispatchEvent(new CustomEvent("servepoint:home"))}
      role="button"
      tabIndex={0}
      aria-label="ServePoint home"
    >
      <span className="logo-spark">✦</span>
      <span className="logo-text">
        SERVE<span>POINT</span>
      </span>
    </div>
  );
}

function Header({
  go,
  currentUser,
  onOpenAuth,
  onLogout,
}: {
  go: (v: View) => void;
  currentUser: User | null;
  onOpenAuth: () => void;
  onLogout?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const initials = currentUser
    ? currentUser.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : "AM";
  return (
    <header className="site-header">
      <Logo />
      <button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle menu">
        <Icon name={open ? "close" : "menu"} />
      </button>
      <nav className={open ? "nav-open" : ""}>
        <button
          onClick={() => {
            go("explore");
            setOpen(false);
          }}
        >
          Find services
        </button>
        <button
          onClick={() => {
            go("provider");
            setOpen(false);
          }}
        >
          Our professionals
        </button>
        <button
          onClick={() => {
            go("home");
            setTimeout(
              () => document.getElementById("how")?.scrollIntoView({ behavior: "smooth" }),
              100,
            );
          }}
        >
          How it works
        </button>
        <span className="nav-rule" />
        <button onClick={() => go("pro")}>Provider view</button>
        <button onClick={() => go("admin")}>Admin view</button>
        {currentUser ? (
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
              className="account-pill"
              onClick={() => {
                if (currentUser.role === "admin") go("admin");
                else if (currentUser.role === "artisan" || currentUser.role === "provider") go("pro");
                else go("customer");
              }}
            >
              <span>{initials}</span> {currentUser.name.split(" ")[0]}
            </button>
            {onLogout && (
              <button
                type="button"
                onClick={onLogout}
                style={{ border: 0, background: "none", color: "#8a8984", fontSize: "12px", cursor: "pointer", padding: "4px" }}
              >
                Sign out
              </button>
            )}
          </div>
        ) : (
          <button className="account-pill" onClick={onOpenAuth}>
            <span>＋</span> Sign In / Join
          </button>
        )}
      </nav>
    </header>
  );
}

function Home({
  go,
  providersList,
  onSelectProvider,
}: {
  go: (v: View) => void;
  providersList: Provider[];
  onSelectProvider: (p: Provider) => void;
}) {
  const [query, setQuery] = useState("");
  const kwame = providersList.find((p) => p.id === "kwame") || providersList[1] || providersList[0];

  return (
    <>
      <main className="home-page">
        {/* HERO SECTION */}
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">
              <span />
              <span>SERVEPOINT · GREATER ACCRA</span>
            </div>
            <h1>
              Good help
              <br />
              for the home
              <br />
              <em>you love.</em>
            </h1>
            <p>
              Verified Ghanaian tradespeople, fixed pricing and guaranteed workmanship for every
              room under your roof.
            </p>
            <div className="hero-search">
              <label>
                <span>SERVICE OR REPAIR</span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="e.g. Shelf installation, leaking tap"
                  onKeyDown={(e) => e.key === "Enter" && go("explore")}
                />
              </label>
              <button onClick={() => go("explore")}>
                Find a pro <Icon name="arrow" />
              </button>
            </div>
            <div className="popular">
              <span>Popular:</span>
              <button onClick={() => go("explore")}>AC maintenance</button>
              <button onClick={() => go("explore")}>Deep cleaning</button>
              <button onClick={() => go("explore")}>Plumbing</button>
              <button onClick={() => go("explore")}>Cabinet repair</button>
            </div>
          </div>
          <div className="hero-art">
            <div className="hero-image">
              <img src={photos.home} alt="A beautifully maintained Accra residence" />
            </div>
            <div className="image-caption">
              <span>✦</span>
              <p>Handpicked professionals across Greater Accra</p>
            </div>
            <div className="trust-note">
              <div className="avatar-stack">
                <span>AM</span>
                <span>KO</span>
                <span>YP</span>
              </div>
              <div>
                <b>4.94 average rating</b>
                <small>from 4,820 bookings in Accra</small>
              </div>
            </div>
            <div className="hero-index">01 — RESIDENTIAL CARE</div>
          </div>
        </section>

        {/* SERVICES SECTION */}
        <section className="service-section">
          <div className="section-heading">
            <div>
              <span className="kicker">WHAT WE DO</span>
              <h2>Every trade, vetted and ready.</h2>
            </div>
            <button className="text-link" onClick={() => go("explore")}>
              View all services <Icon name="arrow" />
            </button>
          </div>
          <div className="service-grid">
            {services.map((item, index) => (
              <button
                className="service-row"
                onClick={() => go("explore")}
                key={item.name}
              >
                <span className="service-num">{String(index + 1).padStart(2, "0")}</span>
                <span className="service-symbol">{item.symbol}</span>
                <div>
                  <b>{item.name}</b>
                  <small>{item.count}</small>
                </div>
                <i>
                  <Icon name="arrow" size={14} />
                </i>
              </button>
            ))}
          </div>
        </section>

        {/* STORY / PROMISE SECTION */}
        <section className="story-section">
          <div className="story-image">
            <img src={photos.room} alt="Living room" />
            <span>THE SERVEPOINT STANDARD</span>
          </div>
          <div className="story-copy">
            <span className="kicker">OUR PROMISE</span>
            <h2>
              Better service,
              <br />
              <em>no guesswork.</em>
            </h2>
            <p>
              We built ServePoint because getting reliable help shouldn’t feel like a roll of the
              dice. Every professional on our platform has been interviewed in person, background-checked,
              and tested on their craft.
            </p>
            <div className="steps">
              <div>
                <b>01</b>
                <div>
                  <strong>Verified identity & references</strong>
                  <small>Police-checked, identity verified, trade credentials inspected.</small>
                </div>
              </div>
              <div>
                <b>02</b>
                <div>
                  <strong>Fixed, upfront pricing</strong>
                  <small>No unexpected charges. Clear hourly rates or fixed quotes before work begins.</small>
                </div>
              </div>
              <div>
                <b>03</b>
                <div>
                  <strong>Guaranteed workmanship</strong>
                  <small>If something isn’t right, we come back and fix it. That’s the ServePoint guarantee.</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FEATURED PRO SECTION */}
        <section className="pro-feature">
          <div className="pro-intro">
            <span className="kicker">FEATURED PROFESSIONAL</span>
            <h2>
              Meet Kwame
              <br />
              <em>Ofori.</em>
            </h2>
            <p>
              Master carpenter with over 12 years of residential craft. Known for meticulous shelving,
              bespoke furniture, and spotless work areas.
            </p>
            <button
              className="outline-button"
              onClick={() => {
                onSelectProvider(kwame);
                go("provider");
              }}
            >
              View Kwame’s profile <Icon name="arrow" />
            </button>
          </div>
          <div className="pro-image-wrap">
            <div className="vertical-label">FEATURED · CARPENTRY</div>
            <img src={photos.maker} alt="Kwame Ofori, master carpenter" />
          </div>
          <div className="pro-quote">
            <div className="rating">
              <Icon name="star" size={14} /> 4.98 · 326 reviews
            </div>
            <blockquote>
              “The best repairs feel like they were always part of the home.”
            </blockquote>
            <h3>Kwame Ofori</h3>
            <p>Carpentry & home installation · Adenta</p>
          </div>
        </section>

        {/* HOME ESSENTIALS CATALOGUE */}
        <section className="essentials-section">
          <div className="essentials-intro">
            <span className="kicker">HOME ESSENTIALS</span>
            <h2>
              The right parts
              <br />
              <em>for the job.</em>
            </h2>
            <p>
              Curated fixtures, fittings, and maintenance hardware delivered directly to your
              doorstep or brought along by your professional.
            </p>
            <button className="outline-button" onClick={() => go("explore")}>
              Shop all essentials <Icon name="arrow" />
            </button>
          </div>
          <div className="product-grid">
            {essentials.map((item) => (
              <button onClick={() => go("explore")} key={item.name}>
                <span>{item.symbol}</span>
                <b>{item.name}</b>
                <small>{item.detail}</small>
                <strong>{item.price}</strong>
              </button>
            ))}
          </div>
        </section>

        {/* TESTIMONIAL */}
        <section className="testimonial">
          <div className="quote-mark">“</div>
          <blockquote>
            ServePoint changed how we look after our house in Airport Residential. Kwame arrived on
            time, mounted four floating shelves perfectly, and cleaned up every speck of dust.
          </blockquote>
          <div>
            <b>Nana & Efua K.</b>
            <span>Airport Residential, Accra</span>
          </div>
        </section>

        {/* CALL TO ACTION */}
        <section className="cta">
          <div>
            <span className="kicker">READY WHEN YOU ARE</span>
            <h2>
              Ready for a home
              <br />
              <em>that works?</em>
            </h2>
          </div>
          <button onClick={() => go("explore")}>
            Book a service today <Icon name="arrow" />
          </button>
        </section>
      </main>
    </>
  );
}

function Explore({
  go,
  providersList,
  categoriesList,
  onSelectProvider,
}: {
  go: (v: View) => void;
  providersList: Provider[];
  categoriesList?: Category[];
  onSelectProvider: (p: Provider) => void;
}) {
  const [category, setCategory] = useState("All home services");
  const [need, setNeed] = useState("Something is broken");
  const [saved, setSaved] = useState<string[]>([]);
  const [query, setQuery] = useState("");

  const approvedOnly = useMemo(
    () => providersList.filter((p) => p.status === "approved"),
    [providersList],
  );

  const categoriesToDisplay = useMemo(() => {
    if (categoriesList && categoriesList.length > 0) {
      return ["All home services", ...categoriesList.filter((c) => c.active !== false).map((c) => c.name)];
    }
    return [
      "All home services",
      "Plumbing",
      "Electrical",
      "Carpentry",
      "Painting",
      "Masonry",
      "Cleaning",
      "Appliance Repairs",
      "HVAC/Ventilation",
      "Home Installation & Assembly",
    ];
  }, [categoriesList]);

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return approvedOnly.filter((p) => {
      let matchesCategory = false;
      if (category === "All home services") {
        matchesCategory = true;
      } else {
        const catLow = category.toLowerCase();
        const pCat = (p.category || "").toLowerCase();
        const pTrade = (p.trade || "").toLowerCase();
        matchesCategory =
          pCat === catLow ||
          pTrade === catLow ||
          pCat.includes(catLow) ||
          pTrade.includes(catLow) ||
          (category === "Carpentry" && (pCat.includes("carpentry") || pTrade.includes("carpentry") || pTrade.includes("woodwork"))) ||
          (category === "Electrical" && (pCat.includes("electrical") || pTrade.includes("electrical") || pTrade.includes("generator"))) ||
          (category === "Cleaning" && (pCat.includes("cleaning") || pTrade.includes("cleaning") || pTrade.includes("sanitation"))) ||
          (category === "Painting" && (pCat.includes("paint") || pTrade.includes("paint"))) ||
          (category === "Masonry" && (pCat.includes("masonry") || pTrade.includes("masonry") || pTrade.includes("tiling") || pCat.includes("tile"))) ||
          (category === "Appliance Repairs" && (pCat.includes("appliance") || pTrade.includes("appliance") || pTrade.includes("gadget"))) ||
          (category === "HVAC/Ventilation" && (pCat.includes("hvac") || pCat.includes("air") || pCat.includes("ventilation") || pTrade.includes("ac")));
      }

      if (!matchesCategory) return false;
      if (!q) return true;

      // Functional keyword search across provider profile and service listings
      const servicesText = (p.services || []).map((s) => `${s.name} ${s.description || ""} ${s.category || ""}`).join(" ");
      const combined = `${p.name} ${p.trade} ${p.category} ${p.area || ""} ${p.bio || ""} ${servicesText}`.toLowerCase();
      return combined.includes(q);
    });
  }, [approvedOnly, query, category]);

  return (
    <>
      <main className="explore-page">
        <div className="explore-title">
          <span className="kicker">SERVEPOINT DIRECTORY</span>
          <h1>
            Find the right person
            <br />
            <em>for the job.</em>
          </h1>
          <p>Trusted home-maintenance professionals, reviewed and ready when you are.</p>
        </div>
        <div className="directory-search">
          <Icon name="search" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search services, areas, or professionals"
          />
          <button>
            Accra <Icon name="chevron" size={15} />
          </button>
        </div>
        <div className="need-label">WHAT BRINGS YOU HERE TODAY?</div>
        <div className="category-strip situation-strip">
          {situations.map((item) => (
            <button
              className={need === item ? "active" : ""}
              onClick={() => setNeed(item)}
              key={item}
            >
              {item}
            </button>
          ))}
        </div>
        <div className="approved-categories">
          {categoriesToDisplay.map((item, index) => (
            <button
              className={category === item ? "active" : ""}
              onClick={() => setCategory(item)}
              key={item}
            >
              <span>{index ? String(index).padStart(2, "0") : "ALL"}</span>
              {item}
            </button>
          ))}
        </div>
        <div className="results-head">
          <p>
            <b>{list.length || 0} handpicked professionals</b>
            <span> in Accra</span>
          </p>
          <button>
            Sort: Recommended <Icon name="chevron" size={14} />
          </button>
        </div>
        <div className="provider-list">
          {list.map((p, i) => (
            <article className="provider-card" key={p.name}>
              <div className={`provider-photo provider-photo-${i % 6}`}>
                <img src={p.image || photos.maker} alt={`${p.name}, ${p.trade}`} />
                <button
                  className={saved.includes(p.name) ? "saved" : ""}
                  onClick={() =>
                    setSaved((x) =>
                      x.includes(p.name) ? x.filter((n) => n !== p.name) : [...x, p.name],
                    )
                  }
                  aria-label="Save provider"
                >
                  <Icon name="heart" />
                </button>
              </div>
              <div className="provider-info">
                <span className="verified">
                  <Icon name="check" size={12} /> SERVEPOINT VERIFIED
                </span>
                <h2>{p.name}</h2>
                <p>{p.trade}</p>
                <div className="provider-meta">
                  <span>
                    <Icon name="star" size={14} /> <b>{p.rating}</b> ({p.jobs} reviews)
                  </span>
                  <span>
                    From <b>GH₵{p.price * 10}/hr</b>
                  </span>
                </div>
                <div className="tag-row">
                  <span>
                    {p.availability?.acceptingBookings === false
                      ? "Bookings paused"
                      : p.availability?.workingDays && p.availability.workingDays.length > 0
                        ? `Available ${p.availability.workingDays[0]}`
                        : "Available tomorrow"}
                  </span>
                  <span>Background checked</span>
                  <span>{p.area || "Accra"}</span>
                </div>
              </div>
              <button
                className="view-profile"
                onClick={() => {
                  onSelectProvider(p);
                  go("provider");
                }}
              >
                View profile <Icon name="arrow" />
              </button>
            </article>
          ))}
          {!list.length && (
            <div className="directory-empty">
              <Icon name="search" size={25} />
              <h2>No exact matches yet.</h2>
              <p>Try another approved home-service category or a broader search.</p>
              <button
                onClick={() => {
                  setCategory("All home services");
                  setQuery("");
                }}
              >
                Clear filters
              </button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function ProviderProfile({
  go,
  provider,
  onStartBooking,
}: {
  go: (v: View) => void;
  provider: Provider;
  onStartBooking: (p: Provider, serviceName?: string) => void;
}) {
  const [tab, setTab] = useState("Services");
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewsMetrics, setReviewsMetrics] = useState<{ averageRating: number; totalReviews: number }>({
    averageRating: typeof provider.rating === "number" ? provider.rating : parseFloat(String(provider.rating)) || 5.0,
    totalReviews: provider.jobs || 0,
  });

  useEffect(() => {
    let mounted = true;
    setLoadingReviews(true);
    api.getReviews(provider.id)
      .then((res) => {
        if (!mounted) return;
        setReviews(res.reviews || []);
        if (res.totalReviews > 0) {
          setReviewsMetrics({
            averageRating: res.averageRating || Number(provider.rating) || 5.0,
            totalReviews: res.totalReviews || res.reviews?.length || 0,
          });
        }
      })
      .catch((err) => console.error("Failed to load reviews:", err))
      .finally(() => {
        if (mounted) setLoadingReviews(false);
      });
    return () => {
      mounted = false;
    };
  }, [provider.id, provider.rating]);

  const servicesList = provider.services?.length
    ? provider.services
    : [
        {
          name: "Standard consultation & inspection",
          description: "On-site assessment, diagnostic measurement and estimate",
          price: provider.price * 10,
          billing: "Per hour",
        },
        {
          name: "Repair & maintenance work",
          description: "Hands-on maintenance using professional trade tools",
          price: provider.price * 15,
          billing: "Fixed price",
        },
      ];

  return (
    <>
      <main className="profile-page">
        <button className="back-link" onClick={() => go("explore")}>
          ← Back to professionals
        </button>
        <section className="profile-hero">
          <div className="profile-image">
            <img src={provider.image || photos.maker} alt={provider.name} />
            <span>VERIFIED PROFESSIONAL</span>
          </div>
          <div className="profile-copy">
            <span className="verified">
              <Icon name="check" size={12} /> SERVEPOINT VERIFIED
            </span>
            <h1>
              {provider.name.split(" ")[0]}
              <br />
              <em>{provider.name.split(" ").slice(1).join(" ") || "Pro"}.</em>
            </h1>
            <p className="role">{provider.trade} · {provider.area || "Greater Accra"}</p>
            <div className="profile-stats">
              <div>
                <b>{reviewsMetrics.averageRating.toFixed(2)}</b>
                <span>average rating</span>
              </div>
              <div>
                <b>{provider.jobs || reviewsMetrics.totalReviews}</b>
                <span>jobs completed</span>
              </div>
              <div>
                <b>100%</b>
                <span>reliability</span>
              </div>
            </div>
            <p className="bio">
              {provider.bio ||
                "Thoughtful, tidy home repairs and maintenance. I believe the best work feels like it has always belonged in your home."}
            </p>
            <button
              className="primary-button"
              onClick={() => {
                onStartBooking(provider);
                go("booking");
              }}
            >
              Check availability <Icon name="arrow" />
            </button>
          </div>
        </section>
        <div className="profile-tabs">
          {["Services", "About", "Reviews"].map((t) => (
            <button className={tab === t ? "active" : ""} onClick={() => setTab(t)} key={t}>
              {t}
            </button>
          ))}
        </div>
        <section className="profile-content">
          <div>
            <span className="kicker">{tab.toUpperCase()}</span>
            <h2>
              {tab === "Services"
                ? "How I can help."
                : tab === "About"
                  ? `A little more about ${provider.name.split(" ")[0]}.`
                  : "What neighbours say."}
            </h2>
            {tab === "Services" ? (
              <div className="service-menu">
                {servicesList.map((s) => (
                  <button
                    onClick={() => {
                      onStartBooking(provider, s.name);
                      go("booking");
                    }}
                    key={s.name}
                  >
                    <span>
                      <b>{s.name}</b>
                      <small>{s.description}</small>
                    </span>
                    <strong>GH₵{s.price} {s.billing === "Per hour" ? "/ hour" : ""}</strong>
                    <Icon name="chevron" />
                  </button>
                ))}
              </div>
            ) : tab === "About" ? (
              <p className="tab-copy">
                {provider.bio ||
                  `With extensive experience in ${provider.trade}, I prioritize safety, punctuality, and clean workmanship. I bring my own tools, protect your floors, and always guarantee work completed.`}
              </p>
            ) : (
              <div className="reviews-section">
                <div className="reviews-header-summary">
                  <div className="rating-big-box">
                    <span className="rating-score">{(reviewsMetrics.averageRating || 5.0).toFixed(1)}</span>
                    <div>
                      <div className="rating-stars-row">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <span
                            key={star}
                            className={star <= Math.round(reviewsMetrics.averageRating) ? "star-filled" : "star-empty"}
                          >
                            ★
                          </span>
                        ))}
                      </div>
                      <span className="rating-sub">
                        {reviewsMetrics.totalReviews} verified {reviewsMetrics.totalReviews === 1 ? "review" : "reviews"}
                      </span>
                    </div>
                  </div>
                </div>

                {loadingReviews ? (
                  <p className="tab-copy">Loading verified reviews...</p>
                ) : reviews.length === 0 ? (
                  <div className="reviews-empty">
                    <p className="tab-copy">No verified customer reviews yet for this professional.</p>
                    <small>Completed service bookings will appear here after customer review.</small>
                  </div>
                ) : (
                  <div className="reviews-list">
                    {reviews.map((r) => (
                      <div key={r.id} className="review-card">
                        <div className="review-card-top">
                          <div>
                            <strong className="review-author">{r.customerName}</strong>
                            <span className="review-verified-badge">✓ Verified Booking</span>
                          </div>
                          <span className="review-date">
                            {r.createdAt
                              ? new Date(r.createdAt).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                  year: "numeric",
                                })
                              : ""}
                          </span>
                        </div>
                        <div className="review-stars-row">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <span key={star} className={star <= r.rating ? "star-filled" : "star-empty"}>
                              ★
                            </span>
                          ))}
                        </div>
                        <p className="review-comment">{r.comment}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          <aside className="availability-card">
            <span>{provider.availability?.acceptingBookings === false ? "BOOKING STATUS" : "CURRENT AVAILABILITY"}</span>
            <b>
              {provider.availability?.acceptingBookings === false
                ? "Bookings Paused"
                : provider.availability?.workingDays && provider.availability.workingDays.length > 0
                  ? `${provider.availability.workingDays.slice(0, 3).join(", ")}`
                  : "Monday – Friday"}
            </b>
            <p>
              {provider.availability?.acceptingBookings === false
                ? "This professional is currently not accepting new service requests."
                : `Working hours: ${provider.availability?.workingHours || "08:00 - 17:00"}`}
            </p>
            <button
              disabled={provider.availability?.acceptingBookings === false}
              onClick={() => {
                if (provider.availability?.acceptingBookings === false) return;
                onStartBooking(provider);
                go("booking");
              }}
            >
              {provider.availability?.acceptingBookings === false ? "Unavailable" : `Book ${provider.name.split(" ")[0]}`} <Icon name="arrow" />
            </button>
          </aside>
        </section>
      </main>
    </>
  );
}

function Booking({
  go,
  provider,
  selectedServiceName,
  currentUser,
  onBookingCreated,
}: {
  go: (v: View) => void;
  provider: Provider;
  selectedServiceName?: string;
  currentUser: User | null;
  onBookingCreated: (booking: Booking) => void;
}) {
  const [step, setStep] = useState(1);
  const [isInstant, setIsInstant] = useState(true);
  const [selectedDay, setSelectedDay] = useState("Tuesday, 18 June");
  const [selectedTime, setSelectedTime] = useState("10:30");
  const [fullName, setFullName] = useState(currentUser?.name || "Ama Boateng");
  const [phone, setPhone] = useState(currentUser?.phone || "+233 24 555 0184");
  const [address, setAddress] = useState(currentUser?.address || "24 Kofi Annan Street, Adenta, Accra");
  const [notes, setNotes] = useState("Mount two oak shelves in the living room. Plaster over brick wall.");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);

  const serviceName = selectedServiceName || provider.services?.[0]?.name || "Shelf installation & wall repair";
  const serviceRate = provider.services?.[0]?.price || provider.price * 10 || 900;

  const handleConfirm = async () => {
    setSubmitting(true);
    setErrorMessage("");
    try {
      const res = await api.createBooking({
        customerId: currentUser?.id || "ama",
        customerName: fullName,
        customerPhone: phone,
        customerEmail: currentUser?.email || "customer@servepoint.gh",
        serviceId: provider.category ? provider.category.toLowerCase().replace(/[^a-z0-9]/g, "-") : "general",
        serviceName,
        providerId: provider.id,
        providerName: provider.name,
        address,
        date: selectedDay,
        time: selectedTime,
        description: notes,
        total: serviceRate,
        bookingType: isInstant ? "instant" : "request",
      });
      setCreatedBooking(res.booking);
      onBookingCreated(res.booking);
    } catch (err: any) {
      console.error("Booking failed:", err);
      setErrorMessage(err.message || "Failed to create booking. Please choose a different slot or try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (createdBooking) {
    const isPending = createdBooking.status === "pending";
    return (
      <main className="success-page">
        <Logo />
        <div className="success-mark">
          <Icon name="check" size={36} />
        </div>
        <span className="kicker">{isPending ? "REQUEST SUBMITTED" : "BOOKING CONFIRMED"}</span>
        <h1>
          {isPending ? (
            <>
              Request sent to
              <br />
              <em>{provider.name.split(" ")[0]}.</em>
            </>
          ) : (
            <>
              That’s one less thing
              <br />
              <em>to think about.</em>
            </>
          )}
        </h1>
        <p>
          {isPending
            ? `${provider.name.split(" ")[0]} has received your booking request for ${selectedDay} at ${selectedTime} and will respond shortly.`
            : `${provider.name.split(" ")[0]} will be with you on ${selectedDay} at ${selectedTime}. Payment is due upon completion (Cash or Direct).`}
        </p>
        <div className="confirmation-ticket">
          <span>{createdBooking.id}</span>
          <div>
            <b>{serviceName}</b>
            <small>{provider.name} · {provider.trade} · <i className={`status ${createdBooking.status}`}>{createdBooking.status.toUpperCase()}</i></small>
          </div>
          <strong>GH₵{createdBooking.total || serviceRate}</strong>
        </div>
        <button className="primary-button" onClick={() => go("customer")}>
          View my bookings <Icon name="arrow" />
        </button>
      </main>
    );
  }

  return (
    <main className="booking-page">
      <div className="booking-top">
        <Logo />
        <button onClick={() => go("provider")}>
          <Icon name="close" /> Exit booking
        </button>
      </div>
      <div className="booking-layout">
        <section>
          <div className="stepper">
            {[1, 2, 3].map((n) => (
              <span className={step >= n ? "active" : ""} key={n}>
                {n < step ? <Icon name="check" size={13} /> : n}
              </span>
            ))}
            <i />
            <small>{step === 1 ? "DATE & TIME" : step === 2 ? "YOUR DETAILS" : "REVIEW"}</small>
          </div>
          {step === 1 && (
            <>
              <span className="kicker">STEP ONE OF THREE</span>
              <h1>
                When works
                <br />
                <em>for you?</em>
              </h1>
              <p className="lead">Choose booking preference, available day, and start time.</p>

              <div className="category-strip" style={{ marginBottom: "20px" }}>
                <button
                  type="button"
                  className={isInstant ? "active" : ""}
                  onClick={() => setIsInstant(true)}
                >
                  ⚡ Instant Confirmation
                </button>
                <button
                  type="button"
                  className={!isInstant ? "active" : ""}
                  onClick={() => setIsInstant(false)}
                >
                  📋 Standard Request
                </button>
              </div>

              <div className="date-row">
                {[
                  ["MON", "17", "Monday, 17 June"],
                  ["TUE", "18", "Tuesday, 18 June"],
                  ["WED", "19", "Wednesday, 19 June"],
                  ["THU", "20", "Thursday, 20 June"],
                  ["FRI", "21", "Friday, 21 June"],
                ].map((d) => (
                  <button
                    className={selectedDay === d[2] ? "active" : ""}
                    onClick={() => { setSelectedDay(d[2]); setErrorMessage(""); }}
                    key={d[1]}
                  >
                    <small>{d[0]}</small>
                    <b>{d[1]}</b>
                  </button>
                ))}
              </div>
              <h3>Available times</h3>
              <div className="time-grid">
                {["08:00", "09:00", "10:30", "12:00", "14:30", "16:00"].map((t) => (
                  <button
                    className={selectedTime === t ? "active" : ""}
                    onClick={() => { setSelectedTime(t); setErrorMessage(""); }}
                    key={t}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <span className="kicker">STEP TWO OF THREE</span>
              <h1>
                Where should
                <br />
                <em>{provider.name.split(" ")[0]} meet you?</em>
              </h1>
              <p className="lead">Your details are only shared with {provider.name.split(" ")[0]} after booking.</p>
              <div className="form-grid">
                <label>
                  Full name
                  <input value={fullName} onChange={(e) => setFullName(e.target.value)} />
                </label>
                <label>
                  Phone number
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} />
                </label>
                <label className="full">
                  Service address
                  <input value={address} onChange={(e) => setAddress(e.target.value)} />
                </label>
                <label className="full">
                  What needs doing?
                  <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
                </label>
              </div>
            </>
          )}
          {step === 3 && (
            <>
              <span className="kicker">FINAL STEP</span>
              <h1>
                Everything
                <br />
                <em>look right?</em>
              </h1>
              <div className="review-list">
                <div>
                  <span>Service</span>
                  <b>{serviceName}</b>
                </div>
                <div>
                  <span>Professional</span>
                  <b>{provider.name} ({provider.trade})</b>
                </div>
                <div>
                  <span>Booking type</span>
                  <b>{isInstant ? "⚡ Instant Booking (Auto-confirmed)" : "📋 Standard Request (Provider review)"}</b>
                </div>
                <div>
                  <span>When</span>
                  <b>{selectedDay} · {selectedTime}</b>
                </div>
                <div>
                  <span>Where</span>
                  <b>{address}</b>
                </div>
                <div>
                  <span>Payment terms</span>
                  <b>Pay upon completion (Cash / Direct Payment)</b>
                </div>
                <div>
                  <span>Estimated total</span>
                  <b>GH₵{serviceRate}.00</b>
                </div>
              </div>
              {errorMessage && (
                <div className="auth-error" style={{ margin: "14px 0", padding: "10px", background: "#fdf2ee", border: "1px solid #d99c85", borderRadius: "6px", color: "#c57656" }}>
                  <strong>⚠️ Booking Conflict / Error:</strong> {errorMessage}
                </div>
              )}
              <label className="check-label">
                <input type="checkbox" defaultChecked /> I agree to ServePoint’s booking terms & verified quality guarantee
              </label>
            </>
          )}
          <div className="booking-actions">
            {step > 1 && (
              <button className="back-button" onClick={() => { setStep(step - 1); setErrorMessage(""); }}>
                Back
              </button>
            )}
            <button
              className="primary-button"
              disabled={submitting}
              onClick={() => (step === 3 ? handleConfirm() : setStep(step + 1))}
            >
              {submitting ? "Booking..." : step === 3 ? "Confirm booking" : "Continue"} <Icon name="arrow" />
            </button>
          </div>
        </section>
        <aside>
          <img src={provider.image || photos.maker} alt={provider.name} />
          <div>
            <span className="verified">
              <Icon name="check" size={11} /> VERIFIED PRO
            </span>
            <h2>{provider.name}</h2>
            <p>{serviceName}</p>
            <hr />
            <dl>
              <div>
                <dt>Duration</dt>
                <dd>2 hours</dd>
              </div>
              <div>
                <dt>Rate</dt>
                <dd>GH₵{serviceRate} {provider.services?.[0]?.billing === "Per hour" ? "/ hr" : ""}</dd>
              </div>
              <div>
                <dt>Payment</dt>
                <dd>Offline upon completion</dd>
              </div>
              <div>
                <dt>Service fee</dt>
                <dd>Included</dd>
              </div>
            </dl>
            <strong className="total">
              <span>Estimated total</span>GH₵{serviceRate}
            </strong>
          </div>
        </aside>
      </div>
    </main>
  );
}

const customerNav = [
  "Overview",
  "Upcoming bookings",
  "Booking history",
  "Saved providers",
  "Profile & settings",
];

function ReviewModal({
  booking,
  onClose,
  onSubmitReview,
}: {
  booking: Booking;
  onClose: () => void;
  onSubmitReview: (bookingId: string, rating: number, comment: string) => Promise<void>;
}) {
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!comment.trim()) {
      setError("Please write a short comment about your experience.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await onSubmitReview(booking.id, rating, comment.trim());
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <div>
            <span className="kicker">LEAVE A REVIEW</span>
            <h2>Rate your service</h2>
          </div>
          <button onClick={onClose} aria-label="Close modal">
            <Icon name="close" />
          </button>
        </div>

        <div className="review-sub-info">
          <strong>{booking.serviceName}</strong>
          <span>Professional: {booking.providerName || "Assigned Provider"} · Completed on {booking.date}</span>
        </div>

        {error && <p className="auth-error-banner">{error}</p>}

        <form onSubmit={handleSubmit} className="modal-form">
          <label>
            Rating (1 to 5 stars)
            <div className="star-picker">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  className={`star-picker-btn ${star <= (hoverRating || rating) ? "star-filled" : "star-empty"}`}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                >
                  ★
                </button>
              ))}
            </div>
          </label>

          <label>
            Your feedback & review comments
            <textarea
              rows={4}
              required
              placeholder="Describe the quality of work, punctuality, and your experience with this professional..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </label>

          <div className="modal-actions">
            <button type="button" className="outline-button" onClick={onClose} disabled={submitting}>
              Cancel
            </button>
            <button type="submit" className="primary-button" disabled={submitting}>
              {submitting ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CustomerDashboard({
  go,
  currentUser,
  bookingsList,
  providersList,
  onOpenAuth,
  onLogout,
  onBookingStatusUpdated,
  onReviewSubmitted,
}: {
  go: (v: View) => void;
  currentUser: User | null;
  bookingsList: Booking[];
  providersList: Provider[];
  onOpenAuth?: () => void;
  onLogout?: () => void;
  onBookingStatusUpdated?: (bookingId: string, status: any) => void;
  onReviewSubmitted?: (review: Review, providerRating?: number) => void;
}) {
  const [active, setActive] = useState("Overview");
  const [toast, setToast] = useState("");
  const [reviewedBookings, setReviewedBookings] = useState<Record<string, Review>>({});
  const [activeReviewBooking, setActiveReviewBooking] = useState<Booking | null>(null);

  useEffect(() => {
    let mounted = true;
    api.getReviews()
      .then((res) => {
        if (!mounted) return;
        const map: Record<string, Review> = {};
        (res.reviews || []).forEach((r) => {
          if (r.bookingId) map[r.bookingId] = r;
        });
        setReviewedBookings(map);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  const myBookings = useMemo(
    () =>
      bookingsList.filter(
        (b) => !currentUser || b.customerId === currentUser.id || b.customerName === currentUser.name,
      ),
    [bookingsList, currentUser],
  );

  const upcomingBookings = myBookings.filter((b) => b.status === "pending" || b.status === "confirmed" || b.status === "accepted" || b.status === "in-progress");
  const pastBookings = myBookings.filter((b) => b.status === "completed" || b.status === "declined" || b.status === "rejected" || b.status === "cancelled");
  const latestBooking = upcomingBookings[0] || myBookings[0];

  const handleCancel = async (bookingId: string) => {
    if (!window.confirm("Are you sure you wish to cancel this booking?")) return;
    try {
      await api.cancelBooking(bookingId, "Cancelled by customer");
      if (onBookingStatusUpdated) onBookingStatusUpdated(bookingId, "cancelled");
      setToast("Booking cancelled successfully.");
      setTimeout(() => setToast(""), 2200);
    } catch (err: any) {
      alert(err.message || "Failed to cancel booking");
    }
  };

  const handleReviewSubmit = async (bookingId: string, rating: number, comment: string) => {
    const res = await api.createReview({ bookingId, rating, comment });
    setReviewedBookings((prev) => ({ ...prev, [bookingId]: res.review }));
    setToast("Review submitted successfully! Thank you for your feedback.");
    setTimeout(() => setToast(""), 3000);
    if (onReviewSubmitted) {
      onReviewSubmitted(res.review, res.providerRating);
    }
  };

  return (
    <DashboardShell
      kind="customer"
      title="MY HOME"
      items={customerNav}
      active={active}
      setActive={setActive}
      go={go}
      currentUser={currentUser}
      onOpenAuth={onOpenAuth}
      onLogout={onLogout}
    >
      {toast && (
        <div className="toast">
          <Icon name="check" />
          {toast}
        </div>
      )}
      <div className="dash-welcome">
        <div>
          <span className="kicker">CUSTOMER PORTAL</span>
          <h1>
            {active === "Overview" ? (
              <>
                Good day,
                <br />
                <em>{currentUser?.name.split(" ")[0] || "Ama"}.</em>
              </>
            ) : (
              active
            )}
          </h1>
        </div>
        <button className="primary-button" onClick={() => go("explore")}>
          <Icon name="plus" /> Book a service
        </button>
      </div>

      {active === "Overview" ? (
        <>
          {latestBooking ? (
            <section className="next-booking">
              <div className="date-block">
                <span>{latestBooking.date?.split(",")[0]?.slice(0, 3)?.toUpperCase() || "TUE"}</span>
                <b>{latestBooking.date?.match(/\d+/)?.[0] || "18"}</b>
                <small>JUN</small>
              </div>
              <div>
                <span className={`status ${latestBooking.status}`}>
                  {latestBooking.status.toUpperCase()}
                </span>
                <h2>{latestBooking.serviceName}</h2>
                <p>
                  {latestBooking.time} · {latestBooking.providerName || "Assigned professional"}
                </p>
                <small style={{ color: "#6c6b64", marginTop: "4px", display: "block" }}>
                  📍 {latestBooking.address}
                </small>
              </div>
              <div className="booking-avatars">
                <span>{latestBooking.id}</span>
                <button onClick={() => alert(`Contact: ${latestBooking.customerPhone || "+233 24 555 0184"}\nPayment: Pay upon completion`)}>
                  <Icon name="message" /> Details
                </button>
                {(latestBooking.status === "pending" || latestBooking.status === "confirmed" || latestBooking.status === "accepted") && (
                  <button
                    className="danger"
                    onClick={() => handleCancel(latestBooking.id)}
                    style={{ border: "1px solid #d99c85", background: "transparent", color: "#c57656", padding: "4px 8px", cursor: "pointer", fontSize: "11px", marginLeft: "6px" }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </section>
          ) : (
            <p className="lead">You have no active bookings right now.</p>
          )}

          <div className="customer-grid">
            <section>
              <div className="panel-head">
                <h2>Recent bookings</h2>
                <button onClick={() => setActive("Upcoming bookings")}>View all</button>
              </div>
              <div className="mini-bookings">
                {myBookings.slice(0, 4).map((b) => (
                  <div key={b.id}>
                    <span className="mini-icon">⌁</span>
                    <span>
                      <b>{b.serviceName}</b>
                      <small>
                        {b.providerName} · {b.status.toUpperCase()}
                      </small>
                    </span>
                    <strong>GH₵{b.total}</strong>
                  </div>
                ))}
              </div>
            </section>
            <section className="saved-panel">
              <div className="panel-head">
                <h2>Verified professionals</h2>
                <button onClick={() => go("explore")}>Browse</button>
              </div>
              <div className="saved-people">
                {providersList.slice(0, 3).map((p) => (
                  <div key={p.name} onClick={() => go("explore")}>
                    <span style={{ background: p.color }}>{p.initials}</span>
                    <p>
                      <b>{p.name}</b>
                      <small>{p.trade}</small>
                    </p>
                    <Icon name="chevron" />
                  </div>
                ))}
              </div>
            </section>
          </div>
        </>
      ) : active === "Upcoming bookings" ? (
        <section className="management-panel">
          <div className="panel-head">
            <div>
              <span className="kicker">SCHEDULED SERVICES</span>
              <h2>Upcoming Bookings</h2>
            </div>
            <span className="locked-label">{upcomingBookings.length} Active</span>
          </div>
          {upcomingBookings.map((b) => (
            <div className="management-row" key={b.id}>
              <span style={{ background: "#7e9270", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {b.id.slice(-2)}
              </span>
              <div>
                <b>{b.serviceName} ({b.id})</b>
                <small>
                  {b.date} at {b.time} · {b.providerName || "Assigned Pro"} · 📍 {b.address}
                </small>
              </div>
              <strong>GH₵{b.total}</strong>
              <i className={`status ${b.status}`}>{b.status.toUpperCase()}</i>
              <div style={{ display: "flex", gap: "6px", flexShrink: 0, flexWrap: "wrap", alignItems: "center" }}>
                <button className="outline-button" onClick={() => alert(`Booking ID: ${b.id}\nAddress: ${b.address}\nNotes: ${b.description}\nPayment: Pay upon completion`)}>
                  Details
                </button>
                {(b.status === "pending" || b.status === "confirmed" || b.status === "accepted") && (
                  <button
                    className="danger"
                    onClick={() => handleCancel(b.id)}
                    style={{ border: "1px solid #d99c85", background: "transparent", color: "#c57656", padding: "4px 8px", cursor: "pointer", fontSize: "11px" }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          ))}
          {!upcomingBookings.length && <p className="all-clear">No upcoming bookings. Book a service above!</p>}
        </section>
      ) : active === "Booking history" ? (
        <section className="management-panel">
          <div className="panel-head">
            <div>
              <span className="kicker">COMPLETED & CANCELLED SERVICES</span>
              <h2>Past Bookings</h2>
            </div>
          </div>
          {pastBookings.map((b) => {
            const isCompleted = b.status === "completed";
            const review = reviewedBookings[b.id];
            return (
              <div className="management-row" key={b.id}>
                <span>{b.id.slice(-2)}</span>
                <div>
                  <b>{b.serviceName} ({b.id})</b>
                  <small>{b.date} · {b.providerName}</small>
                </div>
                <strong>GH₵{b.total}</strong>
                <i className={`status ${b.status}`}>{b.status.toUpperCase()}</i>
                <div>
                  {isCompleted && (
                    review ? (
                      <span className="reviewed-badge">
                        ★ {review.rating} Reviewed
                      </span>
                    ) : (
                      <button
                        className="review-action-btn"
                        onClick={() => setActiveReviewBooking(b)}
                      >
                        ★ Leave Review
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
          {!pastBookings.length && <p className="all-clear">No past completed bookings yet.</p>}
        </section>
      ) : active === "Profile & settings" ? (
        <section className="management-panel">
          <div className="panel-head">
            <h2>Your Profile Information</h2>
          </div>
          <div className="form-grid" style={{ padding: "20px 0" }}>
            <label>
              Full name
              <input defaultValue={currentUser?.name || "Ama Boateng"} readOnly />
            </label>
            <label>
              Email address
              <input defaultValue={currentUser?.email || "ama@example.com"} readOnly />
            </label>
            <label>
              Phone number
              <input defaultValue={currentUser?.phone || "+233 24 555 0184"} readOnly />
            </label>
            <label>
              Default address
              <input defaultValue={currentUser?.address || "24 Kofi Annan Street, Adenta, Accra"} readOnly />
            </label>
          </div>
        </section>
      ) : (
        <EmptyState title={active} go={go} />
      )}
      {activeReviewBooking && (
        <ReviewModal
          booking={activeReviewBooking}
          onClose={() => setActiveReviewBooking(null)}
          onSubmitReview={handleReviewSubmit}
        />
      )}
    </DashboardShell>
  );
}

function EmptyState({ title, go }: { title: string; go: (v: View) => void }) {
  return (
    <div className="empty-state">
      <span>
        <Icon
          name={
            title.includes("Saved") ? "heart" : title.includes("Message") ? "message" : "calendar"
          }
          size={28}
        />
      </span>
      <h2>{title}</h2>
      <p>
        {title.includes("history")
          ? "Completed and cancelled bookings will appear here."
          : "This section is ready for your next home action."}
      </p>
      <button className="outline-button" onClick={() => go("explore")}>
        Explore services <Icon name="arrow" />
      </button>
    </div>
  );
}

function DashboardShell({
  kind,
  title,
  items,
  active,
  setActive,
  go,
  currentUser,
  onOpenAuth,
  onLogout,
  children,
}: {
  kind: "customer" | "pro" | "admin";
  title: string;
  items: string[];
  active: string;
  setActive: (s: string) => void;
  go: (v: View) => void;
  currentUser?: User | null;
  onOpenAuth?: () => void;
  onLogout?: () => void;
  children: React.ReactNode;
}) {
  const [mobileNav, setMobileNav] = useState(false);
  const initials = currentUser
    ? currentUser.name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()
    : kind === "pro" ? "KO" : kind === "admin" ? "AD" : "AM";
  const displayName = currentUser?.name || (kind === "pro" ? "Kwame Ofori" : kind === "admin" ? "ServePoint Admin" : "Ama Boateng");

  return (
    <main className={`dashboard-shell ${kind}-shell`}>
      <aside className={mobileNav ? "open" : ""}>
        <Logo light={kind !== "customer"} />
        <div className="workspace-label">{title}</div>
        <nav>
          {items.map((item, i) => (
            <button
              className={active === item ? "active" : ""}
              onClick={() => {
                setActive(item);
                setMobileNav(false);
              }}
              key={item}
            >
              <Icon
                name={
                  ["grid", "calendar", "clock", "home", "wallet", "users", "message", "settings"][
                    i % 8
                  ] as IconName
                }
              />
              {item}
            </button>
          ))}
        </nav>
        <div className="role-switch">
          <small>CURRENT SESSION</small>
          <div style={{ color: kind !== "customer" ? "#d9d2c4" : "#242521", fontSize: "11px", margin: "4px 0", fontWeight: 600 }}>
            {currentUser ? `${currentUser.name} (${(currentUser.role || "customer").toUpperCase()})` : "Guest Browsing"}
          </div>
          {onOpenAuth && (
            <button onClick={onOpenAuth} style={{ fontSize: "11px" }}>Switch account</button>
          )}
          {onLogout && currentUser && (
            <button onClick={onLogout} style={{ fontSize: "11px", color: "#c57656" }}>Sign out</button>
          )}
        </div>
        <button className="dash-profile" onClick={onOpenAuth}>
          <span>{initials}</span>
          <div>
            <b>{displayName}</b>
            <small>{kind === "admin" ? "Platform admin" : (kind === "pro" || (currentUser && currentUser.role === "artisan")) ? "Verified artisan" : "Customer"}</small>
          </div>
          <Icon name="more" />
        </button>
      </aside>
      <div className="dashboard-main">
        <div className="mobile-dashbar">
          <Logo light={kind !== "customer"} />
          <button onClick={() => setMobileNav(!mobileNav)}>
            <Icon name="menu" />
          </button>
        </div>
        {children}
      </div>
    </main>
  );
}

function ProDashboard({
  go,
  currentUser,
  providersList,
  bookingsList,
  categoriesList,
  onBookingStatusUpdated,
  onProviderUpdated,
  onOpenAuth,
  onLogout,
}: {
  go: (v: View) => void;
  currentUser: User | null;
  providersList: Provider[];
  bookingsList: Booking[];
  categoriesList: Category[];
  onBookingStatusUpdated: (bookingId: string, status: any) => void;
  onProviderUpdated: (updated: Provider) => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}) {
  const [active, setActive] = useState("Overview");
  const [modal, setModal] = useState(false);
  const [toast, setToast] = useState("");
  const [editingService, setEditingService] = useState<ProviderService | null>(null);
  const [newServiceName, setNewServiceName] = useState("");
  const [newServiceCategory, setNewServiceCategory] = useState("Carpentry");
  const [newServicePrice, setNewServicePrice] = useState("450");
  const [newServiceBilling, setNewServiceBilling] = useState("Fixed price");
  const [newServiceDesc, setNewServiceDesc] = useState("");

  const currentProvider = useMemo(() => {
    if (currentUser) {
      const match = providersList.find((p) => p.id === currentUser.id);
      if (match) return match;
    }
    return providersList.find((p) => p.id === "kwame") || providersList[0];
  }, [currentUser, providersList]);

  const providerId = currentProvider?.id || "kwame";

  const [acceptingBookings, setAcceptingBookings] = useState<boolean>(
    currentProvider?.availability?.acceptingBookings ?? true
  );
  const [workingDays, setWorkingDays] = useState<string[]>(
    currentProvider?.availability?.workingDays || [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
    ]
  );
  const [workingHours, setWorkingHours] = useState<string>(
    currentProvider?.availability?.workingHours || "08:00 - 17:00"
  );
  const [emergencyAvailable, setEmergencyAvailable] = useState<boolean>(
    currentProvider?.availability?.emergencyAvailable || false
  );
  const [savingAvail, setSavingAvail] = useState(false);
  const [proReviews, setProReviews] = useState<Review[]>([]);

  useEffect(() => {
    if (providerId) {
      api.getReviews(providerId)
        .then((res) => setProReviews(res.reviews || []))
        .catch(() => {});
    }
  }, [providerId, currentProvider?.rating]);

  useEffect(() => {
    if (currentProvider && currentProvider.availability) {
      setAcceptingBookings(currentProvider.availability.acceptingBookings ?? true);
      setWorkingDays(
        currentProvider.availability.workingDays || [
          "Monday",
          "Tuesday",
          "Wednesday",
          "Thursday",
          "Friday",
        ]
      );
      setWorkingHours(currentProvider.availability.workingHours || "08:00 - 17:00");
      setEmergencyAvailable(currentProvider.availability.emergencyAvailable || false);
    }
  }, [currentProvider]);

  const action = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(""), 2500);
  };

  const handleRespond = async (bookingId: string, decision: "accepted" | "declined") => {
    try {
      await api.respondToBooking(bookingId, decision);
      onBookingStatusUpdated(bookingId, decision);
      action(`Request ${decision === "accepted" ? "accepted successfully" : "declined"}`);
    } catch (err: any) {
      console.error(err);
      action(err.message || `Failed to update booking to ${decision}`);
    }
  };

  const handleProgress = async (bookingId: string, actionName: "start" | "complete") => {
    try {
      await api.updateBookingProgress(bookingId, actionName);
      const nextStatus = actionName === "start" ? "in-progress" : "completed";
      onBookingStatusUpdated(bookingId, nextStatus);
      action(actionName === "start" ? "Job started (In Progress)" : "Job marked completed!");
    } catch (err: any) {
      console.error(err);
      action(err.message || "Failed to update job progress");
    }
  };

  const handleOpenAddModal = () => {
    setEditingService(null);
    setNewServiceName("");
    setNewServiceCategory(currentProvider.category || "Carpentry");
    setNewServicePrice("450");
    setNewServiceBilling("Fixed price");
    setNewServiceDesc("");
    setModal(true);
  };

  const handleOpenEditModal = (service: ProviderService) => {
    setEditingService(service);
    setNewServiceName(service.name);
    setNewServiceCategory(service.category || currentProvider.category || "Carpentry");
    setNewServicePrice(String(service.price));
    setNewServiceBilling(service.billing || "Fixed price");
    setNewServiceDesc(service.description || "");
    setModal(true);
  };

  const handleSaveService = async () => {
    if (!newServiceName.trim()) {
      action("Service name is required.");
      return;
    }
    const priceNum = Number(newServicePrice);
    if (isNaN(priceNum) || priceNum < 0) {
      action("Please enter a valid price.");
      return;
    }
    try {
      if (editingService && (editingService.id || editingService.name)) {
        const srvId = editingService.id || editingService.name;
        const res = await api.updateProviderService(providerId, srvId, {
          name: newServiceName.trim(),
          category: newServiceCategory,
          price: priceNum,
          billing: newServiceBilling,
          description: newServiceDesc.trim(),
        });
        onProviderUpdated(res.provider);
        action("Service listing updated");
      } else {
        const res = await api.addProviderService(providerId, {
          name: newServiceName.trim(),
          category: newServiceCategory,
          price: priceNum,
          billing: newServiceBilling,
          description: newServiceDesc.trim(),
        });
        onProviderUpdated(res.provider);
        action("New service published to profile");
      }
      setModal(false);
      setEditingService(null);
      setNewServiceName("");
      setNewServiceDesc("");
    } catch (err: any) {
      action(err.message || "Failed to save service");
    }
  };

  const handleDeleteService = async (service: ProviderService) => {
    const srvId = service.id || service.name;
    if (!srvId) return;
    try {
      const res = await api.deleteProviderService(providerId, srvId);
      onProviderUpdated(res.provider);
      action(`Removed "${service.name}"`);
    } catch (err: any) {
      action(err.message || "Failed to remove service");
    }
  };

  const handleSaveAvailability = async () => {
    setSavingAvail(true);
    try {
      const res = await api.updateProviderAvailability(providerId, {
        acceptingBookings,
        workingDays,
        workingHours,
        emergencyAvailable,
      });
      const updated = { ...currentProvider, availability: res.availability };
      onProviderUpdated(updated);
      action("Availability schedule saved");
    } catch (err: any) {
      action(err.message || "Failed to update availability");
    } finally {
      setSavingAvail(false);
    }
  };

  const pendingRequests = bookingsList.filter((b) => b.status === "pending" || b.status === "confirmed");
  const appointments = bookingsList.filter((b) => b.status === "accepted" || b.status === "in-progress");

  return (
    <DashboardShell
      kind="pro"
      title="PROVIDER STUDIO"
      items={[
        "Overview",
        "Booking requests",
        "Appointments",
        "Services",
        "Availability",
        "Reviews",
        "Earnings",
        "Business profile",
      ]}
      active={active}
      setActive={setActive}
      go={go}
      currentUser={currentUser}
      onOpenAuth={onOpenAuth}
      onLogout={onLogout}
    >
      {toast && (
        <div className="toast">
          <Icon name="check" />
          {toast}
        </div>
      )}
      <div className="dash-welcome">
        <div>
          <span className="kicker">LIVE OPERATIONS</span>
          <h1>
            {active === "Overview" ? (
              <>
                Good morning,
                <br />
                <em>{currentUser?.name.split(" ")[0] || "Kwame"}.</em>
              </>
            ) : (
              active
            )}
          </h1>
        </div>
        <button className="primary-button" onClick={handleOpenAddModal}>
          <Icon name="plus" /> Add service
        </button>
      </div>

      {active === "Overview" ? (
        <>
          <div className="metric-row">
            <div>
              <span>THIS MONTH</span>
              <b>GH₵14,200</b>
              <small>
                <i>↑ 18%</i> from last month
              </small>
            </div>
            <div>
              <span>ACTIVE APPOINTMENTS</span>
              <b>
                {appointments.length} <small>jobs</small>
              </b>
              <small>Ready in Greater Accra</small>
            </div>
            <div>
              <span>RATING</span>
              <b>{currentProvider?.rating ? Number(currentProvider.rating).toFixed(2) : "5.00"}</b>
              <small>{proReviews.length} customer {proReviews.length === 1 ? "review" : "reviews"}</small>
            </div>
          </div>
          <div className="pro-dash-grid">
            <section className="requests-panel">
              <div className="panel-head">
                <div>
                  <span className="kicker">NEEDS YOUR ATTENTION</span>
                  <h2>
                    New requests <i>{pendingRequests.length}</i>
                  </h2>
                </div>
                <button onClick={() => setActive("Booking requests")}>View all</button>
              </div>
              {pendingRequests.map((r) => {
                const cName = r.customerName || r.customerId || "Customer";
                return (
                  <div className="request-row" key={r.id}>
                    <span className="request-avatar">{cName.slice(0, 2).toUpperCase()}</span>
                    <div>
                      <b>{cName}</b>
                      <small>{r.serviceName} · {r.id}</small>
                    </div>
                    <p>
                      <b>{r.date} · {r.time}</b>
                      <small>GH₵{r.total} estimated</small>
                    </p>
                    <button onClick={() => handleRespond(r.id, "accepted")}>Accept</button>
                    <button className="icon-button" onClick={() => handleRespond(r.id, "declined")}>
                      <Icon name="close" />
                    </button>
                  </div>
                );
              })}
              {!pendingRequests.length && (
                <p className="all-clear">
                  <Icon name="check" /> No pending requests. You are all caught up!
                </p>
              )}
            </section>
            <section className="schedule-panel">
              <div className="panel-head">
                <h2>Today’s Schedule</h2>
                <button>
                  <Icon name="more" />
                </button>
              </div>
              <div className="timeline">
                <span>09:00</span>
                <div>
                  <b>Kitchen cabinet repair</b>
                  <small>Kojo Agyeman · Osu</small>
                </div>
                <span>13:30</span>
                <div>
                  <b>Built-in shelf measure</b>
                  <small>Adwoa Safo · Cantonments</small>
                </div>
                <span>16:00</span>
                <div className="free">
                  <b>Available</b>
                  <small>2 hour window</small>
                </div>
              </div>
            </section>
          </div>
        </>
      ) : active === "Booking requests" ? (
        <section className="management-panel">
          <div className="panel-head">
            <div>
              <span className="kicker">INCOMING INQUIRIES</span>
              <h2>All Booking Requests</h2>
            </div>
            <span className="locked-label">{pendingRequests.length} Pending</span>
          </div>
          {pendingRequests.map((r) => {
            const cName = r.customerName || r.customerId || "Customer";
            return (
              <div className="management-row" key={r.id}>
                <span>{cName.slice(0, 2).toUpperCase()}</span>
                <div>
                  <b>{cName} ({r.id})</b>
                  <small>{r.serviceName} · 📍 {r.address}</small>
                </div>
                <strong>GH₵{r.total}</strong>
                <button className="primary-button" onClick={() => handleRespond(r.id, "accepted")}>
                  Accept
                </button>
                <button className="danger" onClick={() => handleRespond(r.id, "declined")}>
                  Decline
                </button>
              </div>
            );
          })}
          {!pendingRequests.length && <p className="all-clear">No pending requests.</p>}
        </section>
      ) : active === "Appointments" ? (
        <section className="management-panel">
          <div className="panel-head">
            <div>
              <span className="kicker">ACTIVE & CONFIRMED JOBS</span>
              <h2>Confirmed Appointments</h2>
            </div>
            <span className="locked-label">{appointments.length} Total</span>
          </div>
          {appointments.map((a) => {
            const cName = a.customerName || a.customerId || "Customer";
            return (
              <div className="management-row" key={a.id}>
                <span>{(a.id || "").slice(-2)}</span>
                <div>
                  <b>{a.serviceName} ({a.id})</b>
                  <small>{cName} · {a.date} at {a.time} · 📍 {a.address}</small>
                {a.bookingType && (
                  <small style={{ color: "#7e9270", display: "block" }}>
                    Mode: {a.bookingType === "instant" ? "⚡ Instant Booking" : "📋 Standard Request"}
                  </small>
                )}
              </div>
              <strong>GH₵{a.total}</strong>
              <i className={`status ${a.status === "in-progress" ? "in-progress" : "confirmed"}`}>
                {a.status === "in-progress" ? "IN PROGRESS" : "ACCEPTED"}
              </i>
              {a.status === "accepted" && (
                <button className="primary-button" onClick={() => handleProgress(a.id, "start")}>
                  Start Job
                </button>
              )}
              {a.status === "in-progress" && (
                <button className="primary-button" onClick={() => handleProgress(a.id, "complete")}>
                  Complete Job
                </button>
              )}
            </div>
            );
          })}
          {!appointments.length && <p className="all-clear">No upcoming appointments yet.</p>}
        </section>
      ) : active === "Services" ? (
        <ServicesPanel
          services={currentProvider.services || []}
          onAdd={handleOpenAddModal}
          onEdit={handleOpenEditModal}
          onDelete={handleDeleteService}
        />
      ) : active === "Availability" ? (
        <AvailabilityPanel
          acceptingBookings={acceptingBookings}
          setAcceptingBookings={setAcceptingBookings}
          workingDays={workingDays}
          setWorkingDays={setWorkingDays}
          workingHours={workingHours}
          setWorkingHours={setWorkingHours}
          emergencyAvailable={emergencyAvailable}
          setEmergencyAvailable={setEmergencyAvailable}
          onSave={handleSaveAvailability}
          saving={savingAvail}
        />
      ) : active === "Reviews" ? (
        <section className="management-panel">
          <div className="panel-head">
            <div>
              <span className="kicker">CUSTOMER FEEDBACK</span>
              <h2>Verified Reviews</h2>
            </div>
            <span className="locked-label">
              ★ {currentProvider?.rating ? Number(currentProvider.rating).toFixed(2) : "5.00"} Rating
            </span>
          </div>

          <div className="reviews-section">
            <div className="reviews-header-summary">
              <div className="rating-big-box">
                <span className="rating-score">
                  {currentProvider?.rating ? Number(currentProvider.rating).toFixed(1) : "5.0"}
                </span>
                <div>
                  <div className="rating-stars-row">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={
                          star <= Math.round(Number(currentProvider?.rating || 5)) ? "star-filled" : "star-empty"
                        }
                      >
                        ★
                      </span>
                    ))}
                  </div>
                  <span className="rating-sub">
                    {proReviews.length} customer {proReviews.length === 1 ? "review" : "reviews"}
                  </span>
                </div>
              </div>
            </div>

            {proReviews.length === 0 ? (
              <div className="reviews-empty">
                <p className="tab-copy">No customer reviews yet.</p>
                <small>Reviews submitted by customers upon service completion will appear here.</small>
              </div>
            ) : (
              <div className="reviews-list">
                {proReviews.map((r) => (
                  <div key={r.id} className="review-card">
                    <div className="review-card-top">
                      <div>
                        <strong className="review-author">{r.customerName}</strong>
                        <span className="review-verified-badge">✓ Verified Booking</span>
                      </div>
                      <span className="review-date">
                        {r.createdAt
                          ? new Date(r.createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : ""}
                      </span>
                    </div>
                    <div className="review-stars-row">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span key={star} className={star <= r.rating ? "star-filled" : "star-empty"}>
                          ★
                        </span>
                      ))}
                    </div>
                    <p className="review-comment">{r.comment}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      ) : active === "Business profile" ? (
        <section className="management-panel">
          <div className="panel-head">
            <h2>Provider Profile Details</h2>
          </div>
          <div className="form-grid" style={{ padding: "20px 0" }}>
            <label>
              Trade Name
              <input defaultValue={currentProvider.name} readOnly />
            </label>
            <label>
              Primary Category
              <input defaultValue={currentProvider.category} readOnly />
            </label>
            <label>
              Contact Number
              <input defaultValue={currentProvider.phone || "+233 24 555 0184"} readOnly />
            </label>
            <label>
              Operating Area
              <input defaultValue={currentProvider.area || "Accra"} readOnly />
            </label>
          </div>
        </section>
      ) : (
        <EmptyState title={active} go={go} />
      )}

      {modal && (
        <Modal
          title={editingService ? `Edit service: ${editingService.name}` : "Add a new service"}
          close={() => setModal(false)}
        >
          <div className="form-grid">
            <label className="full">
              Approved professional category
              <select
                value={newServiceCategory}
                onChange={(e) => setNewServiceCategory(e.target.value)}
              >
                {(categoriesList.length
                  ? categoriesList
                  : [
                      { id: "plumbing", name: "Plumbing" },
                      { id: "electrical", name: "Electrical" },
                      { id: "carpentry", name: "Carpentry" },
                      { id: "painting", name: "Painting" },
                      { id: "masonry", name: "Masonry" },
                      { id: "cleaning", name: "Cleaning" },
                      { id: "appliances", name: "Appliance Repairs" },
                      { id: "hvac", name: "HVAC/Ventilation" },
                      { id: "assembly", name: "Home Installation & Assembly" },
                    ]
                ).map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="full">
              Service name
              <input
                value={newServiceName}
                onChange={(e) => setNewServiceName(e.target.value)}
                placeholder="e.g. Door hinge repair"
                autoFocus
              />
            </label>
            <label>
              Starting price (GH₵)
              <input
                value={newServicePrice}
                onChange={(e) => setNewServicePrice(e.target.value)}
                placeholder="450"
              />
            </label>
            <label>
              Billing type
              <select
                value={newServiceBilling}
                onChange={(e) => setNewServiceBilling(e.target.value)}
              >
                <option value="Fixed price">Fixed price</option>
                <option value="Per hour">Per hour</option>
              </select>
            </label>
            <label className="full">
              Description
              <textarea
                value={newServiceDesc}
                onChange={(e) => setNewServiceDesc(e.target.value)}
                placeholder="Describe what is included in this service..."
              />
            </label>
          </div>
          <div className="modal-actions">
            <button onClick={() => setModal(false)}>Cancel</button>
            <button className="primary-button" onClick={handleSaveService}>
              {editingService ? "Save changes" : "Publish service"} <Icon name="arrow" />
            </button>
          </div>
        </Modal>
      )}
    </DashboardShell>
  );
}

function ServicesPanel({
  services,
  onAdd,
  onEdit,
  onDelete,
}: {
  services: ProviderService[];
  onAdd: () => void;
  onEdit: (s: ProviderService) => void;
  onDelete: (s: ProviderService) => void;
}) {
  return (
    <section className="management-panel">
      <div className="panel-head">
        <div>
          <span className="kicker">ACTIVE LISTINGS</span>
          <h2>Published Services ({services.length})</h2>
        </div>
        <button className="primary-button" onClick={onAdd}>
          <Icon name="plus" /> Add service
        </button>
      </div>
      {services.map((s, idx) => (
        <div className="management-row" key={s.id || s.name + idx}>
          <span>⌁</span>
          <div>
            <b>{s.name}</b>
            <small>
              {s.category || "General"} · {s.billing || "Fixed price"}
              {s.description ? ` · ${s.description}` : ""}
            </small>
          </div>
          <strong>GH₵{s.price}</strong>
          <i className="status live">ACTIVE</i>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => onEdit(s)}
              title="Edit service"
              style={{
                border: "1px solid var(--line)",
                background: "transparent",
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: "11px",
              }}
            >
              Edit
            </button>
            <button
              onClick={() => onDelete(s)}
              title="Remove service"
              style={{
                border: "1px solid #d99c85",
                background: "transparent",
                color: "#c57656",
                padding: "4px 8px",
                cursor: "pointer",
                fontSize: "11px",
              }}
            >
              ✕
            </button>
          </div>
        </div>
      ))}
      {!services.length && (
        <div className="directory-empty" style={{ margin: "20px 0" }}>
          <h2>No services published yet.</h2>
          <p>Add your trade services with pricing so customers can book you instantly.</p>
          <button className="outline-button" onClick={onAdd}>
            <Icon name="plus" /> Add your first service
          </button>
        </div>
      )}
    </section>
  );
}

function AvailabilityPanel({
  acceptingBookings,
  setAcceptingBookings,
  workingDays,
  setWorkingDays,
  workingHours,
  setWorkingHours,
  emergencyAvailable,
  setEmergencyAvailable,
  onSave,
  saving,
}: {
  acceptingBookings: boolean;
  setAcceptingBookings: (v: boolean) => void;
  workingDays: string[];
  setWorkingDays: (days: string[]) => void;
  workingHours: string;
  setWorkingHours: (v: string) => void;
  emergencyAvailable: boolean;
  setEmergencyAvailable: (v: boolean) => void;
  onSave: () => void;
  saving: boolean;
}) {
  const allDays = [
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
    "Sunday",
  ];

  const toggleDay = (day: string) => {
    if (workingDays.includes(day)) {
      setWorkingDays(workingDays.filter((d) => d !== day));
    } else {
      setWorkingDays([...workingDays, day]);
    }
  };

  return (
    <section className="management-panel">
      <div className="panel-head">
        <div>
          <span className="kicker">CALENDAR & DISPATCH</span>
          <h2>Provider Availability Schedule</h2>
        </div>
        <button className="primary-button" onClick={onSave} disabled={saving}>
          <Icon name="check" size={13} /> {saving ? "Saving..." : "Save schedule"}
        </button>
      </div>

      <div className="form-grid">
        <label className="full">
          Booking Acceptance Status
          <div className="category-strip" style={{ marginTop: "8px" }}>
            <button
              className={acceptingBookings ? "active" : ""}
              type="button"
              onClick={() => setAcceptingBookings(true)}
            >
              ✓ Accepting New Bookings
            </button>
            <button
              className={!acceptingBookings ? "active" : ""}
              type="button"
              onClick={() => setAcceptingBookings(false)}
            >
              ⏸ Temporarily Paused
            </button>
          </div>
        </label>

        <label className="full">
          Active Working Days
          <div className="category-strip" style={{ flexWrap: "wrap", gap: "8px", marginTop: "8px" }}>
            {allDays.map((day) => (
              <button
                key={day}
                type="button"
                className={workingDays.includes(day) ? "active" : ""}
                onClick={() => toggleDay(day)}
              >
                {day}
              </button>
            ))}
          </div>
        </label>

        <label>
          Daily Operating Hours
          <input
            value={workingHours}
            onChange={(e) => setWorkingHours(e.target.value)}
            placeholder="08:00 - 17:00"
          />
        </label>

        <label>
          Emergency Callout Service
          <select
            value={emergencyAvailable ? "yes" : "no"}
            onChange={(e) => setEmergencyAvailable(e.target.value === "yes")}
          >
            <option value="yes">Yes — Available for urgent callouts</option>
            <option value="no">No — Standard operating hours only</option>
          </select>
        </label>
      </div>

      <div className="management-row" style={{ marginTop: "24px" }}>
        <span>⌁</span>
        <div>
          <b>Current Live Status in Directory</b>
          <small>
            {acceptingBookings
              ? `Accepting bookings · Operating ${workingDays.slice(0, 3).join(", ")} · ${workingHours}`
              : "Bookings paused — Customers will see that requests are currently paused"}
          </small>
        </div>
        <strong>{acceptingBookings ? "LIVE" : "PAUSED"}</strong>
        <i className={`status ${acceptingBookings ? "live" : "pending"}`}>
          {acceptingBookings ? "ACTIVE" : "PAUSED"}
        </i>
      </div>
    </section>
  );
}

function CategoryManagement({
  categoriesList,
  providersList,
  bookingsList,
  onCategoryUpdated,
  onCategoryCreated,
}: {
  categoriesList: Category[];
  providersList: Provider[];
  bookingsList: Booking[];
  onCategoryUpdated: (catId: string, updates: Partial<Category>) => void;
  onCategoryCreated: (newCat: Category) => void;
}) {
  const [selectedId, setSelectedId] = useState("plumbing");
  const [editing, setEditing] = useState(false);
  const [editDesc, setEditDesc] = useState("");
  const [newModal, setNewModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [toast, setToast] = useState("");

  const categories = categoriesList.length
    ? categoriesList
    : [
        {
          id: "plumbing",
          name: "Plumbing",
          description: "Pipes, drains, taps and water tanks",
          icon: "tools",
          active: true,
        },
        {
          id: "electrical",
          name: "Electrical",
          description: "Wiring, fixtures, sockets & generators",
          icon: "settings",
          active: true,
        },
        {
          id: "carpentry",
          name: "Carpentry",
          description: "Doors, cabinets, shelving and roofs",
          icon: "grid",
          active: true,
        },
        {
          id: "painting",
          name: "Painting",
          description: "Interior & exterior wall paint",
          icon: "heart",
          active: true,
        },
        {
          id: "masonry",
          name: "Masonry",
          description: "Tiling, brickwork, paving & plastering",
          icon: "home",
          active: true,
        },
        {
          id: "cleaning",
          name: "Cleaning",
          description: "Deep cleaning, post-construction & sanitation",
          icon: "star",
          active: true,
        },
        {
          id: "appliances",
          name: "Appliance Repairs",
          description: "Fridges, washing machines, microwaves",
          icon: "settings",
          active: true,
        },
        {
          id: "hvac",
          name: "HVAC/Ventilation",
          description: "AC installation, gas top-up & maintenance",
          icon: "clock",
          active: true,
        },
        {
          id: "assembly",
          name: "Home Installation & Assembly",
          description: "Curtains, TV mounting, fixtures",
          icon: "plus",
          active: true,
        },
      ];

  const selectedCategory = categories.find((c) => c.id === selectedId) || categories[0];

  useEffect(() => {
    if (selectedCategory) {
      setEditDesc(selectedCategory.description || "");
    }
  }, [selectedId, selectedCategory]);

  const handleSaveDescription = async () => {
    try {
      await api.updateCategory(selectedCategory.id, { description: editDesc });
      onCategoryUpdated(selectedCategory.id, { description: editDesc });
      setEditing(false);
      setToast(`Updated ${selectedCategory.name} description.`);
      setTimeout(() => setToast(""), 2200);
    } catch (err: any) {
      alert(err.message || "Failed to update category.");
    }
  };

  const handleToggleActive = async () => {
    const nextActive = selectedCategory.active === false ? true : false;
    try {
      await api.updateCategory(selectedCategory.id, { active: nextActive });
      onCategoryUpdated(selectedCategory.id, { active: nextActive });
      setToast(`${selectedCategory.name} is now ${nextActive ? "Active" : "Disabled"}.`);
      setTimeout(() => setToast(""), 2200);
    } catch (err: any) {
      alert(err.message || "Failed to toggle category status.");
    }
  };

  const handleCreateCategory = async () => {
    if (!newName.trim()) return;
    try {
      const res = await api.createCategory({
        name: newName.trim(),
        description:
          newDesc.trim() || `Professional ${newName.trim()} services for homes and offices.`,
        active: true,
      });
      onCategoryCreated(res.category);
      setNewModal(false);
      setNewName("");
      setNewDesc("");
      setSelectedId(res.category.id);
      setToast(`Created category ${res.category.name}`);
      setTimeout(() => setToast(""), 2200);
    } catch (err: any) {
      alert(err.message || "Failed to create category");
    }
  };

  return (
    <section className="management-panel">
      {toast && (
        <div className="toast">
          <Icon name="check" />
          {toast}
        </div>
      )}
      <div className="panel-head">
        <div>
          <span className="kicker">APPROVED SERVICE TAXONOMY</span>
          <h2>Home-service categories ({categories.length})</h2>
        </div>
        <div style={{ display: "flex", gap: "10px" }}>
          <span className="locked-label">
            <Icon name="check" size={13} /> {categories.filter((c) => c.active !== false).length} active
          </span>
          <button className="primary-button" onClick={() => setNewModal(true)}>
            <Icon name="plus" /> Add category
          </button>
        </div>
      </div>

      <div className="category-management">
        {categories.map((cat, index) => {
          const provCount = providersList.filter(
            (p) =>
              p.category === cat.name ||
              p.trade === cat.name ||
              p.category?.toLowerCase() === cat.name.toLowerCase()
          ).length;
          const bookCount = bookingsList.filter(
            (b) =>
              b.serviceId === cat.id ||
              b.serviceName?.toLowerCase().includes(cat.name.toLowerCase())
          ).length;

          return (
            <button
              className={selectedId === cat.id ? "active" : ""}
              onClick={() => {
                setSelectedId(cat.id);
                setEditing(false);
              }}
              key={cat.id}
            >
              <span>{String(index + 1).padStart(2, "0")}</span>
              <div>
                <b>{cat.name}</b>
                <small>
                  {provCount} professionals · {bookCount} bookings
                </small>
              </div>
              <i className={`status ${cat.active !== false ? "live" : "pending"}`}>
                {cat.active !== false ? "ACTIVE" : "DISABLED"}
              </i>
              <Icon name="chevron" />
            </button>
          );
        })}
      </div>

      <div className="category-detail">
        <span className="kicker">SELECTED CATEGORY</span>
        <h3>{selectedCategory.name}</h3>
        <p>
          {selectedCategory.description ||
            "Manage approved trade subcategories, assign verified professionals, and review customer-facing service listings."}
        </p>

        {editing ? (
          <div className="form-grid" style={{ margin: "16px 0" }}>
            <label className="full">
              Category Description
              <textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Describe services covered under this category..."
              />
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              <button className="primary-button" onClick={handleSaveDescription}>
                Save changes <Icon name="check" />
              </button>
              <button className="outline-button" onClick={() => setEditing(false)}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", gap: "12px", marginTop: "14px" }}>
            <button className="outline-button" onClick={() => setEditing(true)}>
              Edit description <Icon name="arrow" />
            </button>
            <button
              className="outline-button"
              onClick={handleToggleActive}
              style={{ color: selectedCategory.active === false ? "#7e9270" : "#c57656" }}
            >
              {selectedCategory.active === false ? "Enable category" : "Disable category"}
            </button>
          </div>
        )}
      </div>

      {newModal && (
        <Modal title="Add service category" close={() => setNewModal(false)}>
          <div className="form-grid">
            <label className="full">
              Category Name
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Solar Energy & Inverters"
                autoFocus
              />
            </label>
            <label className="full">
              Description
              <textarea
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Brief description of trade services..."
              />
            </label>
          </div>
          <div className="modal-actions">
            <button onClick={() => setNewModal(false)}>Cancel</button>
            <button className="primary-button" onClick={handleCreateCategory}>
              Create category <Icon name="arrow" />
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}

function EssentialsManagement() {
  const [products, setProducts] = useState(essentials.map((item) => ({ ...item, live: true })));
  return (
    <section className="management-panel">
      <div className="panel-head">
        <div>
          <span className="kicker">PRODUCT CATALOGUE</span>
          <h2>Home essentials</h2>
        </div>
        <button
          className="primary-button"
          onClick={() =>
            setProducts((current) => [
              ...current,
              {
                name: `Home maintenance kit ${current.length + 1}`,
                detail: "Tools · Tape · Plugs",
                price: "GH₵320",
                symbol: "＋",
                live: false,
              },
            ])
          }
        >
          <Icon name="plus" /> Add product
        </button>
      </div>
      {products.map((product, index) => (
        <div className="management-row product-admin-row" key={product.name}>
          <span>{product.symbol}</span>
          <div>
            <b>{product.name}</b>
            <small>{product.detail}</small>
          </div>
          <strong>{product.price}</strong>
          <i className={`status ${product.live ? "live" : "pending"}`}>
            {product.live ? "LISTED" : "HIDDEN"}
          </i>
          <button
            aria-label={`${product.live ? "Hide" : "List"} ${product.name}`}
            onClick={() =>
              setProducts((current) =>
                current.map((item, itemIndex) =>
                  itemIndex === index ? { ...item, live: !item.live } : item,
                ),
              )
            }
          >
            <Icon name="more" />
          </button>
        </div>
      ))}
    </section>
  );
}

function AdminDashboard({
  go,
  currentUser,
  providersList,
  bookingsList,
  categoriesList,
  stats,
  onProviderVerified,
  onCategoryUpdated,
  onCategoryCreated,
  onOpenAuth,
  onLogout,
}: {
  go: (v: View) => void;
  currentUser: User | null;
  providersList: Provider[];
  bookingsList: Booking[];
  categoriesList: Category[];
  stats: PlatformStats | null;
  onProviderVerified: (providerId: string, status: "approved" | "declined") => void;
  onCategoryUpdated: (catId: string, updates: Partial<Category>) => void;
  onCategoryCreated: (newCat: Category) => void;
  onOpenAuth?: () => void;
  onLogout?: () => void;
}) {
  const [active, setActive] = useState("Platform overview");
  const [dialogProvider, setDialogProvider] = useState<Provider | null>(null);
  const [toast, setToast] = useState("");

  const pendingProviders = providersList.filter((p) => p.status === "pending");

  const approve = async (provider: Provider) => {
    try {
      await api.verifyProvider(provider.id, "approved");
      onProviderVerified(provider.id, "approved");
      setDialogProvider(null);
      setToast(`${provider.name} approved`);
      setTimeout(() => setToast(""), 2200);
    } catch (e) {
      onProviderVerified(provider.id, "approved");
      setDialogProvider(null);
      setToast(`${provider.name} approved`);
      setTimeout(() => setToast(""), 2200);
    }
  };

  const decline = async (provider: Provider) => {
    try {
      await api.verifyProvider(provider.id, "declined");
      onProviderVerified(provider.id, "declined");
      setDialogProvider(null);
      setToast(`${provider.name} application declined`);
      setTimeout(() => setToast(""), 2200);
    } catch (e) {
      onProviderVerified(provider.id, "declined");
      setDialogProvider(null);
      setToast(`${provider.name} application declined`);
      setTimeout(() => setToast(""), 2200);
    }
  };

  const grossFormatted = stats?.grossBookingsFormatted || `GH₵${(bookingsList.reduce((acc, b) => acc + (b.total || 0), 0) / 1000).toFixed(1)}k`;

  return (
    <DashboardShell
      kind="admin"
      title="CONTROL ROOM"
      items={[
        "Platform overview",
        "Customers",
        "Providers",
        "Verification queue",
        "Service categories",
        "Home essentials",
        "Bookings",
        "Analytics",
        "Settings",
      ]}
      active={active}
      setActive={setActive}
      go={go}
      currentUser={currentUser}
      onOpenAuth={onOpenAuth}
      onLogout={onLogout}
    >
      {toast && (
        <div className="toast">
          <Icon name="check" />
          {toast}
        </div>
      )}
      <div className="admin-top">
        <div>
          <span className="kicker">LIVE OPERATIONS · GREATER ACCRA</span>
          <h1>{active}</h1>
        </div>
        <div className="admin-search">
          <Icon name="search" />
          <input placeholder="Search platform records" />
          <kbd>⌘ K</kbd>
        </div>
        <button className="notification-dot">{pendingProviders.length}</button>
      </div>

      {active === "Platform overview" ? (
        <>
          <div className="admin-metrics">
            <div>
              <span>GROSS BOOKINGS</span>
              <b>{grossFormatted}</b>
              <small>
                <i>+18.4%</i> this month
              </small>
            </div>
            <div>
              <span>ACTIVE BOOKINGS</span>
              <b>{bookingsList.filter((b) => b.status !== "declined" && b.status !== "completed").length}</b>
              <small>Real platform jobs</small>
            </div>
            <div>
              <span>ACTIVE PROVIDERS</span>
              <b>{providersList.filter((p) => p.status === "approved").length}</b>
              <small>{pendingProviders.length} awaiting review</small>
            </div>
            <div>
              <span>CUSTOMER HEALTH</span>
              <b>94.8%</b>
              <small>Repeat booking rate</small>
            </div>
          </div>
          <div className="admin-grid">
            <section className="chart-panel">
              <div className="panel-head">
                <div>
                  <span className="kicker">BOOKING VOLUME</span>
                  <h2>Activity this month</h2>
                </div>
                <select>
                  <option>Last 30 days</option>
                </select>
              </div>
              <div className="chart">
                <div className="chart-y">
                  <span>1.2k</span>
                  <span>800</span>
                  <span>400</span>
                  <span>0</span>
                </div>
                <svg viewBox="0 0 600 190" preserveAspectRatio="none">
                  <path
                    className="chart-area"
                    d="M0 165 C50 150 65 120 105 130 S180 155 220 100 S280 120 330 80 S410 95 455 44 S540 75 600 18 L600 190 L0 190Z"
                  />
                  <path
                    className="chart-line"
                    d="M0 165 C50 150 65 120 105 130 S180 155 220 100 S280 120 330 80 S410 95 455 44 S540 75 600 18"
                  />
                </svg>
                <div className="chart-x">
                  <span>20 May</span>
                  <span>27 May</span>
                  <span>3 Jun</span>
                  <span>10 Jun</span>
                  <span>17 Jun</span>
                </div>
              </div>
            </section>
            <section className="verification">
              <div className="panel-head">
                <div>
                  <span className="kicker">ACTION REQUIRED</span>
                  <h2>
                    Verification queue <i>{pendingProviders.length}</i>
                  </h2>
                </div>
                <button onClick={() => setActive("Verification queue")}>View queue</button>
              </div>
              {pendingProviders.map((p, i) => (
                <div className="verify-row" key={p.id}>
                  <span style={{ background: i ? "#d8c59f" : "#9cae95" }}>
                    {p.name
                      .split(" ")
                      .map((x) => x[0])
                      .join("")
                      .slice(0, 2)}
                  </span>
                  <div>
                    <b>{p.name}</b>
                    <small>{p.trade} · {p.area}</small>
                  </div>
                  <button onClick={() => setDialogProvider(p)}>
                    Review <Icon name="chevron" />
                  </button>
                </div>
              ))}
              {!pendingProviders.length && (
                <p className="all-clear">
                  <Icon name="check" /> All caught up. No pending applications.
                </p>
              )}
            </section>
          </div>
          <section className="activity-table">
            <div className="panel-head">
              <div>
                <span className="kicker">LIVE PLATFORM ACTIVITY</span>
                <h2>Recent bookings</h2>
              </div>
              <button onClick={() => setActive("Bookings")}>
                View all bookings <Icon name="arrow" />
              </button>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Booking</th>
                  <th>Customer</th>
                  <th>Provider</th>
                  <th>Service</th>
                  <th>Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {bookingsList.slice(0, 5).map((b) => (
                  <tr key={b.id}>
                    <td><b>{b.id}</b></td>
                    <td>{b.customerName}</td>
                    <td>{b.providerName || "Pending Assignment"}</td>
                    <td>{b.serviceName}</td>
                    <td>GH₵{b.total}</td>
                    <td>
                      <span className={`status ${b.status}`}>{b.status.toUpperCase()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      ) : active === "Verification queue" ? (
        <section className="management-panel">
          <div className="panel-head">
            <div>
              <span className="kicker">TRUST & SAFETY</span>
              <h2>Provider Applications</h2>
            </div>
            <div className="directory-search compact">
              <Icon name="search" />
              <input placeholder="Search applicants" />
            </div>
          </div>
          {pendingProviders.map((p, i) => (
            <div className="management-row" key={p.id}>
              <span style={{ background: i ? "#d8c59f" : "#9cae95" }}>
                {p.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <b>{p.name}</b>
                <small>{p.area} · Documents complete</small>
              </div>
              <strong>{p.trade}</strong>
              <i className="status pending">PENDING</i>
              <button className="primary-button" onClick={() => setDialogProvider(p)}>
                Review
              </button>
            </div>
          ))}
          {!pendingProviders.length && (
            <p className="all-clear">
              <Icon name="check" /> No applicants in verification queue.
            </p>
          )}
        </section>
      ) : active === "Bookings" ? (
        <section className="management-panel">
          <div className="panel-head">
            <div>
              <span className="kicker">ALL PLATFORM TRANSACTIONS</span>
              <h2>Bookings Directory</h2>
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Customer</th>
                <th>Provider</th>
                <th>Service</th>
                <th>Date & Time</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookingsList.map((b) => (
                <tr key={b.id}>
                  <td><b>{b.id}</b></td>
                  <td>{b.customerName}</td>
                  <td>{b.providerName || "Unassigned"}</td>
                  <td>{b.serviceName}</td>
                  <td>{b.date} ({b.time})</td>
                  <td>GH₵{b.total}</td>
                  <td>
                    <span className={`status ${b.status}`}>{b.status.toUpperCase()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : active === "Providers" ? (
        <section className="management-panel">
          <div className="panel-head">
            <div>
              <span className="kicker">PLATFORM TRADESPEOPLE</span>
              <h2>Registered Providers</h2>
            </div>
            <span className="locked-label">{providersList.length} Total</span>
          </div>
          {providersList.map((p) => (
            <div className="management-row" key={p.id}>
              <span style={{ background: p.color || "#7e9270", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {p.initials || p.name.slice(0, 2).toUpperCase()}
              </span>
              <div>
                <b>{p.name}</b>
                <small>{p.trade} · {p.area} · 📞 {p.phone || "+233 24 555 0184"}</small>
              </div>
              <strong>★ {p.rating} ({p.jobs} jobs)</strong>
              <i className={`status ${p.status === "approved" ? "live" : p.status}`}>
                {p.status.toUpperCase()}
              </i>
            </div>
          ))}
        </section>
      ) : active === "Customers" ? (
        <section className="management-panel">
          <div className="panel-head">
            <h2>Customer Accounts</h2>
          </div>
          <div className="management-row">
            <span>AB</span>
            <div>
              <b>Ama Boateng</b>
              <small>ama@example.com · +233 24 555 0184 · Adenta</small>
            </div>
            <strong>2 bookings</strong>
            <i className="status live">ACTIVE</i>
          </div>
          <div className="management-row">
            <span>KA</span>
            <div>
              <b>Kofi Addo</b>
              <small>kofi@example.com · +233 24 999 0009 · Airport Residential</small>
            </div>
            <strong>1 booking</strong>
            <i className="status live">ACTIVE</i>
          </div>
        </section>
      ) : active === "Service categories" ? (
        <CategoryManagement
          categoriesList={categoriesList}
          providersList={providersList}
          bookingsList={bookingsList}
          onCategoryUpdated={onCategoryUpdated}
          onCategoryCreated={onCategoryCreated}
        />
      ) : active === "Home essentials" ? (
        <EssentialsManagement />
      ) : (
        <EmptyState title={active} go={go} />
      )}

      {dialogProvider && (
        <Modal title="Provider verification" close={() => setDialogProvider(null)}>
          <div className="review-provider">
            <span>{dialogProvider.name.slice(0, 2).toUpperCase()}</span>
            <div>
              <h3>{dialogProvider.name}</h3>
              <p>{dialogProvider.trade} · {dialogProvider.area}</p>
              <small>Phone: {dialogProvider.phone || "+233 24 000 0000"}</small>
            </div>
          </div>
          <div className="document-list">
            <div>
              <Icon name="check" />
              <span>
                <b>Ghana Card / Passport</b>
                <small>Verified authentic with national registry</small>
              </span>
              <button onClick={() => alert("Ghana Card: GHA-729104812-9 verified.")}>View</button>
            </div>
            <div>
              <Icon name="check" />
              <span>
                <b>Tradesman Certificate / Reference</b>
                <small>Passed trade skill inspection</small>
              </span>
              <button onClick={() => alert("Trade Certificate: Master Guild Certified.")}>View</button>
            </div>
            <div>
              <Icon name="check" />
              <span>
                <b>Police Background Check</b>
                <small>Clean criminal record check</small>
              </span>
              <button onClick={() => alert("Police CID Clearance Certificate on file.")}>View</button>
            </div>
          </div>
          <div className="modal-actions">
            <button className="danger" onClick={() => decline(dialogProvider)}>
              Decline Application
            </button>
            <button className="primary-button" onClick={() => approve(dialogProvider)}>
              Approve provider <Icon name="check" />
            </button>
          </div>
        </Modal>
      )}
    </DashboardShell>
  );
}

function Modal({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && close()}>
      <div className="modal" role="dialog" aria-modal="true">
        <div className="modal-head">
          <div>
            <span className="kicker">SERVEPOINT</span>
            <h2>{title}</h2>
          </div>
          <button onClick={close}>
            <Icon name="close" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Footer({
  go,
  onOpenOnboarding,
}: {
  go: (v: View) => void;
  onOpenOnboarding: () => void;
}) {
  return (
    <footer>
      <div>
        <Logo light />
        <p>Good help for the home you love.</p>
      </div>
      <div>
        <b>Explore</b>
        <button onClick={() => go("explore")}>Find services</button>
        <button onClick={() => go("provider")}>Professionals</button>
        <button onClick={onOpenOnboarding}>Become a provider</button>
      </div>
      <div>
        <b>Dashboards</b>
        <button onClick={() => go("customer")}>Customer Portal</button>
        <button onClick={() => go("pro")}>Provider Studio</button>
        <button onClick={() => go("admin")}>Admin Control Room</button>
      </div>
      <div className="footer-note">
        <span>ACCRA · GHANA</span>
        <small>© 2026 ServePoint Ghana</small>
      </div>
    </footer>
  );
}

function AuthModal({
  close,
  onSuccess,
  defaultTab = "login",
  initialRole = "customer",
  initialError = "",
}: {
  close: () => void;
  onSuccess: (user: User) => void;
  defaultTab?: "login" | "register";
  initialRole?: "customer" | "provider";
  initialError?: string;
}) {
  const [tab, setTab] = useState<"login" | "register">(defaultTab);
  const [role, setRole] = useState<"customer" | "provider">(initialRole);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [trade, setTrade] = useState("Carpentry & Woodwork");
  const [area, setArea] = useState("Accra");
  const [loading, setLoading] = useState(false);
  const [activeDemo, setActiveDemo] = useState<string | null>(null);
  const [error, setError] = useState(initialError);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.login({ email, password });
      if (res.ok && res.user) {
        onSuccess(res.user);
      } else {
        setError("Invalid email or password.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to sign in.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      setError("Name, email and password are required.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await api.register({
        name,
        email,
        password,
        phone,
        role: role === "provider" ? "artisan" : "customer",
        trade: role === "provider" ? trade : undefined,
        area,
      });
      if (res.ok && res.user) {
        onSuccess(res.user);
      } else {
        setError("Registration could not be completed.");
      }
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemo = async (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("password123");
    setActiveDemo(demoEmail);
    setLoading(true);
    setError("");
    try {
      const res = await api.login({ email: demoEmail, password: "password123" });
      if (res.ok && res.user) {
        onSuccess(res.user);
      } else {
        setError("Invalid demo credentials.");
      }
    } catch (err: any) {
      setError(err.message || "Demo sign in failed.");
    } finally {
      setLoading(false);
      setActiveDemo(null);
    }
  };

  return (
    <Modal title={tab === "login" ? "Sign In to ServePoint" : "Create your ServePoint Account"} close={close}>
      <div style={{ marginBottom: "15px" }}>
        <div style={{ display: "flex", gap: "25px", borderBottom: "1px solid var(--line)", paddingBottom: "12px", marginBottom: "16px" }}>
          <button
            type="button"
            style={{
              border: 0,
              background: "none",
              fontWeight: 600,
              fontSize: "14px",
              color: tab === "login" ? "var(--forest)" : "#78766f",
              borderBottom: tab === "login" ? "2px solid var(--forest)" : "none",
              paddingBottom: "8px",
              cursor: "pointer",
            }}
            onClick={() => { setTab("login"); setError(""); }}
          >
            Sign In
          </button>
          <button
            type="button"
            style={{
              border: 0,
              background: "none",
              fontWeight: 600,
              fontSize: "14px",
              color: tab === "register" ? "var(--forest)" : "#78766f",
              borderBottom: tab === "register" ? "2px solid var(--forest)" : "none",
              paddingBottom: "8px",
              cursor: "pointer",
            }}
            onClick={() => { setTab("register"); setError(""); }}
          >
            Create Account
          </button>
        </div>

        {error && (
          <div style={{ background: "#fbf3ee", border: "1px solid #d99c85", color: "#8a3d24", padding: "10px 14px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
            {error}
          </div>
        )}

        {tab === "login" ? (
          <form onSubmit={handleLogin}>
            <div className="form-grid">
              <label className="full">
                Email Address
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. ama@example.com"
                  autoFocus
                />
              </label>
              <label className="full">
                Password
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                />
              </label>
            </div>
            <div className="modal-actions" style={{ marginTop: "20px" }}>
              <button type="button" onClick={() => { setTab("register"); setError(""); }}>
                Need an account? Sign up
              </button>
              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? "Signing in..." : "Sign In"} <Icon name="arrow" />
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleRegister}>
            <div style={{ marginBottom: "16px" }}>
              <span className="kicker" style={{ display: "block", marginBottom: "8px" }}>I AM JOINING AS</span>
              <div style={{ display: "flex", gap: "10px" }}>
                <button
                  type="button"
                  className={role === "customer" ? "primary-button" : "outline-button"}
                  style={{ flex: 1, padding: "10px 12px", fontSize: "13px" }}
                  onClick={() => setRole("customer")}
                >
                  Customer (Book Services)
                </button>
                <button
                  type="button"
                  className={role === "provider" ? "primary-button" : "outline-button"}
                  style={{ flex: 1, padding: "10px 12px", fontSize: "13px" }}
                  onClick={() => setRole("provider")}
                >
                  Service Provider / Artisan
                </button>
              </div>
            </div>

            <div className="form-grid">
              <label className="full">
                Full Name
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === "provider" ? "e.g. Kwame Ofori" : "e.g. Ama Boateng"}
                  autoFocus
                />
              </label>
              <label>
                Email Address
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. yourname@example.com"
                />
              </label>
              <label>
                Password
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                />
              </label>
              <label>
                Phone Number
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+233 24 000 0000"
                />
              </label>
              <label>
                Location / Area
                <input
                  value={area}
                  onChange={(e) => setArea(e.target.value)}
                  placeholder="e.g. East Legon, Adenta, Osu"
                />
              </label>

              {role === "provider" && (
                <label className="full">
                  Primary Trade Category
                  <select value={trade} onChange={(e) => setTrade(e.target.value)}>
                    <option>Carpentry & Woodwork</option>
                    <option>Plumbing</option>
                    <option>Electrical Services</option>
                    <option>Painting & Wall Finishing</option>
                    <option>Masonry & Construction</option>
                    <option>Cleaning & Home Care</option>
                    <option>Appliance & Gadget Repairs</option>
                    <option>Air Conditioning & Ventilation</option>
                    <option>Home Installation & Assembly</option>
                  </select>
                </label>
              )}
            </div>

            <div className="modal-actions" style={{ marginTop: "20px" }}>
              <button type="button" onClick={() => { setTab("login"); setError(""); }}>
                Already registered? Sign in
              </button>
              <button type="submit" className="primary-button" disabled={loading}>
                {loading ? "Creating account..." : "Complete Registration"} <Icon name="arrow" />
              </button>
            </div>
          </form>
        )}

        {/* Demo Fast Access */}
        <div style={{ marginTop: "24px", paddingTop: "18px", borderTop: "1px dashed var(--line)" }}>
          <span className="kicker" style={{ display: "block", marginBottom: "8px" }}>VERIFIED DEMO ACCOUNTS (INSTANT SIGN IN)</span>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            <button
              type="button"
              className="outline-button"
              disabled={loading}
              style={{ fontSize: "11px", padding: "6px 12px" }}
              onClick={() => handleQuickDemo("ama@example.com")}
            >
              {activeDemo === "ama@example.com" ? "Signing in..." : "Customer: Ama Boateng"}
            </button>
            <button
              type="button"
              className="outline-button"
              disabled={loading}
              style={{ fontSize: "11px", padding: "6px 12px" }}
              onClick={() => handleQuickDemo("kwame@example.com")}
            >
              {activeDemo === "kwame@example.com" ? "Signing in..." : "Artisan: Kwame Ofori"}
            </button>
            <button
              type="button"
              className="outline-button"
              disabled={loading}
              style={{ fontSize: "11px", padding: "6px 12px" }}
              onClick={() => handleQuickDemo("admin@servepoint.gh")}
            >
              {activeDemo === "admin@servepoint.gh" ? "Signing in..." : "Admin: Platform Control"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export default function App() {
  const [view, setView] = useState<View>("home");
  const [providersList, setProvidersList] = useState<Provider[]>(initialProviders);
  const [bookingsList, setBookingsList] = useState<Booking[]>([]);
  const [categoriesList, setCategoriesList] = useState<Category[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [selectedProvider, setSelectedProvider] = useState<Provider>(initialProviders[1]);
  const [selectedServiceName, setSelectedServiceName] = useState<string | undefined>();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "register">("login");
  const [authRole, setAuthRole] = useState<"customer" | "provider">("customer");
  const [authError, setAuthError] = useState("");
  const [onboardModalOpen, setOnboardModalOpen] = useState(false);

  // Form states for onboarding
  const [onboardName, setOnboardName] = useState("");
  const [onboardTrade, setOnboardTrade] = useState("Carpentry & Woodwork");
  const [onboardPhone, setOnboardPhone] = useState("");
  const [onboardArea, setOnboardArea] = useState("Accra");
  const [onboardPrice, setOnboardPrice] = useState("350");
  const [onboardBio, setOnboardBio] = useState("");

  const go = (next: View) => {
    // Role-based access control guards
    if (next === "admin") {
      if (!currentUser || currentUser.role !== "admin") {
        setAuthError("Administrator privileges required. Please sign in with an administrator account.");
        setAuthTab("login");
        setAuthModalOpen(true);
        return;
      }
    }
    if (next === "pro") {
      if (!currentUser || (currentUser.role !== "artisan" && currentUser.role !== "provider" && currentUser.role !== "admin")) {
        setAuthError("Provider Studio requires a registered Service Provider or Artisan account.");
        setAuthRole("provider");
        setAuthTab("register");
        setAuthModalOpen(true);
        return;
      }
    }
    if (next === "customer") {
      if (!currentUser) {
        setAuthError("Please sign in or create an account to view your Customer Dashboard.");
        setAuthTab("login");
        setAuthModalOpen(true);
        return;
      }
    }
    setView(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  useEffect(() => {
    const returnHome = () => go("home");
    window.addEventListener("servepoint:home", returnHome);

    // Session restoration on mount
    const savedToken = localStorage.getItem("servepoint_token");
    if (savedToken) {
      api.getMe().then((res) => {
        if (res.user) {
          setCurrentUser(res.user);
        } else {
          localStorage.removeItem("servepoint_token");
          localStorage.removeItem("servepoint_user");
        }
      }).catch(() => {
        localStorage.removeItem("servepoint_token");
        localStorage.removeItem("servepoint_user");
      });
    }

    const loadData = async () => {
      try {
        const [provRes, bookRes, catRes, statRes] = await Promise.allSettled([
          api.getProviders(true),
          api.getBookings(),
          api.getCategories(),
          api.getStats(),
        ]);
        if (provRes.status === "fulfilled" && provRes.value.providers?.length) {
          setProvidersList(provRes.value.providers);
          const found = provRes.value.providers.find((p) => p.id === "kwame");
          if (found) setSelectedProvider(found);
        }
        if (bookRes.status === "fulfilled" && bookRes.value.bookings) {
          setBookingsList(bookRes.value.bookings);
        }
        if (catRes.status === "fulfilled" && catRes.value.categories) {
          setCategoriesList(catRes.value.categories);
        }
        if (statRes.status === "fulfilled" && statRes.value.stats) {
          setStats(statRes.value.stats);
        }
      } catch (err) {
        console.error("Backend fetch error:", err);
      }
    };
    loadData();

    return () => window.removeEventListener("servepoint:home", returnHome);
  }, []);

  const handleStartBooking = (provider: Provider, serviceName?: string) => {
    setSelectedProvider(provider);
    setSelectedServiceName(serviceName);
    go("booking");
  };

  const handleBookingCreated = (newBooking: Booking) => {
    setBookingsList((prev) => [newBooking, ...prev.filter((b) => b.id !== newBooking.id)]);
    api.getStats().then((res) => setStats(res.stats)).catch(() => {});
  };

  const handleBookingStatusUpdated = (bookingId: string, status: string) => {
    setBookingsList((prev) =>
      prev.map((b) => (b.id === bookingId ? { ...b, status: status as any } : b)),
    );
  };

  const handleProviderVerified = (providerId: string, status: "approved" | "declined") => {
    setProvidersList((prev) =>
      prev.map((p) => (p.id === providerId ? { ...p, status } : p)),
    );
    api.getStats().then((res) => setStats(res.stats)).catch(() => {});
  };

  const handleProviderUpdated = (updated: Provider) => {
    setProvidersList((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    if (selectedProvider && selectedProvider.id === updated.id) {
      setSelectedProvider(updated);
    }
  };

  const handleCategoryUpdated = (catId: string, updates: Partial<Category>) => {
    setCategoriesList((prev) =>
      prev.map((c) => (c.id === catId ? { ...c, ...updates } : c))
    );
  };

  const handleCategoryCreated = (newCat: Category) => {
    setCategoriesList((prev) => [...prev.filter((c) => c.id !== newCat.id), newCat]);
  };

  const handleReviewSubmitted = (review: Review, providerRating?: number) => {
    if (providerRating !== undefined) {
      setProvidersList((prev) =>
        prev.map((p) =>
          p.id === review.providerId ? { ...p, rating: providerRating } : p
        )
      );
    }
  };

  const handleAuthSuccess = (user: User) => {
    setCurrentUser(user);
    setAuthModalOpen(false);
    setAuthError("");
    // Refresh user-scoped bookings and stats
    api.getBookings().then((res) => { if (res.bookings) setBookingsList(res.bookings); }).catch(() => {});
    api.getStats().then((res) => { if (res.stats) setStats(res.stats); }).catch(() => {});
    // Direct user according to their actual authenticated role
    if (user.role === "admin") {
      setView("admin");
    } else if (user.role === "artisan" || user.role === "provider") {
      setView("pro");
    } else {
      setView("customer");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setView("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOnboardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!onboardName || !onboardTrade) return;
    try {
      const res = await api.onboardProvider({
        name: onboardName,
        trade: onboardTrade,
        category: onboardTrade,
        phone: onboardPhone,
        area: onboardArea,
        price: Math.round(Number(onboardPrice) / 10) || 35,
        bio: onboardBio || `Experienced in ${onboardTrade}.`,
        status: "pending",
      });
      setProvidersList((prev) => [...prev, res.provider]);
      setOnboardModalOpen(false);
      alert(`Application received for ${onboardName}! An administrator will review your credentials in the verification queue.`);
    } catch (err) {
      alert("Failed to submit onboarding application.");
    }
  };

  return (
    <>
      <Header
        go={go}
        currentUser={currentUser}
        onOpenAuth={() => { setAuthError(""); setAuthTab("login"); setAuthModalOpen(true); }}
        onLogout={handleLogout}
      />

      {view === "home" ? (
        <Home
          go={go}
          providersList={providersList}
          onSelectProvider={(p) => {
            setSelectedProvider(p);
            go("provider");
          }}
        />
      ) : view === "explore" ? (
        <Explore
          go={go}
          providersList={providersList}
          categoriesList={categoriesList}
          onSelectProvider={(p) => {
            setSelectedProvider(p);
            go("provider");
          }}
        />
      ) : view === "provider" ? (
        <ProviderProfile
          go={go}
          provider={selectedProvider}
          onStartBooking={handleStartBooking}
        />
      ) : view === "booking" ? (
        <Booking
          go={go}
          provider={selectedProvider}
          selectedServiceName={selectedServiceName}
          currentUser={currentUser}
          onBookingCreated={handleBookingCreated}
        />
      ) : view === "customer" ? (
        <CustomerDashboard
          go={go}
          currentUser={currentUser}
          bookingsList={bookingsList}
          providersList={providersList}
          onOpenAuth={() => { setAuthError(""); setAuthTab("login"); setAuthModalOpen(true); }}
          onLogout={handleLogout}
          onBookingStatusUpdated={handleBookingStatusUpdated}
          onReviewSubmitted={handleReviewSubmitted}
        />
      ) : view === "pro" ? (
        <ProDashboard
          go={go}
          currentUser={currentUser}
          providersList={providersList}
          bookingsList={bookingsList}
          categoriesList={categoriesList}
          onBookingStatusUpdated={handleBookingStatusUpdated}
          onProviderUpdated={handleProviderUpdated}
          onOpenAuth={() => { setAuthError(""); setAuthTab("login"); setAuthModalOpen(true); }}
          onLogout={handleLogout}
        />
      ) : (
        <AdminDashboard
          go={go}
          currentUser={currentUser}
          providersList={providersList}
          bookingsList={bookingsList}
          categoriesList={categoriesList}
          stats={stats}
          onProviderVerified={handleProviderVerified}
          onCategoryUpdated={handleCategoryUpdated}
          onCategoryCreated={handleCategoryCreated}
          onOpenAuth={() => { setAuthError(""); setAuthTab("login"); setAuthModalOpen(true); }}
          onLogout={handleLogout}
        />
      )}

      <Footer go={go} onOpenOnboarding={() => setOnboardModalOpen(true)} />

      {/* Account Authentication & Registration Modal */}
      {authModalOpen && (
        <AuthModal
          close={() => setAuthModalOpen(false)}
          onSuccess={handleAuthSuccess}
          defaultTab={authTab}
          initialRole={authRole}
          initialError={authError}
        />
      )}

      {/* Provider Onboarding Modal */}
      {onboardModalOpen && (
        <Modal title="Become a ServePoint Provider" close={() => setOnboardModalOpen(false)}>
          <form onSubmit={handleOnboardSubmit}>
            <div className="form-grid">
              <label className="full">
                Business / Artisan Name
                <input
                  required
                  value={onboardName}
                  onChange={(e) => setOnboardName(e.target.value)}
                  placeholder="e.g. Accra Quality Paint & Decor"
                />
              </label>
              <label>
                Primary Trade
                <select
                  value={onboardTrade}
                  onChange={(e) => setOnboardTrade(e.target.value)}
                >
                  <option>Carpentry & Woodwork</option>
                  <option>Plumbing</option>
                  <option>Electrical Services</option>
                  <option>Painting & Wall Finishing</option>
                  <option>Masonry & Construction</option>
                  <option>Cleaning & Home Care</option>
                  <option>Appliance & Gadget Repairs</option>
                  <option>Air Conditioning & Ventilation</option>
                  <option>Home Installation & Assembly</option>
                </select>
              </label>
              <label>
                Contact Phone
                <input
                  required
                  value={onboardPhone}
                  onChange={(e) => setOnboardPhone(e.target.value)}
                  placeholder="+233 24 000 0000"
                />
              </label>
              <label>
                Service Area
                <input
                  value={onboardArea}
                  onChange={(e) => setOnboardArea(e.target.value)}
                  placeholder="e.g. Spintex, East Legon"
                />
              </label>
              <label>
                Starting Rate (GH₵)
                <input
                  value={onboardPrice}
                  onChange={(e) => setOnboardPrice(e.target.value)}
                  placeholder="350"
                />
              </label>
              <label className="full">
                Professional Bio & Years of Experience
                <textarea
                  value={onboardBio}
                  onChange={(e) => setOnboardBio(e.target.value)}
                  placeholder="Tell us about your background, tools, and craftsmanship..."
                />
              </label>
            </div>
            <div className="modal-actions">
              <button type="button" onClick={() => setOnboardModalOpen(false)}>
                Cancel
              </button>
              <button type="submit" className="primary-button">
                Submit Application <Icon name="arrow" />
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
