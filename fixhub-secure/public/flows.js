/* ServePoint Ghana — PART 5: app logic B (booking, tracking, payment, history, AI chat). Extracted from index.html; loads after app.js. */
/* ---------- booking flow ---------- */
let draft = S.draft || null;
function ensureLoggedInForBooking() {
  const signedIn = !!(Auth && typeof Auth.googleUid === "function" && Auth.googleUid()) && !!(S && S.profile);
  if (!signedIn) {
    toast("Please sign in with Google before booking a service.");
    show("account");
    return false;
  }
  if (S.profile.role !== "customer") {
    toast("Artisan accounts can apply for matching customer requests, not create bookings.");
    return false;
  }
  return true;
}
function beginButtonBusy(button, label) {
  if (!button || button.disabled) return () => {};
  const contents = button.innerHTML;
  button.disabled = true;
  button.setAttribute("aria-busy", "true");
  button.classList.add("is-loading");
  button.textContent = label;
  let restored = false;
  return () => {
    if (restored) return;
    restored = true;
    button.innerHTML = contents;
    button.disabled = false;
    button.removeAttribute("aria-busy");
    button.classList.remove("is-loading");
  };
}
async function withButtonBusy(button, label, action) {
  if (button && button.disabled) return;
  const restore = beginButtonBusy(button, label);
  try { return await action(); }
  finally { restore(); }
}
function startBooking(serviceId) {
  if (!ensureLoggedInForBooking()) return;
  draft = { serviceId, desc: "", area: (S.homeArea || AREAS[0]), addr: "", date: new Date().toISOString().slice(0, 10), slot: SLOTS[1], voiceSecs: 0, photo: null, voiceUrl: null };
  S.draft = draft; persist();
  fillBook1();
  show("book1");
}
function svc(id) { return SERVICES.find(s => s.id === id); }
function fillBook1() {
  const s = svc(draft.serviceId);
  document.getElementById("book1Title").textContent = "Book " + s.name;
  document.getElementById("book1Summary").innerHTML =
    `<div class="flex items-center gap-3">
      <span class="w-12 h-12 rounded-full grid place-items-center flex-none ${tintCls(s)}">${svcIcon(s, "w-6 h-6")}</span>
      <div class="flex-1"><p class="font-display font-extrabold f16">${s.name}</p><p class="f12h text-ink-soft">${s.blurb}</p></div>
      <div class="text-right"><p class="f11 text-ink-soft">EST. TOTAL</p><p class="font-display font-extrabold f18 text-trust-deep">${gh(s.base + TRANSPORT)}</p></div>
    </div>`;
  document.getElementById("jobDesc").value = draft.desc || "";
  const area = document.getElementById("areaSelect");
  area.innerHTML = areaOptions(draft.area);
  document.getElementById("addrInput").value = draft.addr || "";
  document.getElementById("dateInput").value = draft.date;
  document.getElementById("dateInput").min = new Date().toISOString().slice(0, 10);
  const row = document.getElementById("slotRow");
  row.innerHTML = "";
  SLOTS.forEach(sl => {
    const b = document.createElement("button");
    const on = sl === draft.slot;
    b.className = "flex-none px-4 py-2.5 rounded-full f13h font-bold mh44 " + (on ? "bg-trust text-white" : "bg-slate-100 text-ink-soft");
    b.textContent = sl;
    b.onclick = () => { draft.slot = sl; fillSlots(); };
    row.appendChild(b);
  });
  updateVoiceUI();
  if (draft.photo) { const p = document.getElementById("photoPreview"); p.src = draft.photo; p.hidden = false; document.getElementById("photoStatus").textContent = "Photo attached"; }
}
function fillSlots() {
  const row = document.getElementById("slotRow");
  [...row.children].forEach(b => {
    const on = b.textContent === draft.slot;
    b.className = "flex-none px-4 py-2.5 rounded-full f13h font-bold mh44 " + (on ? "bg-trust text-white" : "bg-slate-100 text-ink-soft");
  });
}
["jobDesc", "areaSelect", "addrInput", "dateInput"].forEach(id => {
  document.getElementById(id === "areaSelect" ? "areaSelect" : id).addEventListener("input", (e) => {
    if (!draft) return;
    if (id === "jobDesc") draft.desc = e.target.value;
    if (id === "areaSelect") draft.area = e.target.value;
    if (id === "addrInput") draft.addr = e.target.value;
    if (id === "dateInput") draft.date = e.target.value;
    S.draft = draft; persist();
  });
});
function priceOf(serviceId, senior) {
  const s = svc(serviceId);
  const discount = senior ? Math.round(s.base * SENIOR_RATE) : 0;
  return { service: s.base, transport: TRANSPORT, discount, total: s.base + TRANSPORT - discount };
}
document.getElementById("toStep2Btn").onclick = () => {
  if (!ensureLoggedInForBooking()) return;
  if (!draft.addr.trim()) { toast("Add your street / landmark so the artisan finds you"); document.getElementById("addrInput").focus(); return; }
  if (!draft.date) { toast("Pick a preferred day"); return; }
  S.draft = draft; persist();
  const s = svc(draft.serviceId);
  const p = priceOf(draft.serviceId, S.senior);
  document.getElementById("book2Summary").innerHTML =
    `<div class="flex items-center gap-3">
      <span class="w-12 h-12 rounded-full grid place-items-center flex-none ${tintCls(s)}">${svcIcon(s, "w-6 h-6")}</span>
      <div><p class="font-display font-extrabold f16">${s.name}</p>
      <p class="f12h text-ink-soft">${draft.area} · ${draft.addr}</p>
      <p class="f12h text-ink-soft">${draft.date} · ${draft.slot}${draft.voiceSecs ? " · voice note (" + draft.voiceSecs + "s)" : ""}${draft.photo ? " · photo attached" : ""}</p></div>
    </div>${draft.desc ? `<p class="f13h mt-2 bg-canvas rounded-xl p-2.5 border border-line">“${escapeHtml(draft.desc)}”</p>` : ""}`;
  document.getElementById("book2Prices").innerHTML =
    row2("Service fee (" + s.name + ")", gh(p.service)) +
    row2("Transportation", gh(p.transport)) +
    (p.discount ? row2("Senior discount (10%)", "−" + gh(p.discount), true) : "") +
    `<div class="flex justify-between font-display font-extrabold f16 pt-1"><span>Total</span><span class="text-trust-deep">${gh(p.total)}</span></div>`;
  show("book2");
};
function row2(k, v, green) {
  return `<div class="flex justify-between"><span class="text-ink-soft">${k}</span><span class="font-bold ${green ? "text-trust" : ""}">${v}</span></div>`;
}
function escapeHtml(s) { return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;"); }
document.getElementById("dispatchBtn").onclick = async (event) => withButtonBusy(event.currentTarget, "Posting request…", async () => {
  if (!ensureLoggedInForBooking()) return;
  if (!LIVE_DB) { toast("Backend not connected yet — add your Supabase keys in public/config.js, then reload"); return; }
  const p = priceOf(draft.serviceId, S.senior);
  const savedDraft = draft;
  const g = Auth.googleUid();
  const asOpen = !!(g && S.profile && S.profile.role === "customer");
  const b = {
    id: "FX-" + Math.floor(1000 + Math.random() * 9000),
    serviceId: draft.serviceId, desc: draft.desc, area: draft.area, addr: draft.addr,
    date: draft.date, slot: draft.slot, senior: S.senior,
    service: p.service, transport: p.transport, discount: p.discount, total: p.total,
    artisanId: null, tech: null, techRating: null, techJobs: null,
    status: "open", step: 0, etaMin: null, prog: 0, offRoute: false, method: null,
    createdAt: Date.now(), voiceSecs: draft.voiceSecs, hasPhoto: !!draft.photo,
    customerId: asOpen ? g : null
  };
  S.bookings.unshift(b);
  S.activeId = asOpen ? null : b.id;
  S.draft = null; draft = null;
  persist();
  try { await Backend.save(b); }
  catch (e) {
    S.bookings = S.bookings.filter(x => x.id !== b.id);
    S.activeId = null;
    S.draft = savedDraft;
    draft = savedDraft;
    persist();
    toast("Could not save your request. Check your connection and try again.");
    return;
  }
  if (asOpen) {
    toast("Request posted! Matching artisans have been notified.");
    show("history");
  }
});

/* ---------- voice note + photo ---------- */
let recorder = null, recChunks = [], recTimer = null, recSecs = 0;
const voiceBtn = document.getElementById("voiceBtn");
voiceBtn.onclick = async () => {
  if (recorder) { stopRec(); return; }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recorder = new MediaRecorder(stream);
    recChunks = []; recSecs = 0;
    recorder.ondataavailable = (e) => recChunks.push(e.data);
    recorder.onstop = () => {
      stream.getTracks().forEach(tr => tr.stop());
      const blob = new Blob(recChunks, { type: recorder.mimeType || "audio/webm" });
      const url = URL.createObjectURL(blob);
      if (draft) { draft.voiceSecs = recSecs; draft.voiceUrl = url; S.draft = draft; persist(); }
      const pb = document.getElementById("voicePlayback");
      pb.src = url; pb.hidden = false;
      recorder = null;
      updateVoiceUI();
    };
    recorder.start();
    recTimer = setInterval(() => { recSecs++; updateVoiceUI(true); }, 1000);
    updateVoiceUI(true);
  } catch (e) { toast("Microphone blocked — describe the issue in words instead"); }
};
function stopRec() { if (recorder) recorder.stop(); clearInterval(recTimer); }
function updateVoiceUI(active) {
  const on = !!recorder || (draft && draft.voiceSecs);
  document.getElementById("voiceIcon").innerHTML = recorder
    ? '<span class="rec-dot"></span>'
    : '<svg class="w-5 h-5 text-impact-deep" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 19v3"/></svg>';
  document.getElementById("voiceLabel").textContent = recorder ? ("Recording… " + recSecs + "s — tap to stop") : "Tap to Speak";
  document.getElementById("voiceStatus").textContent = recorder ? "Listening…" : (draft && draft.voiceSecs ? "Saved (" + draft.voiceSecs + "s)" : "No recording");
}
document.getElementById("photoInput").addEventListener("change", (e) => {
  const f = e.target.files[0];
  if (!f) return;
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    const k = Math.min(1, 480 / Math.max(img.width, img.height));
    c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
    c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
    const url = c.toDataURL("image/jpeg", 0.7);
    if (draft) { draft.photo = url; S.draft = draft; persist(); }
    const p = document.getElementById("photoPreview");
    p.src = url; p.hidden = false;
    document.getElementById("photoStatus").textContent = "Photo attached";
    URL.revokeObjectURL(img.src);
  };
  img.src = URL.createObjectURL(f);
});

/* ---------- booking status tracking ---------- */
const STEPS = ["Booking confirmed", "Artisan on the way", "Arrives & inspects", "Repair in progress"];
function activeBooking() { return S.bookings.find(b => b.id === S.activeId && ["dispatched", "enroute", "arrived", "working"].includes(b.status)) || null; }
const Track = {
  progOf(b) {
    if (typeof b.prog === "number") return Math.min(1, Math.max(0, b.prog));
    return (b.status === "arrived" || b.status === "working") ? 1 : b.status === "enroute" ? 0.55 : 0.2;
  },
  tick(force) {
    const b = activeBooking();
    if (!b) return;
    if (!force && document.getElementById("view-track").hidden) return;
    renderTrack();
  }
};
const acceptedArtisanContacts = new Map();
function acceptedArtisanContact(booking) {
  if (!booking || !booking.customerId) return Promise.resolve(null);
  if (!acceptedArtisanContacts.has(booking.id)) {
    const request = Backend.acceptedArtisanContact(booking.id).then((contact) => {
      if (!contact) acceptedArtisanContacts.delete(booking.id);
      return contact;
    }).catch((error) => {
      acceptedArtisanContacts.delete(booking.id);
      throw error;
    });
    acceptedArtisanContacts.set(booking.id, request);
  }
  return acceptedArtisanContacts.get(booking.id);
}
function renderTrack() {
  const b = activeBooking();
  document.getElementById("trackEmpty").hidden = !!b;
  document.getElementById("trackBody").hidden = !b;
  if (!b) return;
  const dispName = b.tech || "Waiting for an artisan";
  const first = String(dispName).split(" ")[0];
  const rating = b.techRating != null ? Number(b.techRating).toFixed(1) : "—";
  const jobs = b.techJobs != null ? b.techJobs : "—";
  const arrived = b.status === "arrived" || b.status === "working";
  const off = !!b.offRoute && !arrived;
  if (b.payRef && b.customerId && !b._checkingPayment && b.paymentStatus !== "confirmed") {
    b._checkingPayment = true;
    Backend.apiGet("/api/bookings/payment-status?bookingId=" + encodeURIComponent(b.id)).then((state) => {
      b.paymentStatus = state.payment_status;
      b.payoutStatus = state.payout_status;
      persist();
      renderTrack();
    }).catch((error) => {
      console.error("[payment status]", error.message);
    }).finally(() => { b._checkingPayment = false; });
  }
  document.getElementById("trackRef").textContent = b.id + " · " + svc(b.serviceId).name;
  document.getElementById("liveBanner").textContent = !b.artisanId
    ? "Waiting for a matching artisan to accept"
    : arrived ? first + " has arrived" : off ? first + " is updating their route" : first + " accepted this request";
  document.getElementById("etaText").textContent = arrived ? "Arrived" : (b.etaMin ? "ETA " + b.etaMin + " min" : "ETA not provided");
  document.getElementById("routeText").textContent = off
    ? "The artisan has reported a route update."
    : b.artisanId ? "Your assigned artisan will provide any travel updates here." : "Your request is waiting for an artisan with the right trade.";
  const alert = document.getElementById("routeAlert");
  if (alert) {
    alert.hidden = !off;
    if (off) document.getElementById("routeAlertText").textContent = first + " reported a route change.";
  }
  const pill = document.getElementById("offPill");
  if (pill) {
    pill.textContent = arrived ? "Arrived" : off ? "Route update" : b.artisanId ? "Accepted" : "Waiting";
    pill.className = "offpill " + (off ? "off" : "live");
  }
  const meta = document.getElementById("gpsMeta");
  if (meta) {
    if (!b.artisanId) meta.textContent = "No artisan assigned yet";
    else meta.textContent = "GPS tracking is not available yet";
  }
  document.getElementById("techAvatar").textContent = b.artisanId ? String(dispName)[0].toUpperCase() : "?";
  document.getElementById("techName").textContent = dispName;
  document.getElementById("techTitle").textContent = b.artisanId ? "Accepted artisan" : "No artisan assigned yet";
  document.getElementById("techRating").textContent = rating;
  document.getElementById("techJobs").textContent = jobs;
  const callBtn = document.getElementById("callTechBtn");
  const waBtn = document.getElementById("waTechBtn");
  callBtn.textContent = b.artisanId ? "Loading artisan contact…" : "Available after acceptance";
  callBtn.removeAttribute("href");
  callBtn.hidden = !b.artisanId;
  waBtn.hidden = !b.artisanId;
  if (b.artisanId && b.customerId) {
    acceptedArtisanContact(b).then((contact) => {
      if (S.activeId !== b.id) return;
      if (!contact) { callBtn.textContent = "Artisan contact unavailable"; return; }
      callBtn.href = "tel:" + contact.phone;
      callBtn.textContent = "Call " + first + " Now";
      waBtn.hidden = false;
      waBtn.href = "https://wa.me/" + contact.phone.replace(/\D/g, "") + "?text=" + encodeURIComponent("Hello " + first + ", this is about my ServePoint booking " + b.id);
    }).catch(() => { if (S.activeId === b.id) callBtn.textContent = "Could not load artisan contact"; });
  }
  const idx = b.status === "dispatched" ? 1 : b.status === "enroute" ? 1 : b.status === "arrived" ? 2 : 3;
  const box = document.getElementById("tlSteps");
  box.innerHTML = "";
  STEPS.forEach((s, i) => {
    const done = i <= idx, cur = i === idx;
    const row = document.createElement("div");
    row.className = "flex items-start gap-3";
    row.innerHTML = `<span class="tl-dot ${done ? "bg-trust text-white" : "bg-slate-200 text-slate-400"}">
        ${done
          ? '<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M20 6L9 17l-5-5"/></svg>'
          : '<span class="w-2 h-2 rounded-full bg-current"></span>'}
      </span>
      <span class="pt-1"><span class="block font-bold f14 ${done ? "" : "text-slate-400"}">${s}</span>
      ${cur ? '<span class="block f12 text-trust font-bold">In progress</span>' : ""}</span>`;
    box.appendChild(row);
  });
  document.getElementById("tlFill").style.height = (idx / (STEPS.length - 1)) * 100 + "%";
  document.getElementById("tlSteps").parentElement.style.setProperty("--x", 1);
  const completeBtn = document.getElementById("confirmJobCompleteBtn");
  if (completeBtn) {
    completeBtn.hidden = !(b.customerId && b.artisanId && arrived && b.paymentStatus === "confirmed");
    completeBtn.disabled = b.payoutStatus === "processing" || b.payoutStatus === "paid";
    completeBtn.textContent = b.payoutStatus === "processing" ? "Payout processing…" :
      b.payoutStatus === "paid" ? "Payout sent" : "Confirm job complete · release artisan payment";
  }
  try {
    const prog = Track.progOf(b);
    const path = document.getElementById("routePath");
    if (path && path.getTotalLength) {
      const L = path.getTotalLength();
      const pt = path.getPointAtLength(L * prog);
      const pt2 = path.getPointAtLength(Math.min(L, L * prog + 2));
      const car = document.getElementById("carMarker");
      if (car) {
        const ox = off ? 16 : 0, oy = off ? -12 : 0;
        car.setAttribute("transform", "translate(" + (pt.x + ox) + "," + (pt.y + oy) + ") rotate(" + (Math.atan2(pt2.y - pt.y, pt2.x - pt.x) * 180 / Math.PI) + ")");
        car.style.opacity = off ? "0.85" : "1";
      }
    }
    const mm = document.getElementById("mapEtaMin");
    if (mm) mm.textContent = arrived ? "Arrived" : (b.etaMin ? "about " + b.etaMin + " min" : "ETA not provided");
  } catch (e) {}
}
function bindArtisanContact(link, booking, name) {
  if (!booking.customerId || !booking.artisanId) {
    link.removeAttribute("href");
    link.textContent = "Artisan not assigned";
    return;
  }
  link.removeAttribute("href");
  link.textContent = "Loading artisan contact…";
  acceptedArtisanContact(booking).then((contact) => {
    if (!link.isConnected) return;
    if (!contact) { link.textContent = "Artisan contact unavailable"; return; }
    link.href = "tel:" + contact.phone;
    link.textContent = "Call " + name;
  }).catch(() => {
    if (link.isConnected) link.textContent = "Could not load artisan contact";
  });
}
document.getElementById("refreshEtaBtn").onclick = async () => {
  try {
    const bookings = await Backend.list();
    S.bookings = bookings;
    persist();
    Track.tick(true);
    toast("Booking status refreshed.");
  } catch (error) { toast("Could not refresh booking status."); }
};
document.getElementById("payNowBtn").onclick = () => show("pay");
document.getElementById("cancelBtn").onclick = () => { document.getElementById("cancelDrawer").hidden = false; };
document.getElementById("confirmCancelBtn").onclick = async (event) => withButtonBusy(event.currentTarget, "Cancelling…", async () => {
  const b = activeBooking();
  document.getElementById("cancelDrawer").hidden = true;
  if (!b) return;
  const previousStatus = b.status;
  const previousActiveId = S.activeId;
  b.status = "cancelled";
  S.activeId = null;
  persist();
  try { await Backend.save(b); }
  catch (e) {
    b.status = previousStatus;
    S.activeId = previousActiveId;
    persist();
    toast("Could not sync the cancellation. Check your connection and try again.");
    return;
  }
  toast("Booking cancelled — free of charge");
  show("history");
});
document.getElementById("reschedBtn").onclick = () => {
  document.getElementById("schedDrawer").hidden = false;
  const r = document.getElementById("reschedSlots");
  r.innerHTML = "";
  SLOTS.forEach(sl => {
    const x = document.createElement("button");
    x.className = "flex-none px-4 py-2.5 rounded-full f13h font-bold mh44 bg-slate-100";
    x.textContent = sl;
    x.onclick = () => { [...r.children].forEach(c => c.classList.replace("bg-trust", "bg-slate-100") || c.classList.remove("text-white")); x.classList.add("bg-trust", "text-white"); r.dataset.pick = sl; };
    r.appendChild(x);
  });
};
document.getElementById("saveReschedBtn").onclick = async (event) => withButtonBusy(event.currentTarget, "Saving time…", async () => {
  const b = activeBooking();
  if (!b) return;
  const d = document.getElementById("reschedDate").value;
  const sl = document.getElementById("reschedSlots").dataset.pick;
  if (!d || !sl) { toast("Pick a day and a time slot"); return; }
  const previousDate = b.date, previousSlot = b.slot;
  b.date = d; b.slot = sl;
  persist();
  try { await Backend.save(b); }
  catch (e) {
    b.date = previousDate; b.slot = previousSlot; persist();
    toast("Could not save the new time. Check your connection and try again.");
    return;
  }
  document.getElementById("schedDrawer").hidden = true;
  toast("Rescheduled to " + d + ", " + sl);
});

/* ---------- payment ---------- */
function payMethod() {
  const el = document.querySelector('input[name="paymethod"]:checked');
  return el ? el.value : "MTN Mobile Money";
}
function renderPay() {
  const b = S.bookings.find(x => x.id === S.activeId) || S.bookings.find(x => ["paid", "completed"].includes(x.status));
  if (!b) { show("history"); return; }
  document.getElementById("payLines").innerHTML =
    row2("Service fee", gh(b.service)) +
    row2("Transportation", gh(b.transport)) +
    (b.discount ? row2("Senior discount (10%)", "−" + gh(b.discount), true) : "") +
    row2("Escrow protection", "Free", true);
  document.getElementById("payTotal").textContent = gh(b.total);
  updatePayBtn();
}
document.querySelectorAll('input[name="paymethod"]').forEach(el => el.addEventListener("change", updatePayBtn));
function updatePayBtn() {
  const b = S.bookings.find(x => x.id === S.activeId) || S.bookings[0];
  const m = payMethod();
  const short = m === "MTN Mobile Money" ? "MTN MoMo" : m === "Telecel Cash" ? "Telecel" : "Cash";
  document.getElementById("payBtn").textContent = m === "Cash to Artisan"
    ? "Confirm — I'll pay " + gh(b ? b.total : 0) + " in cash"
    : "Pay " + gh(b ? b.total : 0) + " with " + short;
}
document.getElementById("payBtn").onclick = async (event) => {
  const b = S.bookings.find(x => x.id === S.activeId);
  if (!b) return;
  if (!b.artisanId || !["arrived", "working"].includes(b.status)) {
    toast("Payment is available after your accepted artisan arrives.");
    return;
  }
  const m = payMethod();
  if (m === "Cash to Artisan") {
    await withButtonBusy(event.currentTarget, "Saving booking…", () => completeBooking(b, m));
    return;
  }
  const paystackReady = typeof window !== "undefined" && !!window.PaystackPop && !!(CFG.paystackKey || "").trim() && String(CFG.paystackKey).indexOf("PASTE") !== 0 && String(CFG.paystackKey).indexOf("YOUR_") !== 0;
  if (!paystackReady) { toast("Payment not connected yet — add your Paystack public key in public/config.js, then reload"); return; }
  const session = Auth.load() || {};
  const email = session.email || ("customer-" + String(Auth.uid() || "guest").replace(/[^a-zA-Z0-9]/g, "") + "@servepoint.gh");
  const amountGhs = Number(b.total);
  const amountPesewas = Math.round(amountGhs * 100);
  if (!Number.isFinite(amountPesewas) || amountPesewas < 1) { toast("Invalid payment amount — please contact support"); return; }
  const restorePayButton = beginButtonBusy(event.currentTarget, "Waiting for payment…");
  const reference = b.payRef || (b.id + "-" + Date.now());
  b.payRef = reference;
  b.method = m;
  b.paymentStatus = "pending";
  try { await Backend.save(b); }
  catch (error) {
    restorePayButton();
    toast("Could not prepare the payment. Check your connection and try again.");
    return;
  }
  let callbackReceived = false;
  let handler;
  try { handler = window.PaystackPop.setup({
    key: String(CFG.paystackKey).trim(),
    email,
    amount: amountPesewas,
    currency: "GHS",
    ref: reference,
    metadata: { booking: b.id, service: b.serviceId, method: m, total: amountGhs },
    channels: ["card", "bank", "mobile_money"],
    callback: (resp) => {
      callbackReceived = true;
      if (!resp || resp.reference !== reference) {
        restorePayButton();
        toast("Payment reference could not be verified.");
        return;
      }
      toast("Payment submitted. Waiting for Paystack server confirmation…");
      pollPaymentConfirmation(b).finally(restorePayButton);
    },
    onClose: () => {
      restorePayButton();
      if (!callbackReceived) toast("Payment window closed. Check your booking status before trying again.");
    }
  }); handler.openIframe(); }
  catch (error) {
    restorePayButton();
    toast("Could not open Paystack checkout. Please try again.");
  }
};
async function pollPaymentConfirmation(booking) {
  for (let attempt = 0; attempt < 18; attempt++) {
    if (attempt) await new Promise((resolve) => window.setTimeout(resolve, 5000));
    try {
      const state = await Backend.apiGet("/api/bookings/payment-status?bookingId=" + encodeURIComponent(booking.id));
      booking.paymentStatus = state.payment_status;
      booking.payoutStatus = state.payout_status;
      persist();
      renderTrack();
      if (booking.paymentStatus === "confirmed") {
        toast("Payment verified. Funds will be released after you confirm the job is complete.");
        return true;
      }
    } catch (error) {
      toast(error.message || "Could not check payment status.");
      return false;
    }
  }
  toast("Payment is still being verified. Check your booking notifications shortly.");
  return false;
}
async function completeBooking(b, method) {
  b.status = method === "Cash to Artisan" ? "completed" : b.status;
  b.method = method;
  if (S.activeId === b.id) S.activeId = null;
  persist();
  try {
    await Backend.save(b);
  } catch (e) {
    toast(method === "Cash to Artisan"
      ? "Booking could not sync to the database. Check your connection and try again."
      : "Payment was received, but the booking could not sync. Check your connection and contact support.");
    show("history");
    return;
  }
  toast(method === "Cash to Artisan" ? "Booked — pay cash after inspection" : "Payment successful — held in escrow");
  show("history");
}
document.getElementById("confirmJobCompleteBtn").onclick = (event) => withButtonBusy(event.currentTarget, "Confirming…", async () => {
  const booking = activeBooking();
  if (!booking) return;
  try {
    const result = await Backend.apiPost("/api/bookings/complete", { bookingId: booking.id });
    booking.status = "completed";
    booking.payoutStatus = result.payoutStatus;
    S.activeId = null;
    persist();
    toast("Job completed. The artisan's 90% payout is processing.");
    show("history");
  } catch (error) {
    toast(error.message || "Could not confirm completion.");
  }
});

/* ---------- history ---------- */
function renderNotifications() {
  const box = document.getElementById("notificationsList");
  if (!box) return;
  if (!LIVE_DB || !Auth.googleUid()) {
    box.innerHTML = '<p class="f12 soft">Sign in to receive booking updates.</p>';
    return;
  }
  if (!APP_NOTIFICATIONS.length) {
    box.innerHTML = '<p class="f12 soft">No notifications yet. Updates will appear here for both customers and artisans.</p>';
    return;
  }
  box.innerHTML = APP_NOTIFICATIONS.map((notification) => `<button type="button" class="w-full text-left rounded-xl border border-line p-3 ${notification.read_at ? "bg-white" : "bg-trust-tint"}" data-notification-id="${escapeHtml(notification.id)}">
    <span class="block f13 font-bold">${escapeHtml(notification.message)}</span>
    <span class="block f11 soft mt-1">${escapeHtml(new Date(notification.created_at).toLocaleString())}${notification.read_at ? "" : " · New"}</span>
  </button>`).join("");
  box.querySelectorAll("[data-notification-id]").forEach((button) => {
    button.onclick = async () => {
      const item = APP_NOTIFICATIONS.find((n) => String(n.id) === button.dataset.notificationId);
      if (!item) return;
      try {
        await Backend.markNotificationsRead([item.id]);
        item.read_at = new Date().toISOString();
        updateNotificationBadge();
        renderNotifications();
        if (S.profile && S.profile.role === "artisan") show("home");
        else if (item.booking_id) {
          const bookings = await Backend.list();
          const booking = bookings.find((b) => b.id === item.booking_id);
          if (booking) {
            S.bookings = bookings;
            if (["enroute", "arrived", "working"].includes(booking.status)) S.activeId = booking.id;
            persist();
            show(["enroute", "arrived", "working"].includes(booking.status) ? "track" : "history");
          }
        }
      } catch (error) {
        toast("Could not update this notification.");
      }
    };
  });
}
const knownNotificationIds = new Set();
async function pollNotifications(showNew) {
  if (!LIVE_DB || !Auth.googleUid()) return;
  try {
    const notifications = await Backend.notifications();
    const fresh = notifications.filter((notification) => !knownNotificationIds.has(String(notification.id)));
    notifications.forEach((notification) => knownNotificationIds.add(String(notification.id)));
    APP_NOTIFICATIONS = notifications;
    updateNotificationBadge();
    if (S.profile && S.profile.role === "customer") {
      const bookings = await Backend.list();
      S.bookings = bookings;
      persist();
      if (!document.getElementById("view-track").hidden) renderTrack();
      if (!document.getElementById("view-home").hidden) renderHomeExtras();
    } else if (S.profile && S.profile.role === "artisan" && !document.getElementById("view-home").hidden) {
      renderJobs();
    }
    if (showNew) fresh.filter((notification) => !notification.read_at).forEach((notification) => toast(notification.message));
    if (!document.getElementById("view-history").hidden) renderNotifications();
  } catch (error) {
    console.error("[notifications] Could not refresh:", error.message);
  }
}
setInterval(() => pollNotifications(true), 20000);
async function renderHistory() {
  document.getElementById("backendChip").textContent = LIVE_DB ? "Live Supabase" : "Not connected";
  document.getElementById("histSub").textContent = LIVE_DB ? "Synced jobs" : "Add keys in public/config.js to connect";
  const all = await Backend.list();
  await pollNotifications(false);
  renderNotifications();
  const a = all.find(b => b.id === S.activeId && ["dispatched", "enroute", "arrived", "working"].includes(b.status));
  const box = document.getElementById("activeJobCard");
  box.innerHTML = "";
  if (!LIVE_DB) {
    box.innerHTML = `<div class="bg-white border border-line rounded-2xl shadow-card p-4"><p class="font-display font-extrabold f16">Backend not connected</p><p class="f13 text-ink-soft mt-1">Your bookings will sync here once the app is connected. In <span class="font-bold">public/config.js</span>, paste your Supabase URL + anon key and your Paystack public key, then reload.</p></div>`;
    const pl = document.getElementById("pastList");
    if (pl) pl.innerHTML = "";
    const ow = document.getElementById("openWrap");
    if (ow) ow.hidden = true;
    return;
  }
  if (a) {
    const aname = a.tech || "Assigned artisan";
    const afirst = String(aname).split(" ")[0];
    const d = document.createElement("div");
    d.className = "bg-ink text-white rounded-2xl shadow-card p-4";
    d.innerHTML = `<div class="flex items-center gap-2"><span class="live-dot"></span>
        <p class="font-display font-bold f15 flex-1">${svc(a.serviceId).name} · ${a.id}</p>
        <span class="font-display font-extrabold">${gh(a.total)}</span></div>
      <p class="f13 text-white/80 mt-1">${escapeHtml(aname)} · ${a.etaMin ? "ETA " + a.etaMin + " min · " : ""}${escapeHtml(a.date || "")}, ${escapeHtml(a.slot || "")}</p>
      <div class="grid grid-cols-2 gap-2 mt-3">
        <button class="bg-white text-ink font-display font-bold f14 rounded-xl py-3 mh50" data-goto="track">Track ${afirst}</button>
        <a class="bg-trust text-white font-display font-bold f14 rounded-xl py-3 mh50 flex items-center justify-center" data-artisan-contact></a>
      </div>`;
    box.appendChild(d);
    bindArtisanContact(d.querySelector("[data-artisan-contact]"), a, afirst);
  }
  await renderOpenMine(all);
  const past = all.filter(b => ["paid", "completed", "cancelled"].includes(b.status));
  const list = document.getElementById("pastList");
  list.innerHTML = "";
  if (!past.length) list.innerHTML = '<p class="f14 text-ink-soft">No completed jobs yet.</p>';
  past.slice(0, 20).forEach(b => {
    const s = svc(b.serviceId) || { name: b.serviceId, tint: "#F1F5F9", color: "#4A5268", icon: "" };
    const tech = b.tech || "Artisan not assigned";
    const el = document.createElement("div");
    el.className = "bg-white border border-line rounded-2xl shadow-card p-4";
    el.innerHTML = `<div class="flex items-center gap-3">
        <span class="w-11 h-11 rounded-full grid place-items-center flex-none ${tintCls(s)}">${svcIcon(s, "w-5 h-5")}</span>
        <div class="flex-1 min-w-0"><p class="font-display font-bold f15 truncate">${s.name}</p>
        <p class="f12 text-ink-soft">${b.date || ""} · ${gh(b.total || 0)} · ${b.method || "—"}</p>
        <p class="f12 text-ink-soft">${b.status === "cancelled" ? "Cancelled (free)" : "Done by " + tech + " · CID-checked"}</p></div>
        <span class="font-display font-extrabold f15">${gh(b.total || 0)}</span></div>
      <div class="grid grid-cols-2 gap-2 mt-3">
        <button class="rounded-xl border border-line font-bold f13h py-2.5 mh48" data-again="${b.serviceId}">Book Again</button>
        <a class="rounded-xl bg-trust-tint text-trust-deep font-bold f13h py-2.5 mh48 flex items-center justify-center" data-artisan-contact></a>
        ${b.status !== "cancelled" ? '<button class="rounded-xl border border-line font-bold f13h py-2.5 mh48 col-span-2" data-receipt>Print / Save receipt</button>' : ""}
        ${b.status === "completed" && b.method !== "Cash to Artisan" ? '<button class="rounded-xl border border-line font-bold f13h py-2.5 mh48 col-span-2" data-retry-payout>Check / retry artisan payout</button>' : ""}
      </div>`;
    el.querySelector("[data-again]").onclick = (e) => startBooking(e.currentTarget.dataset.again);
    bindArtisanContact(el.querySelector("[data-artisan-contact]"), b, "Again");
    const receiptButton = el.querySelector("[data-receipt]");
    if (receiptButton) receiptButton.onclick = () => showServiceReceipt(b);
    const payoutButton = el.querySelector("[data-retry-payout]");
    if (payoutButton) payoutButton.onclick = (event) => withButtonBusy(event.currentTarget, "Checking payout…", async () => {
      try {
        const result = await Backend.apiPost("/api/bookings/complete", { bookingId: b.id });
        b.payoutStatus = result.payoutStatus;
        persist();
        toast(result.payoutStatus === "paid" ? "Artisan payout is complete." :
          result.payoutStatus === "processing" ? "Artisan payout is processing." : "Payout status: " + result.payoutStatus);
      } catch (error) { toast(error.message || "Could not check or retry payout."); }
    });
    list.appendChild(el);
  });
}
function serviceReceiptMarkup(booking) {
  const service = svc(booking.serviceId);
  const name = service ? service.name : booking.serviceId;
  const fee = Number.isFinite(booking.service) ? booking.service : (service ? service.base : 0);
  const transport = Number.isFinite(booking.transport) ? booking.transport : Math.max(0, Number(booking.total) - fee + (Number(booking.discount) || 0));
  const discount = Number(booking.discount) || 0;
  const paymentStatus = booking.method === "Cash to Artisan"
    ? "Cash arranged with artisan"
    : booking.status === "completed" ? "Service completed" : "Payment confirmed";
  return `<div class="receipt-brand"><strong>ServePoint</strong><span>Service receipt</span></div>
    <p class="receipt-caption">Keep this receipt for your records.</p>
    <div class="receipt-facts">
      <div><span>Receipt / booking</span><strong>${escapeHtml(booking.payRef || booking.id)}</strong></div>
      <div><span>Service</span><strong>${escapeHtml(name)}</strong></div>
      <div><span>Artisan</span><strong>${escapeHtml(booking.tech || "To be assigned")}</strong></div>
      <div><span>Service date</span><strong>${escapeHtml(booking.date || "—")}</strong></div>
      <div><span>Payment method</span><strong>${escapeHtml(booking.method || "—")}</strong></div>
      <div><span>Status</span><strong>${paymentStatus}</strong></div>
    </div>
    <div class="receipt-line"><span>Service fee</span><strong>${gh(fee)}</strong></div>
    <div class="receipt-line"><span>Transportation</span><strong>${gh(transport)}</strong></div>
    ${discount ? `<div class="receipt-line"><span>Discount</span><strong>−${gh(discount)}</strong></div>` : ""}
    <div class="receipt-total"><span>Total</span><strong>${gh(booking.total)}</strong></div>
    <p class="receipt-footer">Thank you for choosing ServePoint.</p>`;
}
function showServiceReceipt(booking) {
  const previous = document.getElementById("receiptOverlay");
  if (previous) previous.remove();
  const overlay = document.createElement("section");
  overlay.id = "receiptOverlay";
  overlay.className = "receipt-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "Service receipt");
  overlay.innerHTML = `<div class="receipt-dialog">
    <div class="receipt-heading"><h2 class="font-display font-extrabold f18">Your receipt</h2><button type="button" class="receipt-close" data-receipt-close aria-label="Close receipt">Close</button></div>
    <div class="receipt-paper" id="receiptPaper">${serviceReceiptMarkup(booking)}</div>
    <button type="button" class="btn-dark mt-3 w-full font-display font-bold f14 rounded-2xl py-3.5 mh52" data-print-receipt>Print / Save PDF</button>
  </div>`;
  document.body.appendChild(overlay);
  overlay.querySelector("[data-receipt-close]").onclick = () => overlay.remove();
  overlay.addEventListener("click", (event) => { if (event.target === overlay) overlay.remove(); });
  overlay.querySelector("[data-print-receipt]").onclick = (event) => {
    const restore = beginButtonBusy(event.currentTarget, "Opening print dialog…");
    document.body.classList.add("printing-receipt");
    let timeout;
    const finish = () => {
      window.removeEventListener("afterprint", finish);
      window.clearTimeout(timeout);
      document.body.classList.remove("printing-receipt");
      restore();
    };
    window.addEventListener("afterprint", finish);
    timeout = window.setTimeout(finish, 120000);
    window.setTimeout(() => {
      try { window.print(); }
      catch (e) { finish(); toast("Could not open printing — try your browser menu"); }
    }, 50);
  };
}
/* ---------- open requests: artisans apply, customer picks ---------- */
async function renderOpenMine(all) {
  const wrap = document.getElementById("openWrap"), box = document.getElementById("openList");
  if (!wrap || !box) return;
  if (!LIVE_DB) { wrap.hidden = true; box.innerHTML = ""; return; }
  const mine = (all || []).filter(b => b.status === "open");
  if (!mine.length) { wrap.hidden = true; box.innerHTML = ""; return; }
  wrap.hidden = false;
  box.innerHTML = "";
  for (const b of mine.slice(0, 10)) {
    const s = svc(b.serviceId) || { name: b.serviceId, tint: "#F1F5F9", color: "#4A5268", icon: "" };
    const el = document.createElement("div");
    el.className = "bg-white border border-line rounded-2xl shadow-card p-4";
    el.innerHTML = `<div class="flex items-center gap-3">
      <span class="w-11 h-11 rounded-full grid place-items-center flex-none ${tintCls(s)}">${svcIcon(s, "w-5 h-5")}</span>
      <div class="flex-1 min-w-0"><p class="font-display font-bold f15 truncate">${s.name} · ${b.id}</p>
      <p class="f12 text-ink-soft">${b.date || ""} · ${b.slot || ""} · ${gh(b.total || 0)}</p></div>
      <span class="greenpill flex-none">Open</span></div>
      <div class="applicants mt-2 space-y-2"><p class="f12 soft">Checking applications…</p></div>`;
    box.appendChild(el);
    const list = el.querySelector(".applicants");
    let apps = [];
    try { apps = await Backend.applicants(b.id); } catch (e) { apps = []; }
    list.innerHTML = "";
    const pending = (apps || []).filter(x => x.status === "pending")
      .slice().sort((a, b) => ((Number(b.rating) || 0) - (Number(a.rating) || 0)) || ((Number(b.jobs) || 0) - (Number(a.jobs) || 0)));
    if (!pending.length) list.innerHTML = '<p class="f12 soft">No applications yet — artisans nearby have been notified.</p>';
    else list.innerHTML = '<p class="f11 soft">Sorted by rating — highest first</p>';
    pending.forEach((app, idx) => {
      const r = Number(app.rating) || 0;
      const row = document.createElement("div");
      row.className = "rounded-xl p-3 flex items-center gap-2 approw";
      row.innerHTML = `<span class="w-10 h-10 rounded-full btn-dark grid place-items-center font-display font-bold text-white flex-none">${escapeHtml(String(app.artisan_name || "A")[0]).toUpperCase()}</span>
        <span class="flex-1 min-w-0"><span class="block font-bold f14 truncate">${idx === 0 ? "★ " : ""}${escapeHtml(app.artisan_name || "Artisan")}</span>
        <span class="block f12 soft">${escapeHtml(app.trade || "General")} · ★ ${r ? r.toFixed(1) : "new"}${app.jobs ? " (" + app.jobs + " fixes)" : ""} · applied</span></span>
        <button class="f12 font-bold text-white rounded-full px-3 py-2 mh44 acceptbtn" data-act="accept">Accept</button>
        <button class="f12 font-bold rounded-full px-3 py-2 mh44 border border-line" data-act="decline">Pass</button>`;
      row.querySelector('[data-act="accept"]').onclick = (event) => withButtonBusy(event.currentTarget, "Accepting…", () => acceptApplication(app, b));
      row.querySelector('[data-act="decline"]').onclick = (event) => withButtonBusy(event.currentTarget, "Passing…", () => declineApplication(app));
      list.appendChild(row);
    });
  }
}
async function acceptApplication(app, b) {
  try {
    await Backend.setApplication(app.id, "accepted");
    b.artisanId = app.artisan_id;
    b.tech = app.artisan_name; b.techRating = Number(app.rating) || 5.0; b.techJobs = Number(app.jobs) || 0;
    b.status = "enroute"; b.etaMin = null; b.prog = 0.06; b.offRoute = false; b.step = 1;
    if (S.activeId === b.id || !S.activeId) S.activeId = b.id;
    persist();
    await Backend.save(b);
    toast(String(app.artisan_name).split(" ")[0] + " accepted! Tracking is live");
    renderHistory();
  } catch (e) { toast("Could not accept — check your connection"); }
}
async function declineApplication(app) {
  try {
    await Backend.setApplication(app.id, "declined");
    toast("Application passed");
    renderHistory();
  } catch (e) { toast("Could not update — check your connection"); }
}
/* ---------- AI assistant (Groq live, rule-based fallback) ---------- */
let diagPending = null, diagInit = false;
/* Groq key + instructions live server-side (src/persona.js + .env). */
const DIAG_SERVICE_CHIPS = [
  { label: "Cooling / AC", pick: "hvac", detail: "Cooling system issue" },
  { label: "Water / Pipes", pick: "plumbing", detail: "Leak or pipe-fitting issue" },
  { label: "Power / Wiring", pick: "electrical", detail: "Wiring or socket fault" },
  { label: "Cleaning", pick: "cleaning", detail: "Deep-clean recommended" },
  { label: "Woodwork", pick: "carpentry", detail: "Joinery repair needed" }
];
let groqMsgs = null;
function parseGroq(content) {
  try {
    const m = String(content || "").trim().match(/\{[\s\S]*\}\s*$/);
    if (m) return JSON.parse(m[0]);
  } catch (e) { /* fall through to raw text */ }
  return { reply: String(content || ""), service: null, detail: "" };
}
async function sendDiagServer(text) {
  /* Secure variant: the Groq key lives in the server .env — the browser
     only sends chat text to our own /api/chat. Returns true on answer. */
  if (!groqMsgs) groqMsgs = [];
  groqMsgs.push({ role: "user", content: text });
  const typing = diagTyping();
  try {
    const ctl = new AbortController();
    const timer = setTimeout(function () { ctl.abort(); }, 30000);
    let r;
    try {
      r = await fetch("/api/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: groqMsgs.slice(-12) }), signal: ctl.signal });
    } finally { clearTimeout(timer); }
    if (!r.ok) throw new Error("http-" + r.status);
    const p = await r.json();
    groqMsgs.push({ role: "assistant", content: p.reply || "" });
    typing.remove();
    diagBubble(escapeHtml(p.reply || "Hmm?"), "ai");
    if (p.service && svc(p.service)) { showIssue(p.service, p.detail || "Inspection recommended"); }
    else { diagChips(DIAG_SERVICE_CHIPS); }
    return true;
  } catch (e) { typing.remove(); return false; }
}
function matchSymptom(text) {
  const t = (text || "").toLowerCase();
  const has = (...ws) => ws.some(w => t.indexOf(w) !== -1);
  if (has("air condition", "aircon", " a/c", "ac ", "cooling", "not cooling", "isn't cooling", "isnt cooling", "no cold", "airflow", "air flow")) return "hvac";
  if (has("leak", "pipe", "tap", "toilet", "sink", "drain", "tank", "burst", "faucet", "sewage", "water")) return "plumbing";
  if (has("socket", "plug", "wire", "wiring", "spark", "power", "light", "bulb", "switch", "breaker", "shock", "fuse", "voltage", "fan", "fridge", "freezer")) return "electrical";
  if (has("clean", "dirty", "dust", "stain", "mould", "mold", "smell", "cockroach", "paint")) return "cleaning";
  if (has("door", "wood", "furniture", "roof", "lock", "window", "cabinet", "chair", "table", "hinge")) return "carpentry";
  if (has("heat", "hot", "warm")) return "hvac";
  return null;
}
function estRange(id) { const s = svc(id); const hi = Math.round(s.base * 1.6 / 10) * 10; return [s.base, hi]; }
function diagScroll() {
  try { const sc = document.getElementById("screens"); sc.scrollTop = sc.scrollHeight; } catch (e) {}
  try { window.scrollTo(0, document.body.scrollHeight); } catch (e) {}
  try {
    const box = document.getElementById("diagChat");
    const last = box && box.lastElementChild;
    if (last && last.scrollIntoView) last.scrollIntoView({ block: "end" });
  } catch (e) {}
}
function diagBubble(text, who) {
  const box = document.getElementById("diagChat");
  const d = document.createElement("div");
  d.className = who === "user" ? "flex justify-end" : "flex justify-start";
  d.innerHTML = `<div class="${who === "user" ? "bub-user" : "bub-ai"}">${text}</div>`;
  box.appendChild(d); diagScroll();
  return d;
}
function diagChips(items) {
  const row = document.getElementById("diagChips");
  row.innerHTML = "";
  (items || []).forEach(it => {
    const b = document.createElement("button");
    b.className = "chipx" + (it.on ? " on" : "");
    b.textContent = it.label;
    b.onclick = () => sendDiag(it.label, it);
    row.appendChild(b);
  });
}
function diagTyping() {
  const box = document.getElementById("diagChat");
  const d = document.createElement("div");
  d.className = "flex justify-start";
  d.innerHTML = '<div class="bub-ai"><span class="typing"><span></span><span></span><span></span></span></div>';
  box.appendChild(d); diagScroll();
  return d;
}
function renderDiag() {
  if (diagInit) { diagScroll(); return; }
  diagInit = true;
  diagBubble("Hi, I'm your ServePoint assistant. Tell me what's wrong and I'll point you to the right CID-checked technician.", "ai");
  diagChips([{ label: "AC not cooling" }, { label: "Leaking pipe" }, { label: "Socket sparks" }]);
}
function startDiagnose(prefill) {
  show("diag");
  if (!diagInit) renderDiag();
  if (prefill) { document.getElementById("diagInput").value = prefill; sendDiag(prefill); }
}
async function sendDiag(text, opt) {
  const input = document.getElementById("diagInput");
  input.value = "";
  diagBubble(escapeHtml(text), "user");
  diagChips([]);
  diagPending = null; if (await sendDiagServer(text)) return;
  const typing = diagTyping();
  await new Promise(r => setTimeout(r, 750));
  typing.remove();
  if (diagPending && diagPending.kind === "airflow") {
    const low = text.toLowerCase();
    const weak = low.indexOf("weak") !== -1 || low.indexOf("not sure") !== -1 || low.indexOf("not") !== -1;
    diagPending = null;
    diagBubble(weak ? "Got it — weak airflow usually means a refrigerant or airflow blockage." : "Good — steady airflow usually points to a thermostat or sensor fault.", "ai");
    showIssue("hvac", weak ? "Airflow or refrigerant-related issue" : "Thermostat or sensor-related issue");
    return;
  }
  if (opt && opt.pick) { showIssue(opt.pick, opt.detail); return; }
  const sid = matchSymptom(text);
  if (!sid) {
    diagBubble("To point you to the right specialist — which area is the problem in?", "ai");
    diagChips(DIAG_SERVICE_CHIPS);
    return;
  }
  if (sid === "hvac") {
    diagBubble("Is that airflow weak or normal?", "ai");
    diagPending = { kind: "airflow" };
    diagChips([{ label: "Normal" }, { label: "Weak" }, { label: "Not sure" }]);
    return;
  }
  const details = {
    plumbing: "Leak or pipe-fitting issue",
    electrical: "Wiring or socket fault",
    cleaning: "Deep-clean recommended",
    carpentry: "Joinery repair needed"
  };
  diagBubble("Thanks — I have what I need.", "ai");
  showIssue(sid, details[sid] || "Inspection recommended");
}
function showIssue(sid, detail) {
  const s = svc(sid);
  const [lo, hi] = estRange(sid);
  const card = document.getElementById("diagIssue");
  card.hidden = false;
  card.innerHTML =
    `<div class="flex items-center gap-2">
      <svg class="w-4 h-4 text-impact-deep flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3l1.7 4.6L18 9.3l-4.3 1.7L12 15.6l-1.7-4.6L6 9.3l4.3-1.7z"/></svg>
      <p class="font-display font-extrabold f15">Possible issue detected</p>
    </div>
    <p class="f13 soft mt-1">${detail}</p>
    <button class="mt-3 w-full rounded-2xl p-3.5 flex items-center gap-3 text-left glasssoft" id="diagSvcBtn">
      <span class="w-10 h-10 rounded-full grid place-items-center flex-none ${tintCls(s)}">${svcIcon(s, "w-5 h-5")}</span>
      <span class="flex-1 min-w-0"><span class="block f11 soft font-bold">Recommended</span><span class="block font-display font-bold f14 truncate">${s.name} Diagnostic &amp; Repair</span></span>
      <span class="w-9 h-9 rounded-full btn-dark grid place-items-center flex-none"><svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M7 17L17 7M8 7h9v9"/></svg></span>
    </button>
    <div class="mt-2 rounded-2xl p-3.5 glasssoft">
      <p class="f11 soft font-bold">Estimated</p>
      <p class="font-display font-extrabold f17">${gh(lo)} - ${gh(hi)}</p>
    </div>
    <p class="f11 soft mt-2 flex items-center gap-1">
      <svg class="w-3.5 h-3.5 flex-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/><path d="M12 8v4l2.5 2.5"/></svg>
      AI estimate - professional inspection recommended.
    </p>
    <button id="diagFindBtn" class="btn-dark mt-2 w-full font-display font-bold f15 rounded-2xl py-4 mh56">Find a Technician</button>`;
  document.getElementById("diagFindBtn").onclick = () => startBooking(sid);
  document.getElementById("diagSvcBtn").onclick = () => startBooking(sid);
  diagScroll();
}
document.getElementById("diagSend").onclick = () => {
  const t = document.getElementById("diagInput").value.trim();
  if (!t) return;
  sendDiag(t);
};
const DIAG_EXAMPLES = [
  "My AC is running but the room isn't getting cold.",
  "Water is leaking under my kitchen sink.",
  "The bedroom socket sparks when I plug in."
];
let diagExIdx = 0;
document.getElementById("diagPlus").onclick = () => {
  const inp = document.getElementById("diagInput");
  inp.value = DIAG_EXAMPLES[diagExIdx % DIAG_EXAMPLES.length];
  diagExIdx++;
  inp.focus();
};
document.getElementById("diagMic").onclick = () => {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) { toast("Voice typing isn't supported in this browser — type instead"); return; }
  try {
    const rec = new SR();
    rec.lang = "en-GH"; rec.interimResults = false; rec.maxAlternatives = 1;
    toast("Listening… speak now");
    rec.onresult = (e) => {
      const t = e.results[0][0].transcript;
      const inp = document.getElementById("diagInput");
      inp.value = (inp.value ? inp.value + " " : "") + t;
      inp.focus();
    };
    rec.onerror = () => toast("Couldn't hear that — try again");
    rec.start();
  } catch (e) { toast("Voice typing isn't available right now"); }
};
document.getElementById("diagInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); document.getElementById("diagSend").click(); }
});
document.getElementById("diagClear").onclick = () => {
  document.getElementById("diagChat").innerHTML = "";
  document.getElementById("diagIssue").hidden = true;
  document.getElementById("diagIssue").innerHTML = "";
  diagPending = null; diagInit = false; groqMsgs = null;
  renderDiag();
};

/* ---------- services browse + wallet ---------- */
let svcFilter = "all", svcQuery = "";
let serviceArtisans = [], serviceArtisansLoaded = false, serviceArtisansLoading = false;
const SVC_FILTERS = [
  { id: "all", label: "All" },
  { id: "same", label: "Same-day" },
  { id: "top", label: "Top rated" },
  { id: "under100", label: "Under GH₵100" }
];
function svcPasses(s) {
  const providers = serviceArtisans.filter((artisan) => artisan.trade === s.id);
  if (svcFilter === "top" && !providers.some((artisan) => Number(artisan.rating) >= 4.8)) return false;
  if (svcFilter === "under100" && !(s.base < 100)) return false;
  if (svcQuery) {
    const q = svcQuery.toLowerCase();
    if ((s.name + " " + s.blurb).toLowerCase().indexOf(q) === -1) return false;
  }
  return true;
}
function renderServices() {
  if (LIVE_DB && !serviceArtisansLoaded && !serviceArtisansLoading) {
    serviceArtisansLoading = true;
    Backend.artisans().then((rows) => {
      serviceArtisans = rows || [];
      serviceArtisansLoaded = true;
      serviceArtisansLoading = false;
      renderServices();
    }).catch(() => { serviceArtisansLoading = false; });
  }
  const chips = document.getElementById("svcChips");
  chips.innerHTML = "";
  SVC_FILTERS.forEach(f => {
    const b = document.createElement("button");
    b.className = "chipx" + (svcFilter === f.id ? " on" : "");
    b.textContent = f.label;
    b.onclick = () => { svcFilter = f.id; renderServices(); };
    chips.appendChild(b);
  });
  const grid = document.getElementById("svcGrid");
  grid.innerHTML = "";
  const list = SERVICES.filter(svcPasses);
  document.getElementById("svcSub").textContent = list.length + " of " + SERVICES.length + " trades · artisan availability from live profiles";
  if (!list.length) grid.innerHTML = '<p class="emptyNote f14 soft py-6 spanall">No matches — try "leak" or "wiring".</p>';
  list.forEach(s => {
    const count = serviceArtisans.filter((artisan) => artisan.trade === s.id).length;
    const b = document.createElement("button");
    b.className = "glasscard p-4 flex flex-col items-start gap-2 text-left";
    b.innerHTML = `<span class="w-12 h-12 rounded-full grid place-items-center ${tintCls(s)}">${svcIcon(s, "w-6 h-6")}</span>
      <span><span class="block font-display font-extrabold f15">${s.name}</span>
      <span class="block f12 soft">from ${gh(s.base)} · ${count ? count + (count === 1 ? " artisan" : " artisans") : "No artisans yet"}</span></span>
      <span class="f12 font-bold uptime">Book now →</span>`;
    b.onclick = () => startBooking(s.id);
    grid.appendChild(b);
  });
}

/* ---------- account: Google login, roles, profile ---------- */
let acctRole = "customer";
function artisanDetails(nameValue, phoneValue) {
  const name = String(nameValue || "").trim();
  const phone = String(phoneValue || "").trim();
  const digits = phone.replace(/\D/g, "").length;
  if (name.length < 2 || name.length > 120) { toast("Enter your full name"); return null; }
  if (!/^\+?[0-9\s()-]{7,24}$/.test(phone) || digits < 9 || digits > 15) { toast("Enter a valid contact phone number"); return null; }
  return { name, phone };
}
function tradeOptions(sel) {
  return SERVICES.map(s => `<option value="${s.id}" ${s.id === sel ? "selected" : ""}>${s.name}</option>`).join("");
}
function areaOptions(sel) {
  /* Grouped by region; an auto-detected area outside the list is prepended
     so any place in Ghana stays selectable. */
  const extra = (sel && AREAS.indexOf(sel) === -1) ? `<option selected>${escapeHtml(sel)} (my location)</option>` : "";
  return extra + REGIONS.map(g =>
    `<optgroup label="${escapeHtml(g.region)}">` +
    g.areas.map(a => `<option${a === sel ? " selected" : ""}>${escapeHtml(a)}</option>`).join("") +
    `</optgroup>`
  ).join("");
}
function renderAccount() {
  const box = document.getElementById("acctBody");
  if (!box) return;
  const g = Auth.googleUid();
  if (!g || !S.profile) {
    box.innerHTML =
    `<div class="glasscard p-4">
      <p class="font-display font-extrabold f16">I am a…</p>
      <div class="grid grid-cols-2 gap-2 mt-2">
        <button id="roleCustomer" aria-pressed="${acctRole === "customer"}" class="rounded-2xl p-3.5 font-bold f14 mh56 border ${acctRole === "customer" ? "btn-dark text-white" : "border-line"}">Customer<br><span class="f11 font-normal opacity-70">Book artisans</span></button>
        <button id="roleArtisan" aria-pressed="${acctRole === "artisan"}" class="rounded-2xl p-3.5 font-bold f14 mh56 border ${acctRole === "artisan" ? "btn-dark text-white" : "border-line"}">Artisan<br><span class="f11 font-normal opacity-70">Apply for jobs</span></button>
      </div>
      <div id="artisanFields" class="artisan-fields mt-3 p-4 rounded-2xl border border-line bg-white" ${acctRole === "artisan" ? "" : "hidden"}>
        <p class="font-display font-bold f15">Set up your artisan profile</p>
        <p class="f12 soft mt-1">Add your contact details and the work you do.</p>
        <div class="mt-3">
          <label for="acctName" class="block f12 font-bold text-ink-soft mb-1">Full name</label>
          <input id="acctName" class="field rounded-xl p-3 f14 w-full" type="text" maxlength="120" autocomplete="name" placeholder="e.g. Ama Mensah" required>
        </div>
        <div class="mt-3">
          <label for="acctPhone" class="block f12 font-bold text-ink-soft mb-1">Contact phone</label>
          <input id="acctPhone" class="field rounded-xl p-3 f14 w-full" type="tel" maxlength="24" autocomplete="tel" placeholder="e.g. 024 123 4567" aria-describedby="acctPhoneHelp" required>
          <p id="acctPhoneHelp" class="f11 soft mt-1">Kept private except to the customer who accepts your application.</p>
        </div>
        <div class="mt-3">
          <label for="acctTrade" class="block f12 font-bold text-ink-soft mb-1">Your trade</label>
          <select id="acctTrade" class="field rounded-xl p-3 f14 w-full">${tradeOptions("plumbing")}</select>
        </div>
        <div class="mt-3">
          <label for="acctArea" class="block f12 font-bold text-ink-soft mb-1">Your work area</label>
          <select id="acctArea" class="field rounded-xl p-3 f14 w-full">${areaOptions(S.homeArea || AREAS[0])}</select>
        </div>
      </div>
      ${LIVE_DB
        ? '<button id="googleBtn" class="btn-dark mt-3 w-full font-display font-bold f15 rounded-2xl py-4 mh56 flex items-center justify-center gap-2"><svg class="w-5 h-5" viewBox="0 0 24 24"><path fill="#fff" d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.4a4.6 4.6 0 0 1-2 3v2.6h3.2c1.9-1.7 3-4.3 3-7.5z"/><path fill="#fff" opacity=".8" d="M12 22c2.7 0 5-1 6.6-2.5l-3.2-2.6c-.9.6-2 1-3.4 1-2.6 0-4.8-1.8-5.6-4.1H3.1v2.7A10 10 0 0 0 12 22z"/><path fill="#fff" opacity=".8" d="M6.4 13.8a6 6 0 0 1 0-3.6V7.5H3.1a10 10 0 0 0 0 9z"/><path fill="#fff" opacity=".8" d="M12 5.9c1.5 0 2.8.5 3.8 1.5L18.7 4A10 10 0 0 0 3.1 7.5l3.3 2.5c.8-2.3 3-4.1 5.6-4.1z"/></svg> Continue with Google</button>'
        : '<p class="f13 soft mt-3 glasscard p-3">Google login + live bookings + real MoMo payments activate once you add your Supabase + Paystack keys in public/config.js (see README.md). You can still look around as a guest.</p>'}
      <button class="mt-2 w-full font-bold f14 rounded-2xl py-3.5 mh52 border border-line" data-goto="home">Continue as guest</button>
      <button class="easyTBtn mt-2 w-full font-bold f14 rounded-2xl py-3.5 mh52 border border-line bg-white">Easy View: Off</button>
      <button class="mt-2 w-full font-bold f14 rounded-2xl py-3.5 mh52 border border-line bg-white" data-goto="privacy">Privacy & data safety</button>
      <p class="f11 soft mt-2">Guests can browse the app. Booking and payments go live once the backend keys are added.</p>
    </div>`;
    document.getElementById("roleCustomer").onclick = () => { acctRole = "customer"; renderAccount(); };
    document.getElementById("roleArtisan").onclick = () => { acctRole = "artisan"; renderAccount(); };
    box.querySelectorAll(".easyTBtn").forEach(b => { b.onclick = () => toggleSenior(); });
    applySenior();
    const gb = document.getElementById("googleBtn");
    if (gb) gb.onclick = (event) => {
      let details = null;
      if (acctRole === "artisan") {
        details = artisanDetails(document.getElementById("acctName").value, document.getElementById("acctPhone").value);
        if (!details) return;
      }
      try {
        localStorage.setItem("fixhub_pending_role", JSON.stringify({
          role: acctRole,
          name: details ? details.name : null,
          phone: details ? details.phone : null,
          trade: acctRole === "artisan" ? document.getElementById("acctTrade").value : null,
          area: acctRole === "artisan" ? document.getElementById("acctArea").value : null
        }));
      } catch (e) {}
      Auth.loginWithGoogle(event.currentTarget);
    };
    return;
  }
  const p = S.profile;
  const initial = String(p.name || "F")[0].toUpperCase();
  box.innerHTML =
  `<div class="glasscard p-4 flex items-center gap-3">
    <span class="avatarbtn avatarbtn-lg flex-none">${initial}</span>
    <div class="flex-1 min-w-0"><p class="font-display font-extrabold f16 truncate">${escapeHtml(p.name || "ServePoint user")}</p>
    <p class="f12 soft truncate">${Auth.load() && Auth.load().email ? escapeHtml(Auth.load().email) : "Google account"}</p></div>
    <span class="${p.role === "artisan" ? "greenpill" : "chipx on rolechip-cust"} flex-none">${p.role === "artisan" ? "Artisan" : "Customer"}</span>
  </div>
  ${p.role === "artisan" ? `<div class="glasscard p-4 mt-3">
    ${p.phoneStorageError ? '<p class="f12 text-cancel mb-2" role="status">Phone details are not synced yet. Run the artisan database migration, then save your profile.</p>' : ""}
    <p class="font-display font-bold f15">My artisan profile</p>
    <div class="mt-3">
      <label for="acctName" class="block f12 font-bold text-ink-soft mb-1">Full name</label>
      <input id="acctName" class="field rounded-xl p-3 f14 w-full" type="text" maxlength="120" autocomplete="name" value="${escapeHtml(p.name || "")}" placeholder="Full name">
    </div>
    <div class="mt-3">
      <label for="acctPhone" class="block f12 font-bold text-ink-soft mb-1">Contact phone</label>
      <input id="acctPhone" class="field rounded-xl p-3 f14 w-full" type="tel" maxlength="24" autocomplete="tel" value="${escapeHtml(p.phone || "")}" placeholder="Contact phone number">
      <p class="f11 soft mt-1">Shown to a customer only after they accept you for a booking.</p>
    </div>
    <div class="mt-3">
      <label for="acctTrade" class="block f12 font-bold text-ink-soft mb-1">Your trade</label>
      <select id="acctTrade" class="field rounded-xl p-3 f14 w-full">${tradeOptions(p.trade || "plumbing")}</select>
    </div>
    <div class="mt-3">
      <label for="acctArea" class="block f12 font-bold text-ink-soft mb-1">Your work area</label>
      <select id="acctArea" class="field rounded-xl p-3 f14 w-full">${areaOptions(p.area || AREAS[0])}</select>
    </div>
    <button id="saveTradeBtn" class="mt-2 w-full btn-dark font-display font-bold f14 rounded-2xl py-3.5 mh52">Save profile</button>
    <div class="mt-4 border-t border-line pt-4">
      <p class="font-display font-bold f15">Payout account</p>
      <p class="f12 soft mt-1">Used to transfer your 90% share after the customer confirms the completed job. Bank details are sent securely to Paystack; ServePoint stores only the Paystack recipient code.</p>
      <label for="payoutBank" class="block f12 font-bold text-ink-soft mt-3 mb-1">Bank</label>
      <select id="payoutBank" class="field rounded-xl p-3 f14 w-full"><option value="">Loading banks…</option></select>
      <label for="payoutAccount" class="block f12 font-bold text-ink-soft mt-3 mb-1">Account number</label>
      <input id="payoutAccount" class="field rounded-xl p-3 f14 w-full" type="text" inputmode="numeric" autocomplete="off" maxlength="20" placeholder="Enter your account number">
      <button id="savePayoutBtn" class="mt-3 w-full btn-dark font-display font-bold f14 rounded-2xl py-3.5 mh52">Save payout account</button>
      <p id="payoutStatus" class="f12 soft mt-2" role="status"></p>
    </div>
  </div>` : ""}
  <button id="logoutBtn" class="mt-3 w-full font-bold f14 rounded-2xl py-3.5 mh52 border border-red-200 text-cancel bg-white">Log out</button>
  <button class="easyTBtn mt-2 w-full font-bold f14 rounded-2xl py-3.5 mh52 border border-line bg-white">Easy View: Off</button>
  <button class="mt-2 w-full font-bold f14 rounded-2xl py-3.5 mh52 border border-line bg-white" data-goto="privacy">Privacy & data safety</button>`;
  const st = document.getElementById("saveTradeBtn");
  if (st) st.onclick = async (event) => withButtonBusy(event.currentTarget, "Saving profile…", async () => {
    const enteredPhone = document.getElementById("acctPhone").value.trim();
    const details = artisanDetails(document.getElementById("acctName").value, enteredPhone || p.phone || "");
    if (!details) return;
    try {
      await Backend.saveArtisanPhone(details.phone);
      await Backend.saveProfile({
        name: details.name,
        trade: document.getElementById("acctTrade").value,
        area: document.getElementById("acctArea").value
      });
      const payoutBank = document.getElementById("payoutBank");
      if (payoutBank) {
        fetch("/api/paystack/banks").then(async (response) => {
          const data = await response.json();
          if (!response.ok) throw new Error(data.error || "Could not load banks");
          payoutBank.innerHTML = '<option value="">Choose your bank</option>' +
            (data.banks || []).map((bank) => `<option value="${escapeHtml(bank.code)}">${escapeHtml(bank.name)}</option>`).join("");
          if (!data.banks || !data.banks.length) throw new Error("No Ghana payout banks are available.");
        }).catch((error) => {
          payoutBank.innerHTML = '<option value="">Banks unavailable</option>';
          const status = document.getElementById("payoutStatus");
          if (status) status.textContent = error.message;
        });
      }
      const savePayout = document.getElementById("savePayoutBtn");
      if (savePayout) savePayout.onclick = (event) => withButtonBusy(event.currentTarget, "Saving payout…", async () => {
        const bankCode = payoutBank.value;
        const accountNumber = document.getElementById("payoutAccount").value.trim();
        const status = document.getElementById("payoutStatus");
        if (!bankCode || !accountNumber) { toast("Choose a bank and enter your account number."); return; }
        try {
          await Backend.apiPost("/api/paystack/recipient", { bankCode, accountNumber });
          document.getElementById("payoutAccount").value = "";
          status.textContent = "Payout account saved with Paystack.";
          toast("Payout account saved.");
        } catch (error) {
          status.textContent = error.message || "Could not save payout account.";
          toast(status.textContent);
        }
      });
      S.profile.phone = details.phone;
      S.profile.phoneStorageError = false;
      persist();
      renderAccount();
      toast("Profile updated");
    } catch (e) { toast("Could not save — check your connection"); }
  });
  document.getElementById("logoutBtn").onclick = () => Auth.logout();
  box.querySelectorAll(".easyTBtn").forEach(b => { b.onclick = () => toggleSenior(); });
  applySenior();
}

updateAvatar();
refreshAreaPill();
document.getElementById("navScrim").onclick = closeNav;
document.getElementById("navClose").onclick = closeNav;
document.getElementById("navSignout").onclick = () => { Auth.logout(); show("home"); };
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeNav(); });
ensureBurgers();
document.getElementById("privacyBackBtn").onclick = () => show(privacyFrom);
const aso = document.getElementById("adminSignout");
if (aso) aso.onclick = () => { Auth.logout(); show("home"); };
show("home");
pollNotifications(false);
window.addEventListener("focus", () => pollNotifications(true));
try {
  const g = S.homeGeo;
  if (!g || (Date.now() - (g.ts || 0)) > 24 * 3600 * 1000) locateUser({ silent: true });
} catch (e) {}