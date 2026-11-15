(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const app = $("#app"), introRoot = $("#intro-root"), fixedRoot = $("#fixed-root");
  const SPR = window.SPR, DEMOS = window.DEMOS, FX = window.FX, PX = 3, SC = 3, BX = 4, ART = window.ART || {};
  const ORIGINAL = $("#cv-data").textContent;
  let state = JSON.parse(ORIGINAL);

  let editing = false, dirty = false, canEdit = false, busy = false, note = "", artifact = null;
  const ui = {
    view: "desk", admitted: null, introStep: 0, introDone: false, passPage: 0,
    marks: { visa: [], record: [], id: [] }, inked: { visa: false, record: false, id: false }, papers: {}, stickers: {}, scene: null, maxOut: 0,
    forced: false, boothForced: false, handled: false, drawer: 0, fit: 1,
    hot: null, front: null, printed: false, torn: 0, slipTorn: false, slipPos: null,
    barAuto: false, barPinned: null, radioOn: true, said: new Set(), asked: null,
    room: 0, liftCard: null, lampOn: ["dusk", "night"].includes(dayPhase()), lampTouched: false, pinHot: null, noteSent: false, printing: false, contactOpen: false,
  };
  let topZ = 40, board = null;

  const narrow = window.matchMedia("(max-width: 820px)");
  const isPhone = () => narrow.matches;
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior = () => (reduced() ? "auto" : "smooth");
  const wait = (ms) => new Promise((r) => setTimeout(r, reduced() ? 0 : ms));
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const clock = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "");
  const at = (path) => path.split(".").reduce((o, k) => o[k], state);
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const rnd = (id, salt) => SPR.seeded(hash(id + ":" + salt))();
  const shortName = (p) => (p.short || p.name.split(":")[0]).trim();
  const field = (label, value) => "<div><dt>" + esc(label) + "</dt><dd>" + esc(value) + "</dd></div>";
  const rectOf = (el) => el.getBoundingClientRect();
  const inside = (r, x, y) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

  // ----- skills and stacks -----
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const skillParts = (sk) => sk.replace(/\(.*?\)/g, "").split("/").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const uses = (text, sk) => skillParts(sk).some((p) => new RegExp("(^|[^a-z0-9+#])" + reEsc(p) + "($|[^a-z0-9+#])").test(String(text).toLowerCase()));
  const stackHTML = (x) => x.stack.split(/,\s*/).map((item) => (ui.hot && uses(item, ui.hot) ? "<mark>" + esc(item) + "</mark>" : esc(item))).join(", ");

  // ----- the papers on the desk -----
  const caseIds = () => state.projects.map((p, i) => "case-" + i);
  const ORDER = () => ["id", "diploma", "honours"].concat(caseIds());
  const paperIds = ORDER;
  const caseIndex = (id) => (/^case-\d+$/.test(id) ? +id.slice(5) : -1);
  const paperLabel = (id) => (id === "id" ? "ID card" : id === "diploma" ? "Diploma" : id === "honours" ? "Commendations" : shortName(state.projects[caseIndex(id)]));
  const pst = (id) => ui.papers[id] || (ui.papers[id] = { x: null, y: null, tilt: +(rnd(id, "tilt") * 3 - 1.5).toFixed(1), open: false, page: 0, pages: null, away: false, prev: null, inBox: caseIndex(id) >= 0, outPos: null });
  const paperEl = (id) => $('#desk .paper[data-id="' + id + '"]');
  const portraitAlt = "Pixel portrait of Thea: short dark hair, light shirt with an open collar";

  function idInner() {
    const p = state.profile;
    return '<div class="pad stampable" data-stamp="id"><p class="doc-title">Identity card</p><div class="id-body"><div class="id-photo">' + SPR.applicant("thea", 2, portraitAlt) +
      '</div><dl class="fields">' + field("Name", p.name) + field("Nationality", p.nationality) + field("Based in", p.basedIn) + field("Occupation", p.occupation) + "</dl></div>" +
      '<div class="stamp-box ghost' + (ui.inked.id ? " inked" : "") + '" aria-hidden="true"></div><div class="marks" data-marks="id"></div></div>';
  }
  function diplomaInner() {
    const e = state.education;
    return '<div class="pad"><p class="doc-title">Diploma <span class="ink green seal">With distinction</span></p>' +
      '<p class="dip-line"><b>' + esc(e.degree) + '</b></p><p class="dip-line">' + esc(e.school) + '</p><p class="dip-line">' + esc(e.major) +
      '</p><p class="dip-line">Graduated ' + esc(e.graduated) + '</p><p class="dip-line">Coursework: ' + esc(e.coursework) + "</p></div>";
  }
  // each award gets its pin, matched by the award's own words
  function pinFor(a) {
    const r = (a.result || "").toLowerCase();
    if (r.includes("entrepreneur")) return "pin-entrepreneurial";
    if (r.includes("runner")) return "pin-runnerup";
    if (r.includes("best solution")) return "pin-bestsolution";
    return "";
  }
  function honoursInner() {
    return '<div class="pad"><p class="doc-title">Commendations</p>' + state.awards.filter((a) => a.result).map((a, i) => {
      const pin = pinFor(a);
      return '<div class="honour' + (pin ? " pinned" : "") + (ui.pinHot === i ? " lit" : "") + '">' +
        (pin ? '<button class="pin" data-act="pin" data-i="' + i + '" aria-pressed="' + (ui.pinHot === i) + '" aria-label="Pin for ' + esc(a.result) + '. Highlight this award.">' + SPR.art(pin, 2) + "</button>" : "") +
        '<div class="hon-text"><span class="hon-line"><b>' + esc(a.result) + "</b>, " + esc(a.event) + " " + esc(a.year) + "</span><p>" + esc(a.note) + "</p></div></div>";
    }).join("") + "</div>";
  }
  function folderInner(i) {
    const p = state.projects[i];
    const filed = pst(("case-" + i)).inBox && !isPhone(), side = ["left", "right"][i % 2];
    return SPR.art("fstrip-" + (i % 7), BX, "fold-art") + '<span class="ft-icon ft-' + side + '" aria-hidden="true">' + SPR.draw(p.icon || "paper", 1) + "</span>" +
      '<button class="folder-tab ft-' + side + '" data-act="tab" data-id="' + ("case-" + i) + '" tabindex="' + (filed ? 0 : -1) + '" aria-label="' + esc(p.name) + '"' + (filed ? "" : ' aria-hidden="true"') + '><span class="ft-full">' + esc(shortName(p)) +
      '</button><span class="clip">' + SPR.art("paperclip", SC) + "</span>" +
      '<div class="folder-face">' + SPR.draw(p.icon || "paper", PX) + "<div><b>" + esc(shortName(p)) + '</b><span class="when">' + esc(p.dates) + "</span></div></div>" +
      (p.award ? '<span class="ink red mini-stamp">' + esc(p.award) + "</span>" : "") + '<span class="peek" aria-hidden="true">Open file</span>';
  }

  // An open case file is split into pages that fit the desk, so it never needs an inner scrollbar.
  // The demo, when there is one, always gets the last page to itself.
  function caseBlocks(i) {
    const p = state.projects[i], meta = [p.role, p.dates, p.event].filter(Boolean).map(esc).join(" · ");
    return {
      top: '<div class="case-top">' + SPR.draw(p.icon || "paper", PX) + "<div><h3>" + esc(p.name) + '</h3><p class="meta">' + meta + "</p></div>" +
        (p.award ? '<span class="ink red">' + esc(p.award) + "</span>" : "") + '</div><p class="line">' + esc(p.line) + "</p>",
      points: p.points.filter(Boolean).map((t) => "<li>" + esc(t) + "</li>"),
      stack: '<p class="stack"><span class="stack-label">Built with</span><br><span class="stack-items">' + stackHTML(p) + "</span></p>",
      demo: DEMOS[p.demo] ? '<div class="demo-zone"><button class="btn-main" data-act="demo" data-i="' + i + '">Run demo</button><div class="demo-box" hidden></div></div>' : "",
    };
  }
  function paginate(i, el) {
    const b = caseBlocks(i);
    if (isPhone()) return [b.top + '<ul class="points">' + b.points.join("") + "</ul>" + b.stack + b.demo];
    const head = $(".paper-head", el), limit = el.clientHeight - (head ? head.offsetHeight : 44);
    const m = document.createElement("div");
    m.className = "paper-body measure";
    m.style.cssText = "position:absolute;visibility:hidden;left:0;top:0;width:" + el.clientWidth + "px;height:auto;overflow:visible";
    el.appendChild(m);
    const pages = [];
    const fits = () => m.scrollHeight <= limit;
    const flush = () => { pages.push(m.innerHTML); m.innerHTML = ""; };
    const put = (html, asPoint) => {
      const before = m.innerHTML;
      if (asPoint) { let ul = m.lastElementChild; if (!ul || !ul.matches("ul.points")) { m.insertAdjacentHTML("beforeend", '<ul class="points"></ul>'); ul = m.lastElementChild; } ul.insertAdjacentHTML("beforeend", html); }
      else m.insertAdjacentHTML("beforeend", html);
      if (!fits() && before) { m.innerHTML = before; flush(); put(html, asPoint); }
    };
    put(b.top);
    b.points.forEach((li) => put(li, true));
    if (b.demo) { flush(); m.innerHTML = b.stack + b.demo; flush(); } else { put(b.stack); flush(); }
    m.remove();
    return pages.filter(Boolean);
  }
  function caseInner(i) {
    const p = state.projects[i], st = pst("case-" + i), pages = st.pages || [""], n = pages.length, page = Math.min(st.page, n - 1), id = "case-" + i;
    const nav = n > 1 ? '<span class="pg-nav"><button class="pg-btn" data-act="page" data-id="' + id + '" data-dir="-1" aria-label="Previous page"' + (page === 0 ? " disabled" : "") + ">" + SPR.draw("left", 2) +
      '</button><span class="pg">Page ' + (page + 1) + " of " + n + '</span><button class="pg-btn" data-act="page" data-id="' + id + '" data-dir="1" aria-label="Next page"' + (page === n - 1 ? " disabled" : "") + ">" + SPR.draw("right", 2) + "</button></span>" : "";
    return '<header class="paper-head"><h2>' + esc(shortName(p)) + "</h2>" + nav +
      '<button class="close" data-act="to-box" data-id="' + id + '">Return to box</button><button class="close" data-act="close-case" data-id="' + id + '">Close file</button></header>' +
      '<div class="sheets"><div class="paper-body">' + pages[page] + "</div></div>" +
      (n > 1 && page < n - 1 ? '<button class="corner" data-act="flip" data-id="' + id + '" aria-label="Turn to page ' + (page + 2) + '">' + SPR.draw("corner", PX) + "</button>" : "");
  }
  function paperInner(id) {
    if (id === "id") return idInner();
    if (id === "diploma") return diplomaInner();
    if (id === "honours") return honoursInner();
    const i = caseIndex(id);
    return pst(id).open ? caseInner(i) : folderInner(i);
  }
  function paperHTML(id) {
    const st = pst(id), i = caseIndex(id), kind = i >= 0 ? "case" : id;
    const cls = "paper p-" + kind + (st.open ? " open" : "") + (st.away ? " away" : "") + (i >= 0 && st.inBox && !st.open && !isPhone() ? " filed" : "") + (isPhone() ? "" : " packed") +
      (i >= 0 && ui.hot && uses(state.projects[i].stack, ui.hot) ? " hot" : "");
    const label = i >= 0 ? "Case file: " + state.projects[i].name : paperLabel(id);
    return '<article class="' + cls + '" data-id="' + id + '" data-drag tabindex="' + (cls.includes(" filed") ? -1 : 0) + '" aria-label="' + esc(label) + '"' +
      (i >= 0 ? ' aria-expanded="' + st.open + '"' : "") + ' style="--tilt:' + st.tilt + "deg" + (i >= 0 ? ";--tab-x:" + ((i % 3) * 34 + 8) + "px;--tabc:" + TABC[i % TABC.length] : "") + '">' + paperInner(id) + "</article>";
  }
  function skillsHTML() {
    const p = frontCase();
    return '<div class="skills-card"><p class="note">Pick a skill to see which case files used it.</p><div class="sk-cols">' + state.skills.map((g) => '<div class="sk-group"><h3>' + esc(g.group) + "</h3>" +
      g.items.map((s) => '<button class="sk' + (ui.hot === s ? " hot" : "") + (p && uses(p.stack, s) ? " used" : "") + '" data-act="skill" data-s="' + esc(s) + '" aria-pressed="' + (ui.hot === s) + '">' + esc(s) + "</button>").join("") + "</div>").join("") + "</div></div>";
  }
  function frontCase() { const i = caseIndex(ui.front || ""); return i >= 0 ? state.projects[i] : null; }

  // ----- booth -----
  const hasRadio = () => state.assistant.some((a) => a.line) || state.projects.some((p) => p.aside);
  function ownerBar() {
    if (!canEdit) return "";
    if (!editing) return '<button class="btn-quiet" data-act="edit">Amend papers</button>';
    return '<button class="btn-main" data-act="save"' + (dirty && !busy ? "" : " disabled") + ">" + (busy ? "Filing…" : "File changes") + "</button>" +
      '<button class="btn-quiet" data-act="discard"' + (busy ? " disabled" : "") + ">Discard</button>" + (note ? '<span class="note" role="status">' + esc(note) + "</span>" : "");
  }
  function setOwner() { const o = $("#owner"); if (o) o.innerHTML = ownerBar(); }
  function deniedLine() { return "Entry denied. The applicant is still available at " + state.profile.email + "."; }
  function boothHTML() {
    const p = state.profile, qs = state.interview.map((q, i) => [q, i]).filter((x) => x[0].q && x[0].a);
    return '<header class="booth" id="booth"><div class="window-wrap"><div class="window"><span class="skyline" id="skyline" data-phase="' + dayPhase() + '">' + SPR.scene(PX, dayPhase()) + "</span>" +
      SPR.applicant(p.applicant || "thea", 2, portraitAlt + ", standing at the booth window", "applicant") + '<span class="blink" id="blink" aria-hidden="true"><i></i><i></i></span><span class="ledge" aria-hidden="true"></span>' +
      '<div class="shutter" id="shutter"><span>Booth closed.</span><button class="btn-quiet" data-act="open-booth">Open the shutter</button></div></div>' +
      '<div class="board" id="board" aria-hidden="true"></div><p class="sr-only">Departure board: ' + esc(p.board.join(", ")) + "</p></div>" +
      '<div class="booth-main"><div class="booth-links"><button class="btn-quiet" data-act="area" data-to="record">60-second version</button><button class="btn-quiet" data-act="view" data-v="list">List view</button>' +
      '<button class="btn-quiet" data-act="passport">View passport</button><span class="owner" id="owner">' + ownerBar() + "</span></div>" +
      '<div class="plate-row"><div class="nameplate"><h1 id="hello" tabindex="-1">' + esc(p.greeting) + '</h1></div><p class="tagline">' + esc(p.tagline) + "</p></div>" +
      '<p class="denied-note" id="denied-note"' + (ui.admitted === "denied" ? "" : " hidden") + ">" + esc(deniedLine()) + "</p>" +
      (qs.length ? '<div class="ask">' + qs.map((x) => '<button class="btn-quiet" data-act="ask" data-q="' + x[1] + '">' + esc(x[0].q) + "</button>").join("") + "</div>" +
        '<p class="bubble" id="bubble" aria-live="polite"' + (ui.asked == null ? " hidden" : "") + ">" + (ui.asked == null ? "" : esc(state.interview[ui.asked].a)) + "</p>" : "") + "</div>" +
      '<div class="booth-side"><p class="clock"><time id="clock">' + clock() + "</time></p>" +
      '<button class="sound-btn" data-act="sound" aria-pressed="' + FX.soundOn + '"><span class="sb-icon" aria-hidden="true">' + SPR.draw("speakeron", PX) + SPR.draw("speakeroff", PX) + '</span><span class="sb-label">' + (FX.soundOn ? "Sound on" : "Sound off") + "</span></button>" +
      (hasRadio() ? '<div class="radio">' + SPR.draw("radio", PX) + '<button class="btn-quiet" data-act="radio" aria-pressed="' + ui.radioOn + '">' + (ui.radioOn ? "Mute radio" : "Unmute radio") + "</button></div>" : "") +
      '</div><p class="aside" id="aside" aria-live="polite" hidden></p>' +
      '<div class="intercom" id="intercom">' + SPR.art("intercom", SC) + '<button class="ic-btn" data-act="intercom" aria-label="Intercom: hear the booth assistant"><span class="tip" aria-hidden="true">Intercom</span></button></div>' +
      '<div class="pinboard" aria-label="Pinboard">' + SPR.art("pinboard", SC) + '<span class="pb-map">' + SPR.art("map-manila", SC, "", "A scrap of a map of Manila") + '<span class="pb-pin" aria-hidden="true"></span></span>' +
      '<p class="pb-scrap">' + esc(pinNote()) + "</p></div></header>";
  }

  // the visitor's local hour sets the sky: dawn, day, dusk or night
  function dayPhase(d) {
    const h = (d || new Date()).getHours();
    return h >= 5 && h < 9 ? "dawn" : h >= 9 && h < 17 ? "day" : h >= 17 && h < 19 ? "dusk" : "night";
  }
  const pinNote = () => (/relocat/i.test(state.profile.basedIn || "") ? "Relocating to Metro Manila" : "");
  function checkSky() {
    const sk = $("#skyline");
    if (!sk) return;
    const ph = dayPhase();
    if (sk.dataset.phase === ph) return;
    sk.dataset.phase = ph;
    sk.classList.add("fade");
    setTimeout(() => { sk.innerHTML = SPR.scene(PX, ph); sk.classList.remove("fade"); }, reduced() ? 0 : 300);
    if (!ui.lampTouched && (ph === "dusk" || ph === "night") !== ui.lampOn) toggleLamp(true);
  }
  setInterval(checkSky, 60000);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fitPinboard(); layoutDrawer(false); });
  function fitPinboard() {
    const pb = $(".pinboard"), main = $(".booth-main");
    if (!pb || isPhone()) return;
    pb.classList.remove("small", "away");
    const side = $(".booth-side"); if (side) pb.style.right = Math.round(window.innerWidth - rectOf(side).left + 24) + "px";
    const room = () => { const b = rectOf(pb); if (!b.width) return true; return $$(".booth-links > button, .booth-links .owner > *, .plate-row .tagline, .nameplate", main).every((e) => { const x = rectOf(e); return !x.width || x.right + 24 <= b.left || x.bottom < b.top || x.top > b.bottom; }); };
    if (room()) return;
    pb.classList.add("small");
    if (!room()) pb.classList.add("away");
  }
  function deskHTML() {
    const sticker = (id, art) => '<span class="sticker" data-sticker="' + id + '" data-drag aria-hidden="true">' + SPR.art(art, SC) + (id === "mug" ? '<span class="steam">' + SPR.draw("steam1", PX) + SPR.draw("steam2", PX) + "</span>" : "") + "</span>";
    return '<section class="desk" id="desk" aria-label="Desk">' +
      '<p class="phone-hint">Swipe through the papers. Tap a folder to open it.</p>' +
      '<div class="counter" id="counter"><div class="put-away" id="putaway"></div><span class="counter-hint" id="counter-hint">Drop here to put it away</span></div>' +
      '<div class="filebox" id="filebox" data-act="all-back"><span class="box-art" aria-hidden="true">' + SPR.art("filebox", BX) + "</span></div>" +
      '<div class="filebox-front" id="filebox-front">' + SPR.art("filebox-front", BX) + '<button class="box-plate" data-act="all-back" aria-label="Put all files back"></button></div>' +
      '<div class="printer" id="printer"><div class="feed" id="feed" aria-hidden="true"></div><button class="printer-btn" data-act="print" aria-label="Print the entry record">' +
      SPR.art("printer", SC) + '<span class="led" aria-hidden="true"></span></button></div>' +
      '<span class="pool" aria-hidden="true">' + SPR.pool(PX) + "</span>" +
      sticker("mug", "mug") + sticker("plant", "plant") + sticker("pen", "pen") +
      '<button class="notepad" id="notepad" data-act="note" aria-label="Sticky notes: leave Thea a note"' + (ui.noteSent ? " hidden" : "") + ">" + SPR.art("sticky-pad", SC) + "</button>" +
      '<form class="vnote" id="vnote" hidden><label class="sr-only" for="vnote-text">Your note to Thea</label><textarea id="vnote-text" maxlength="280" rows="5" placeholder="Write a note for Thea"></textarea>' +
      '<p class="vn-count" id="vn-count" aria-live="polite">0 of 280</p><div class="vn-row"><a class="btn-main" id="vn-send" href="#">Leave note</a><button type="button" class="btn-quiet" data-act="note-cancel">Put it back</button></div></form>' +
      '<p class="vsent" id="vsent"' + (ui.noteSent ? "" : " hidden") + '><span class="vs-text" id="vs-text"></span><span class="vs-tag">Sent</span></p>' + '<span class="ring cup-ring" aria-hidden="true">' + SPR.ring(PX) + "</span>" +
      '<div class="lamp" id="lamp">' + SPR.art("lamp", SC) + '<button class="lamp-switch" id="lamp-switch" data-act="lamp" aria-pressed="' + ui.lampOn + '" aria-label="Desk lamp switch"></button></div>' +
      '<div class="envelope" id="envelope" aria-hidden="true">' + SPR.art("envelope", SC) + '<span class="env-stamp">Applicant<br>file</span></div>' +
      '<div class="unpack-hint" id="unpack-hint"><p id="unpack-say">The applicant file is still sealed.</p><button class="btn-main" data-act="open-file">Open the file</button></div>' +
      paperIds().map(paperHTML).join("") +
      '<div class="desk-edge" aria-hidden="true"></div>' + drawerHTML("skills", "Skills") + drawerHTML("personal", "Personal") +
      '<p class="pnote" id="pnote" hidden></p></section>';
  }
  function deskBelowHTML() {
    return bigDrawerHTML();
  }

  // ----- entry record -----
  function recordHTML() {
    const p = state.profile, e = state.education, feat = state.projects.filter((x) => x.featured);
    const slip = '<div class="slip' + (ui.slipTorn ? " loose" : "") + '" id="slip" tabindex="' + (ui.slipTorn ? 0 : -1) + '"' + (ui.slipTorn ? ' data-drag role="button" aria-label="Contact slip. Press Enter to open the contact screen."' : "") +
      '><p class="s-title">Contact slip</p><span class="email">' + esc(p.email) + '</span><div class="row"><button class="btn-quiet" data-act="copy">Copy address</button>' +
      p.links.map((l) => (safeUrl(l.url) ? '<a href="' + esc(safeUrl(l.url)) + '" target="_blank" rel="noopener">' + esc(l.label) + "</a>" : "")).join("") + "</div></div>";
    const receipt = '<article class="receipt' + (ui.slipTorn ? " torn" : "") + '" id="receipt" data-stamp-root tabindex="0"' + (ui.printed ? "" : " hidden") + ' aria-label="Entry record. Press A to stamp it approved or D to stamp it denied.">' +
      '<div class="rec stampable" data-stamp="record"><p class="r-title">Entry record</p><p>Desk 04 · ' + today + "</p>" +
      "<dl><dt>Name</dt><dd>" + esc(p.name) + "</dd><dt>Seeking</dt><dd>" + esc(p.seeking) + "</dd><dt>Based in</dt><dd>" + esc(p.basedIn) + "</dd><dt>Education</dt><dd>" +
      esc(e.degree) + ", " + esc(e.graduated) + '</dd></dl><p class="r-h">Strengths</p><ul>' + state.strengths.filter(Boolean).map((s) => "<li>" + esc(s) + "</li>").join("") +
      '</ul><p class="r-h">Top projects</p><ul>' + feat.map((x) => "<li>" + esc(shortName(x)) + ", " + esc(x.award || x.role) + "</li>").join("") +
      '</ul><div class="stamp-box' + (ui.inked.record ? " inked" : "") + '">Stamp box</div><div class="marks" data-marks="record"></div></div>' +
      (ui.slipTorn ? "" : '<button class="perf" id="perf" data-act="tear" aria-label="Tear off the contact slip"><span class="lab">Tear here</span></button>' + slip) + "</article>";
    return '<section class="room room-record record-sec" id="record" aria-labelledby="record-h"><div class="record-wrap"><div class="record-intro"><h2 id="record-h">Entry record</h2>' +
      "<p>The 60-second version, printed at the desk. Stamp it if you want to leave a verdict, and tear off the slip to get in touch.</p>" +
      '<button class="btn-quiet" data-act="print">' + (ui.printed ? "Print it again" : "Print it") + "</button></div>" +
      '<div class="rec-printer" aria-hidden="false"><button class="printer-btn" data-act="print" aria-label="Print the entry record again">' + SPR.art("printer", SC) + "</button></div>" +
      '<div class="record-area" id="record-area">' + (ui.printed ? "" : '<p class="record-empty" id="record-empty">Nothing printed yet. Click the printer on the desk, or print it from here.</p>') +
      receipt + (ui.slipTorn ? slip : "") + "</div></div></section>";
  }

  // ----- fixed controls: the stamp bar and the pill nav -----
  const FACE = SPR.STAMP_FACE;
  // panels in art pixels: resting and pressed; the pressed sprite stands on the same bottom-centre
  const STAMPS = {
    approved: { rest: [4, 38, 32, 10], press: [5, 36, 31, 8], fs: [28, 26] },
    denied: { rest: [4, 38, 32, 10], press: [5, 34, 30, 8], fs: [40, 38] },
  };
  function stampArt(kind) {
    const k = STAMPS[kind], a = ART["stamp-" + kind], b = ART["stamp-" + kind + "-pressed"], word = kind === "approved" ? "APPROVED" : "DENIED";
    const layer = (cls, art, name, pnl, fs, dx, dy) => '<span class="' + cls + '" style="left:' + dx + "px;top:" + dy + 'px">' + SPR.art(name, SC) +
      '<span class="word" style="left:' + pnl[0] * SC + "px;top:" + pnl[1] * SC + "px;width:" + pnl[2] * SC + "px;height:" + pnl[3] * SC + "px;font-size:" + fs + 'px">' + word + "</span></span>";
    return '<span class="stamp-art" style="width:' + a.w * SC + "px;height:" + a.h * SC + 'px">' + layer("st-rest", a, "stamp-" + kind, k.rest, k.fs[0], 0, 0) +
      layer("st-press", b, "stamp-" + kind + "-pressed", k.press, k.fs[1], Math.floor((a.w - b.w) * SC / 2), (a.h - b.h) * SC) + "</span>";
  }
  const stampArtOld = (kind) => '<span class="stamp-art">' + SPR.stamp(kind, 2) + '<span class="word" style="left:' + FACE.x * 2 + "px;top:" + FACE.y * 2 + "px;width:" + FACE.w * 2 + "px;height:" + FACE.h * 2 + 'px">' +
    (kind === "approved" ? "APPROVED" : "DENIED") + "</span></span>";
  function renderFixed() {
    const slot = (kind) => '<button class="stamp-btn" data-kind="' + kind + '" aria-label="' + (kind === "approved" ? "Approved" : "Denied") + ' stamp" aria-describedby="stamp-keys"><span class="inkpad" aria-hidden="true">' +
      SPR.art(kind === "approved" ? "inkpad-green" : "inkpad-red", SC) + "</span>" + stampArt(kind) + "</button>";
    fixedRoot.innerHTML = '<p class="sr-only" id="stamp-status" aria-live="polite"></p>' +
      '<span class="mark ink ink-preview" id="ink-preview" hidden></span>' +
      '<div class="contact" id="contact" role="dialog" aria-modal="true" aria-labelledby="cm-title" hidden><div class="cm-back" data-act="cm-close"></div><div class="cm-device" id="cm-device"></div></div>' +
      '<div class="pills" id="pills"><div class="stamp-dock" id="stampdock"><div class="stampbar" id="stampbar" role="group" aria-label="Stamp tray">' +
      '<div class="bar-rail" id="bar-rail"><div class="rivets" aria-hidden="true"><i></i><i></i></div>' + slot("approved") + slot("denied") +
      '<p class="bar-note"><span class="point">Drag a stamp onto the paper, or tap one, then the paper.</span><span class="touch">Tap a stamp, then tap the paper.</span></p><div class="rivets" aria-hidden="true"><i></i><i></i></div>' +
      '<p class="sr-only" id="stamp-keys">Press Enter to pick it up, arrow keys to move it, B to move it over the stamp box, Enter to stamp and Escape to put it back.</p></div></div>' +
      '<button class="stamp-handle" id="stamp-handle" data-act="bar" aria-expanded="false" aria-controls="bar-rail">' + SPR.draw("pillstamp", 2) + "<span>Stamps</span>" +
      '<span class="caret" aria-hidden="true">' + SPR.draw("caretup", 2) + SPR.draw("caretdown", 2) + "</span></button></div>" +
      '<nav class="pill" id="pill" aria-label="Areas"><button data-act="step" data-dir="-1" aria-label="Previous area">' + SPR.draw("left", PX) +
      '</button><span class="area" id="area-name" aria-live="polite">Booth</span><button data-act="step" data-dir="1" aria-label="Next area">' + SPR.draw("right", PX) + "</button></nav></div>";
  }

  // ----- scroll scene: the booth builds, then the file unpacks -----
  const B_SHUT = 160, B_COUNTER = 120, B_LAMP = 70, B_BOARD = 70, BOOT = B_SHUT + B_COUNTER + B_LAMP + B_BOARD, UNIT = 110, DWELL = 320;
  const stageH = () => Math.max(window.innerHeight, 600);
  const unpackEnd = () => BOOT + ORDER().length * UNIT;
  const docTop = (el) => rectOf(el).top + window.scrollY;
  const FLOOR = 28;
  function sizeScene() {
    const sc = $("#scene"), stage = $("#stage");
    if (!sc) return;
    sc.style.height = "";
    if (isPhone()) { stage.style.height = ""; return; }
    stage.style.height = window.innerHeight - FLOOR + "px";
  }
  const deskScroll = (top, how) => { if (isPhone()) window.scrollTo({ top: top, behavior: how || "auto" }); };
  function sceneNow() {
    const n = ORDER().length;
    if (isPhone()) return { shut: 4, counter: 3, lamp: true, board: true, out: n };
    const px = 0, bf = ui.boothForced || ui.forced;
    let out = ui.forced ? n : clamp(Math.floor((px - BOOT) / UNIT) + 1, 0, n);
    if (ui.handled) out = Math.max(out, ui.maxOut);
    return {
      shut: bf ? 4 : clamp(Math.floor(px / (B_SHUT / 4)), 0, 4),
      counter: bf ? 3 : clamp(Math.floor((px - B_SHUT) / (B_COUNTER / 3)), 0, 3),
      lamp: bf || px >= B_SHUT + B_COUNTER + B_LAMP / 2,
      board: bf || px >= BOOT - 20,
      out: out,
    };
  }
  function applyScene(force) {
    if (!$("#scene")) return;
    const s = sceneNow(), prev = force ? {} : ui.scene || {}, n = ORDER().length;
    const sh = $("#shutter"), ct = $("#counter"), desk = $("#desk");
    if (s.shut !== prev.shut) { sh.style.transform = "translateY(" + -s.shut * 25 + "%)"; sh.classList.toggle("up", s.shut === 4); if (!force) FX.play("shutter"); }
    if (s.counter !== prev.counter) ct.style.transform = "translateX(" + -(3 - s.counter) * 34 + "%)";
    if (s.lamp !== prev.lamp) { setLampVisible(s.lamp); if (!force && s.lamp) FX.play("lamp"); }
    if (s.board !== prev.board) { if (s.board) board.start(); else board.blank(); }
    ORDER().forEach((id, i) => {
      const want = i < s.out, had = prev.out != null && i < prev.out;
      if (!force && want === had) return;
      if (want) { if (ui.stagger && !force) setTimeout(() => unpack(id, false, i), i * ui.stagger); else unpack(id, force, i); } else pack(id, force);
    });
    $("#envelope").classList.toggle("folded", s.out >= n);
    $("#unpack-hint").hidden = s.out >= n;
    $("#unpack-say").hidden = s.out > 0;
    if (s.shut === 4 && s.board && prev.board !== true) say("arrive");
    if (s.out >= n && prev.out < n) say("unpacked");
    ui.maxOut = Math.max(ui.maxOut, s.out);
    ui.scene = s;
  }

  // Where each paper lands: case folders in one stack on the left with their tabs fanned out,
  // the ID card, diploma and commendations across the middle overlapping only by their margins,
  // a clear lane on the right, and the bottom strip kept for the drawer front and the pill nav.
  // On short screens the whole layout shrinks a little so every paper starts on the desk.
  const LANE = 170, MID_X = 300, TOP = 50, BOTTOM = 68, SLOT = 22;
  const usable = () => { const d = $("#desk"); return { w: d.clientWidth, h: d.clientHeight, top: TOP, bottom: d.clientHeight - BOTTOM - 6 }; };
  // the file box sits in the bottom-left corner; each folder has its own slot in it
  function boxRect() { const b = $("#filebox"); return { x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight }; }
  // inside the tray (art pixels 6..47 across, 3..33 down at 3x): one 12px row per folder, its tab on top
  function slotPos(i) { const b = boxRect(); return [b.x + 7 * BX, b.y + (5 + 7 * i) * BX]; }
  // a folder in the box is reached by its tab; out on the desk, by the folder itself
  function filedFocus(el, filed) {
    el.tabIndex = filed ? -1 : 0;
    const t = $(".folder-tab", el);
    if (t) { t.tabIndex = filed ? 0 : -1; if (filed) t.removeAttribute("aria-hidden"); else t.setAttribute("aria-hidden", "true"); }
  }
  function placeFurniture() {
    const u = usable(), box = $("#filebox"), pr = $("#printer"), env = $("#envelope"), lamp = $("#lamp");
    box.style.left = "16px"; box.style.top = Math.max(8, u.bottom - box.offsetHeight) + "px";
    const front = $("#filebox-front"); front.style.left = box.style.left; front.style.top = box.style.top;
    // the lamp is anchored to the desk's top-right corner in CSS; keep the printer below its arm and clear of the Stamps tab
    const right = u.w - 14, below = lamp.offsetHeight + 8;
    pr.style.left = right - pr.offsetWidth + "px"; pr.style.top = Math.min(below, u.bottom - pr.offsetHeight) + "px";
    env.style.left = Math.round(u.w * 0.3) + "px"; env.style.top = u.top + 16 + "px";
    $("#unpack-hint").style.left = Math.round(u.w * 0.3) + env.offsetWidth + 24 + "px";
  }
  function computeFit() {
    const dk = $("#desk"); if (dk) dk.classList.toggle("short", !isPhone() && window.innerHeight < 760);
    if (isPhone()) { ui.fit = 1; return; }
    const u = usable(), avail = u.bottom - u.top, el = (id) => paperEl(id);
    const mids = ["id", "diploma", "honours"].map(el), midH = Math.max.apply(null, mids.map((e, k) => e.offsetHeight + [8, 16, 0][k]));
    const left = boxRect().w + 30, minW = mids[0].offsetWidth * 0.85 + mids[1].offsetWidth * 0.85 + mids[2].offsetWidth;
    ui.fit = 1;
    $("#desk").style.setProperty("--fit", ui.fit.toFixed(3));
  }
  function landing(id, el) {
    const u = usable(), i = caseIndex(id), s = ui.fit;
    if (i >= 0) return slotPos(i);
    const widths = ["id", "diploma", "honours"].map((k) => { const e = paperEl(k); return (e ? e.offsetWidth : 300) * s; });
    const left = boxRect().w + 32, avail = u.w - LANE - left, min = widths[0] * 0.85 + widths[1] * 0.85 + widths[2];
    const extra = Math.max(0, avail - min) / 3, q = min > avail ? Math.max(0.5, (avail - widths[2]) / (min - widths[2])) : 1;
    const gap0 = (widths[0] * 0.85 + Math.min(extra, widths[0] * 0.15 + 60)) * q, gap1 = (widths[1] * 0.85 + Math.min(extra, widths[1] * 0.15 + 60)) * q;
    const x0 = left + Math.min(extra, 40), k = { id: 0, diploma: 1, honours: 2 }[id], x = [x0, x0 + gap0, x0 + gap0 + gap1][k];
    const h = el ? el.offsetHeight : 0;
    return [Math.round(x), Math.round(Math.max(u.top, Math.min(u.top + [8, 16, 0][k], u.bottom - h)))];
  }
  function envCenter() { const e = $("#envelope"); return [e.offsetLeft + e.offsetWidth / 2, e.offsetTop + e.offsetHeight / 2]; }
  function setPos(el, x, y) { el.style.left = x + "px"; el.style.top = y + "px"; }
  function still(el, fn) { el.classList.remove("moving"); el.style.transition = "none"; fn(); void el.offsetWidth; el.style.transition = ""; }
  function unpack(id, instant, order) {
    const el = paperEl(id), st = pst(id);
    if (!el || st.away) return;
    if (st.x == null) { const p = landing(id, el); st.x = p[0]; st.y = p[1]; }
    if (isPhone()) { el.classList.remove("packed"); return; }
    const go = () => { el.classList.remove("packed"); setPos(el, st.x, st.y); el.style.zIndex = st.inBox ? 20 + caseIndex(id) : 10 + (order || 0); };
    if (instant) still(el, go); else { el.classList.add("moving"); go(); FX.play("rustle"); }
  }
  function pack(id, instant) {
    const el = paperEl(id), st = pst(id);
    if (!el || st.away || isPhone()) return;
    const c = envCenter(), go = () => { el.classList.add("packed"); setPos(el, Math.round(c[0] - el.offsetWidth / 2), Math.round(c[1] - el.offsetHeight / 2)); };
    if (instant) still(el, go); else { el.classList.add("moving"); go(); }
  }
  // the note pad sits on the desk's right side, under the mug; the sent note sticks to the desk edge
  function placeNotepad() {
    const pad = $("#notepad"), u = usable();
    if (!pad || isPhone()) return;
    if (ui.noteSent) { pad.hidden = true; return; }
    pad.hidden = false;
    const w = pad.offsetWidth || 99, h = pad.offsetHeight || 99, box = boxRect();
    const rect = (q) => { const e = $(q); return e && !e.hidden ? { x: e.offsetLeft, y: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight } : null; };
    const taken = [box, rect("#lamp"), rect("#printer"), rect('.sticker[data-sticker="mug"]'), rect('.sticker[data-sticker="plant"]')].filter(Boolean)
      .concat(paperIds().map((id) => { const e = paperEl(id), st = pst(id); if (!e || st.inBox || st.open) return null; const at = st.x != null ? [st.x, st.y] : landing(id, e); return { x: at[0], y: at[1], w: e.offsetWidth, h: e.offsetHeight }; }).filter(Boolean));
    const free = (x, y) => y >= u.top && y + h <= u.bottom && x >= 0 && x + w <= u.w && !taken.some((r) => x < r.x + r.w + 4 && r.x < x + w + 4 && y < r.y + r.h + 4 && r.y < y + h + 4);
    const tries = [];
    for (let y = u.bottom - h; y >= u.top; y -= 12) for (let x = u.w - w - 12; x >= 0; x -= 12) tries.push([x, y]);
    const spot = tries.find((t) => free(t[0], t[1]));
    const home = spot ? $("#desk") : $("#record");
    // on a desk too short for it, the pad waits in the Records room, left of the record
    if (pad.parentElement !== home) { home.appendChild(pad); home.appendChild($("#vnote")); }
    pad.classList.toggle("in-records", !spot);
    if (spot) setPos(pad, spot[0], spot[1]); else setPos(pad, 24, 64);
  }
  function placeStickers() {
    const u = usable(), w = u.w, pr = $("#printer"), box = boxRect(), mugEl = $('.sticker[data-sticker="mug"]');
    const mugBelow = pr.offsetTop + pr.offsetHeight + 8 + mugEl.offsetHeight <= u.bottom;
    const spots = {
      mug: mugBelow ? [pr.offsetLeft + pr.offsetWidth - mugEl.offsetWidth, pr.offsetTop + pr.offsetHeight + 8] : [pr.offsetLeft - mugEl.offsetWidth - 12, pr.offsetTop + 6],
      pen: [box.x + box.w + 18, u.bottom - 130],
    };
    $$(".sticker", $("#desk")).forEach((el) => {
      const id = el.dataset.sticker;
      if (id === "plant") return;
      const p = ui.stickers[id] || spots[id];
      setPos(el, clamp(p[0], 0, w - el.offsetWidth), clamp(p[1], u.top, u.bottom - el.offsetHeight));
    });
    placePlant(); placeNotepad();
    const mug = mugEl, ring = $(".cup-ring");
    if (ring && mug) setPos(ring, clamp(mug.offsetLeft - 48, 0, w - 50), clamp(mug.offsetTop + mug.offsetHeight - 36, u.top, u.bottom - 40));
  }
  // The plant goes wherever it fits without touching the box, a paper or another object; on a desk too short for it, it stays off.
  function placePlant() {
    const el = $('.sticker[data-sticker="plant"]'), u = usable();
    if (!el) return;
    if (ui.stickers.plant) { el.hidden = false; setPos(el, ui.stickers.plant[0], ui.stickers.plant[1]); return; }
    const w = el.offsetWidth || 162, h = el.offsetHeight || 153, box = boxRect();
    const taken = [box].concat(paperIds().map((id) => { const e = paperEl(id), st = pst(id); if (!e || st.inBox || st.open) return null; const at = st.x != null ? [st.x, st.y] : landing(id, e); return { x: at[0], y: at[1], w: e.offsetWidth * ui.fit, h: e.offsetHeight * ui.fit }; }).filter(Boolean))
      .concat(["#printer", "#lamp", '.sticker[data-sticker="mug"]', '.sticker[data-sticker="pen"]'].map((q) => { const e = $(q); return e ? { x: e.offsetLeft, y: e.offsetTop, w: e.offsetWidth, h: e.offsetHeight } : null; }).filter(Boolean));
    const free = (x, y) => y >= u.top && y + h <= u.bottom && x >= 0 && x + w <= u.w && !taken.some((r) => x < r.x + r.w && r.x < x + w && y < r.y + r.h && r.y < y + h);
    const tries = [[12, u.top + 4], [12, box.y - h - 8]];
    for (let y = u.top + 4; y + h <= u.bottom; y += 24) for (let x = 12; x + w <= u.w; x += 24) tries.push([x, y]);
    const spot = tries.find((t) => free(t[0], t[1]));
    el.hidden = !spot;
    if (spot) setPos(el, spot[0], spot[1]);
  }
  function relayout() {
    if (isPhone() || !$("#desk")) return;
    placeFurniture();
    computeFit();
    paperIds().forEach((id) => {
      const el = paperEl(id), st = pst(id);
      if (!el || st.open || st.away) return;
      if (st.inBox) { const p = slotPos(caseIndex(id)); st.x = p[0]; st.y = p[1]; }
      else if (!ui.handled || st.x == null) { const p = landing(id, el); st.x = p[0]; st.y = p[1]; }
      if (!el.classList.contains("packed")) still(el, () => setPos(el, st.x, st.y));
    });
  }
  function onResize() {
    placeTray();
    if (!$("#desk")) return;
    sizeScene();
    updateBar();
    if (isPhone()) return;
    relayout();
    paperIds().forEach((id) => { const el = paperEl(id); if (el && pst(id).open) placeOpen(el); });
    placeStickers(); checkLamp();
    layoutDrawer(false);
    $$(".pobj").forEach(placePobj); drawHands(); fitPinboard();
    applyScene(true);
  }

  // ----- handling papers -----
  function raise(el) {
    if (topZ > 600) {
      // keep the pile's order but pull the numbers back down, so the lamp light and bar stay on top
      $$("#desk .paper, #desk .sticker").sort((a, b) => (+a.style.zIndex || 0) - (+b.style.zIndex || 0)).forEach((e, k) => { e.style.zIndex = 10 + k; });
      topZ = 10 + $$("#desk .paper, #desk .sticker").length;
    }
    el.style.zIndex = ++topZ;
    if (el.classList.contains("paper")) { ui.front = el.dataset.id; refreshSkills(); }
  }
  function markHandled() { if (!ui.handled) { ui.handled = true; ui.maxOut = Math.max(ui.maxOut, (ui.scene && ui.scene.out) || 0); } }
  // An open file takes the left side of the desk, over the box and the ID card, as tall as the desk allows.
  // The diploma and commendations stay where they are and stay readable.
  function placeOpen(el) {
    if (isPhone()) return;
    const u = usable(), st = pst(el.dataset.id), i = caseIndex(el.dataset.id), dip = paperEl("diploma");
    const limit = dip && !pst("diploma").away ? dip.offsetLeft - 14 : u.w * 0.55;
    const w = Math.round(clamp(limit - 16, 440, 760));
    el.style.width = w + "px"; el.style.height = u.bottom - 4 + "px";
    st.x = 16; st.y = 4;
    setPos(el, st.x, st.y);
    st.pages = paginate(i, el); st.page = Math.min(st.page, st.pages.length - 1);
    el.innerHTML = caseInner(i);
  }
  function openCase(id) {
    const el = paperEl(id), st = pst(id), i = caseIndex(id);
    if (!el || st.open) return;
    markHandled();
    if (st.inBox) takeOut(id, true);
    say("firstcase");
    st.open = true; st.page = 0; st.home = [st.x, st.y];
    el.classList.add("open"); el.setAttribute("aria-expanded", "true");
    el.innerHTML = caseInner(i);
    if (isPhone()) { st.pages = paginate(i, el); el.innerHTML = caseInner(i); }
    else placeOpen(el);
    raise(el); FX.play("lift");
    el.focus({ preventScroll: true });
    say("case:" + i);
  }
  function closeCase(id, quiet) {
    const el = paperEl(id), st = pst(id);
    if (!el || !st.open) return;
    st.open = false; st.page = 0; st.pages = null;
    el.classList.remove("open"); el.setAttribute("aria-expanded", "false"); el.style.width = ""; el.style.height = "";
    el.innerHTML = folderInner(caseIndex(id));
    if (!isPhone() && st.home && !st.inBox) { st.x = st.home[0]; st.y = st.home[1]; el.classList.add("moving"); setPos(el, st.x, st.y); }
    if (!quiet) { FX.play("settle"); el.focus({ preventScroll: true }); }
  }
  function turn(part, swap) {
    if (reduced() || !part) { swap(); return; }
    part.classList.add("flip-out");
    setTimeout(() => { swap(); if (part.isConnected) part.classList.remove("flip-out"); }, 95);
  }
  // A sheet turning over inside the folder: the current page lifts from its right edge and turns over its
  // left edge in four steps, with the next page already visible underneath. Going back reverses it.
  function startSheet(id, dir) {
    const el = paperEl(id), st = pst(id), to = st.page + dir, sheets = $(".sheets", el), body = $(".paper-body", el);
    const sheet = document.createElement("div");
    sheet.className = "sheet " + (dir > 0 ? "fwd" : "back");
    sheet.innerHTML = '<div class="sheet-face sheet-front"><div class="paper-body">' + (dir > 0 ? st.pages[st.page] : st.pages[to]) + '</div></div><div class="sheet-face sheet-back"></div>';
    if (dir > 0) body.innerHTML = st.pages[to];
    sheets.appendChild(sheet);
    el.classList.add("turning");
    return sheet;
  }
  function finishSheet(id, sheet, dir, complete) {
    const el = paperEl(id), st = pst(id), i = caseIndex(id), to = st.page + dir;
    sheet.style.transform = "";
    if (complete) sheet.classList.add("go");
    setTimeout(() => {
      if (complete) st.page = to;
      el.classList.remove("turning");
      el.innerHTML = caseInner(i);
      focusPageControl(el, dir);
    }, 320);
  }
  function flipCase(id, dir) {
    const el = paperEl(id), st = pst(id), i = caseIndex(id), n = (st.pages || [1]).length;
    dir = dir || 1;
    const to = st.page + dir;
    if (to < 0 || to >= n) return;
    FX.play("flip");
    if (reduced() || isPhone() || !$(".sheets", el)) { st.page = to; el.innerHTML = caseInner(i); focusPageControl(el, dir); return; }
    const sheet = startSheet(id, dir);
    void sheet.offsetWidth;
    finishSheet(id, sheet, dir, true);
  }
  function focusPageControl(el, dir) {
    const b = $('.pg-btn[data-dir="' + dir + '"]:not([disabled])', el) || $(".pg-btn:not([disabled])", el) || $(".corner", el);
    if (b) b.focus({ preventScroll: true });
  }
  function takeOut(id, instant) {
    const el = paperEl(id), st = pst(id), i = caseIndex(id);
    if (!st.inBox) return;
    st.inBox = false;
    el.classList.remove("filed"); filedFocus(el, false);
    const u = usable(), out = st.outPos || [boxRect().x + 8 + (i % 3) * 18, Math.max(u.top + 4, boxRect().y - 150 + (i % 3) * 14)];
    st.x = out[0]; st.y = out[1];
    if (instant) still(el, () => setPos(el, st.x, st.y)); else { el.classList.add("moving"); setPos(el, st.x, st.y); FX.play("lift"); }
    raise(el);
  }
  function fileBack(id, quiet) {
    const el = paperEl(id), st = pst(id), i = caseIndex(id);
    if (!el || i < 0) return;
    if (st.open) closeCase(id, true);
    if (!st.inBox) st.outPos = [st.x, st.y];
    st.inBox = true;
    el.classList.add("filed", "moving"); filedFocus(el, true);
    const p = slotPos(i); st.x = p[0]; st.y = p[1];
    setPos(el, st.x, st.y);
    el.style.setProperty("--tilt", "0deg");
    el.style.zIndex = 20 + i;
    if (!quiet) FX.play("filebox");
  }
  function putAllBack() {
    const out = caseIds().filter((id) => !pst(id).inBox || pst(id).open);
    if (!out.length) return;
    out.forEach((id, k) => setTimeout(() => fileBack(id, true), reduced() ? 0 : k * 40));
    FX.play("filebox");
  }
  function putAway(id, prev) {
    if (caseIndex(id) >= 0) { fileBack(id); return; }
    const el = paperEl(id), st = pst(id);
    if (st.open) closeCase(id);
    st.away = true; st.prev = prev;
    el.classList.add("leaving"); FX.play("rustle");
    setTimeout(() => { el.classList.remove("leaving"); el.classList.add("away"); renderPutAway(); }, reduced() ? 0 : 210);
  }
  function returnPaper(id) {
    const el = paperEl(id), st = pst(id), prev = st.prev || { x: MID_X, y: TOP };
    st.away = false; st.x = prev.x; st.y = prev.y;
    el.classList.remove("away", "packed");
    still(el, () => setPos(el, prev.x, -el.offsetHeight));
    el.classList.add("moving"); setPos(el, prev.x, prev.y);
    raise(el); renderPutAway(); FX.play("rustle");
    el.focus({ preventScroll: true });
  }
  function renderPutAway() {
    const box = $("#putaway"), away = paperIds().filter((id) => pst(id).away);
    if (box) box.innerHTML = away.map((id) => '<button class="chip" data-act="return" data-id="' + id + '">' + esc(paperLabel(id)) + "</button>").join("");
    const hint = $("#counter-hint"); if (hint) hint.hidden = away.length > 0;
  }
  // Papers, stickers and the torn slip stay wholly inside whatever they sit on.
  function moveTo(el, x, y) {
    const box = el.parentElement, s = el.classList.contains("paper") && !el.classList.contains("open") ? ui.fit : 1;
    const w = el.offsetWidth * s, h = el.offsetHeight * s;
    x = clamp(x, 0, Math.max(0, box.clientWidth - w));
    y = clamp(y, 0, Math.max(0, box.clientHeight - Math.min(h, box.clientHeight)));
    setPos(el, x, y);
    if (el.classList.contains("paper")) { const st = pst(el.dataset.id); st.x = x; st.y = y; st.nudged = null; }
    else if (el.dataset.sticker) ui.stickers[el.dataset.sticker] = [x, y];
    else if (el.id === "slip") ui.slipPos = [x, y];
  }

  // ----- the two desk drawers, Skills and Personal: one drawer sprite, only the front shows until it opens -----
  const DW_FRONT = 16, DW_FLOOR = { x: 14, y: 14, w: 182, h: 90 };
  // Thea's things in the Personal drawer, at their spots on the drawer floor (art pixels)
  const POBJ = {
    bottle: { art: "cola-bottle", x: 22, y: 24, label: "Glass bottle", hint: "Press Enter to nudge it." },
    watch: { art: "watch", x: 30, y: 68, rot: true, label: "Watch, showing your local time", hint: "Press Enter to slow time down." },
    sketchbook: { art: "sketchbook-closed", x: 150, y: 34, label: "Sketchbook", hint: "Press Enter to open it." },
  };
  const noteOf = (id) => ((state.effects || []).find((e) => e.id === id) || {}).note || "";
  function pobjHTML(id) {
    const o = POBJ[id], a = ART[o.art];
    return '<span class="pobj p-' + id + (o.rot ? " rot" : "") + '" data-p="' + id + '" data-drag role="button" tabindex="0" aria-label="' + esc(o.label + ". " + o.hint + " Press M to move it between the drawer and the desk.") +
      '" style="--aw:' + a.w + ";--ah:" + a.h + '">' + SPR.art(o.art, SC) + (id === "watch" ? '<canvas class="hands" width="' + a.w + '" height="' + a.h + '" aria-hidden="true"></canvas>' : "") + "</span>";
  }
  const TABC = ['#8fa7b8', '#b9a2c4', '#8fb39a', '#d9b26a', '#c98b7a', '#a7b78a', '#9a9a8c'];
  const FS = 4; // closed fronts on the desk edge are drawn at 4x so the plate fits its label
  const floorHTML = (id) => '<div class="dw-floor dw-floor-' + id + '" id="' + (id === "skills" ? "drawer-box" : "dw-things") + '">' +
    (id === "skills" ? (isPhone() ? skillsHTML() : cardsHTML()) : Object.keys(POBJ).map(pobjHTML).join("")) + "</div>";
  function drawerHTML(id, label) {
    const a = ART.drawer, floorId = id === "skills" ? "drawer-box" : "dw-things";
    return '<div class="dw dw-' + id + '" id="dw-' + id + '" data-dw="' + id + '" style="--dw-w:' + a.w * FS + "px;--dw-h:" + a.h * FS + 'px">' + SPR.art("drawer", FS, "dw-art") +
      (isPhone() ? floorHTML(id) : "") +
      '<button class="dw-front" data-act="dw" data-dw="' + id + '" data-tag="' + label + '" aria-label="' + label + ' drawer" aria-expanded="false" aria-controls="' + floorId + '"></button></div>';
  }
  // the open drawer, pulled out toward the visitor: one big drawer whose floor shows the chosen drawer's contents
  function bigDrawerHTML() {
    if (isPhone()) return "";
    return '<div class="dw-big" id="dw-big" role="region" aria-label="Open drawer"><img class="dw-big-art" id="dw-big-art" alt="" aria-hidden="true">' + floorHTML("skills") + floorHTML("personal") +
      '<button class="dw-big-front" id="dw-big-front" data-act="dw-close" aria-label="Close the drawer"></button></div>';
  }
  // Skills as an index-card file: one card per group, standing back to front, tabs staggered
  function cardsHTML() {
    const p = frontCase();
    return '<div class="cardfile">' + state.skills.map((g, i) => {
      const used = p && g.items.some((s) => uses(p.stack, s)), hot = ui.hot && g.items.includes(ui.hot);
      return '<div class="icard ic-' + ["left", "mid", "right"][i % 3] + (ui.liftCard === i ? " lifted" : "") + '" style="--i:' + i + '"><button class="ic-tab' + (used ? " used" : "") + (hot ? " hot" : "") +
        '" data-act="card" data-i="' + i + '" aria-expanded="' + (ui.liftCard === i) + '">' + esc(g.group) + "</button></div>";
    }).join("") + "</div>";
  }
  function liftHTML(i) {
    const g = state.skills[i], p = frontCase();
    return '<div class="sk-lift-card" role="dialog" aria-label="' + esc(g.group) + ' skills"><p class="sl-tab">' + esc(g.group) + '</p><div class="sl-chips">' +
      g.items.map((s) => '<button class="sk' + (ui.hot === s ? " hot" : "") + (p && uses(p.stack, s) ? " used" : "") + '" data-act="skill" data-s="' + esc(s) + '" aria-pressed="' + (ui.hot === s) + '">' + esc(s) + "</button>").join("") +
      "</div>" + usedInHTML(g) + '<button class="btn-quiet sl-back" data-act="card-back">Back in the drawer</button></div>';
  }
  function usedInHTML(g) {
    const sk = ui.hot && g.items.includes(ui.hot) ? ui.hot : null;
    if (!sk) return '<p class="sl-note">Pick a skill to see which case files used it.</p>';
    const files = state.projects.map((x, i) => [x, i]).filter((x) => uses(x[0].stack, sk));
    return '<div class="sl-used"><span class="sl-used-lab">Used in:</span>' + (files.length ? files.map((x) => '<button class="sl-file" data-act="open-from-card" data-id="case-' + x[1] + '">' + esc(shortName(x[0])) + "</button>").join("") : "<span>no case file yet</span>") + "</div>";
  }
  // the card sits centred over the open drawer, with the room dimmed a little behind it
  function placeLift() {
    const ov = $("#sk-lift"), big = $("#dw-big");
    if (!ov || ov.hidden || !big) return;
    const r = rectOf(big), card = $(".sk-lift-card", ov), w = Math.min(980, r.width - 48, window.innerWidth - 32);
    card.style.width = w + "px";
    const h = card.offsetHeight, top = clamp(r.top + (Math.min(r.bottom, window.innerHeight - 84) - r.top - h) / 2, 40, window.innerHeight - 84 - h);
    card.style.left = Math.round(r.left + (r.width - w) / 2) + "px"; card.style.top = Math.round(top) + "px";
  }
  function liftCard(i) {
    let ov = $("#sk-lift");
    if (!ov) { ov = document.createElement("div"); ov.id = "sk-lift"; ov.className = "sk-lift"; fixedRoot.appendChild(ov); }
    if (i == null) { ov.hidden = true; ov.innerHTML = ""; const was = ui.liftCard; ui.liftCard = null; refreshSkills(); const t = $('.ic-tab[data-i="' + was + '"]'); if (t) t.focus({ preventScroll: true }); return; }
    ui.liftCard = i; FX.play("flip");
    ov.innerHTML = liftHTML(i); ov.hidden = false;
    placeLift();
    refreshSkills();
    const first = $(".sk", ov) || $(".sl-back", ov); if (first) first.focus({ preventScroll: true });
  }
  // Closed fronts sit side by side in the bottom strip, left of the pill nav. When there is not room for a whole
  // front, the drawer shows a centred slice of it. An open drawer shows the whole sprite, kept inside the desk.
  // the drawer art stretched sideways by repeating plain columns either side of the handle, never by fractional scaling
  const DWIMG = new Image(); DWIMG.src = ART.drawer.src;
  const dwCache = {};
  function stretchedDrawer(cols) {
    if (dwCache[cols]) return dwCache[cols];
    const a = ART.drawer, c = document.createElement("canvas"), g = c.getContext("2d"), extra = cols - a.w, eL = Math.floor(extra / 2), eR = extra - eL;
    c.width = cols; c.height = a.h;
    let dx = 0;
    const col = (sx) => { g.drawImage(DWIMG, sx, 0, 1, a.h, dx, 0, 1, a.h); dx++; };
    for (let x = 0; x < 80; x++) col(x);
    for (let k = 0; k < eL; k++) col(40 + (k % 40));
    for (let x = 80; x < 130; x++) col(x);
    for (let k = 0; k < eR; k++) col(130 + (k % 40));
    for (let x = 130; x < a.w; x++) col(x);
    return (dwCache[cols] = c.toDataURL());
  }
  function dwGeom() {
    const vw = window.innerWidth, vh = window.innerHeight, a = ART.drawer;
    let sc = 2;
    for (let k = 8; k >= 2; k--) if (a.h * k <= vh - 200 && a.w * k <= Math.min(vw * 0.8, 1100)) { sc = k; break; }
    const cols = Math.max(a.w, Math.floor(Math.min(vw * 0.75, 1100) / sc)), extra = cols - a.w;
    const mapX = (x) => (x < 80 ? x : x < 130 ? x + Math.floor(extra / 2) : x + extra);
    return { sc: sc, cols: cols, extra: extra, mapX: mapX, w: cols * sc, h: a.h * sc };
  }
  function layoutDrawer(animate) {
    const desk = $("#desk"), dws = desk ? $$(".dw", desk) : [];
    if (!dws.length) return;
    dws.forEach((el) => {
      const open = ui.dwOpen === el.dataset.dw;
      el.classList.toggle("pulled", open && !isPhone());
      $(".dw-front", el).setAttribute("aria-expanded", String(open || isPhone()));
    });
    if (isPhone()) return;
    // closed fronts: side by side on the desk edge, left of the pills, as wide a slice of the front as fits
    const W = ART.drawer.w * FS, H = ART.drawer.h * FS, F = DW_FRONT * FS, dr = rectOf(desk), pills = $("#pills");
    let right = desk.clientWidth / 2 - 200;
    if (pills && !pills.classList.contains("solo") && getComputedStyle(pills).display !== "none") right = rectOf(pills).left - dr.left - 16;
    const gap = 12, crop = clamp(Math.floor((right - 16 - gap) / 2 / FS) * FS, 40 * FS, W);
    dws.forEach((el, k) => {
      el.style.left = Math.round(16 + crop / 2 + k * (crop + gap) - W / 2) + "px";
      el.style.top = desk.clientHeight - Math.round((BOTTOM - F) / 2) - H + "px";
      el.style.setProperty("--crop", (W - crop) / 2 + "px");
      el.style.setProperty("--hide", H - F + "px");
    });
    // the open drawer slides down from under the desk edge, and the room pans up to show all of it above the pills
    const big = $("#dw-big"), pan = $("#room-pan"), stage = $("#stage");
    if (!big || !pan) return;
    const gm = dwGeom(), apply = () => {
      const art = $("#dw-big-art");
      art.src = stretchedDrawer(gm.cols); art.width = gm.w; art.height = gm.h;
      big.style.width = gm.w + "px"; big.style.height = gm.h + "px";
      // line the drawer up under the front that was pulled, kept on screen
      const fr = ui.dwOpen && $("#dw-" + ui.dwOpen), dr2 = rectOf(desk);
      const cx = fr ? rectOf(fr).left - dr2.left + fr.offsetWidth / 2 : window.innerWidth / 2;
      big.style.left = Math.round(clamp(cx - gm.w / 2, 8, window.innerWidth - gm.w - 8)) + "px";
      big.style.setProperty("--front-h", DW_FRONT * gm.sc + "px");
      big.style.setProperty("--ps", gm.sc);
      big.style.setProperty("--fl-x", 14 * gm.sc + "px"); big.style.setProperty("--fl-y", 14 * gm.sc + "px");
      big.style.setProperty("--fl-w", (182 + gm.extra) * gm.sc + "px"); big.style.setProperty("--fl-h", 90 * gm.sc + "px");
      $$(".pobj", $("#dw-things")).forEach(placePobj);
    };
    if (DWIMG.complete) apply(); else DWIMG.onload = apply;
    const open = !!ui.dwOpen;
    big.classList.toggle("sliding", !!animate);
    big.classList.toggle("open", open);
    big.dataset.dw = ui.dwOpen || "";
    $$(".dw-floor", big).forEach((f) => { const on = open && f.classList.contains("dw-floor-" + ui.dwOpen); f.hidden = !on; f.inert = !on; });
    pan.classList.toggle("sliding", !!animate);
    pan.style.setProperty("--pan", open ? Math.max(0, stage.offsetHeight + gm.h + 84 - window.innerHeight) + "px" : "0px");
  }
  function setDrawer(id) {
    const was = ui.dwOpen;
    if (was === id) return;
    ui.dwOpen = id;
    if (id) { markHandled(); say(id === "skills" ? "drawer" : "personal"); }
    FX.play("dwslide");
    layoutDrawer(true);
    if (!id) { hideNote(); if (ui.liftCard != null) liftCard(null); }
  }
  function closeDrawer(noFocus) {
    const id = ui.dwOpen;
    if (!id) return;
    if (ui.liftCard != null) liftCard(null);
    setDrawer(null);
    if (!noFocus) { const f = $("#dw-" + id + " .dw-front"); if (f) f.focus({ preventScroll: true }); }
  }
  function refreshSkills() {
    const b = $("#drawer-box"); if (b) b.innerHTML = isPhone() ? skillsHTML() : cardsHTML();
    const ov = $("#sk-lift"); if (ov && !ov.hidden && ui.liftCard != null) { const f = document.activeElement && document.activeElement.dataset && document.activeElement.dataset.s; ov.innerHTML = liftHTML(ui.liftCard); placeLift(); if (f) { const k = $('.sk[data-s="' + CSS.escape(f) + '"]', ov); if (k) k.focus({ preventScroll: true }); } }
  }

  // ----- Thea's things: notes, the watch, the bottle and the sketchbook -----
  function showNote(el) {
    const n = $("#pnote"), text = noteOf(el.dataset.p), desk = $("#desk");
    if (!n || !text || isPhone()) return;
    n.textContent = text; n.hidden = false;
    const r = rectOf(el), d = rectOf(desk), w = n.offsetWidth, h = n.offsetHeight;
    let x = r.right - d.left + 12, y = r.top - d.top;
    if (x + w > desk.clientWidth - 8) x = r.left - d.left - w - 12;
    n.style.left = clamp(x, 8, desk.clientWidth - w - 8) + "px"; n.style.top = clamp(y, 8, desk.clientHeight - h - 8) + "px";
  }
  function hideNote() { const n = $("#pnote"); if (n) n.hidden = true; }
  // the hands are pixel lines on a canvas the size of the sprite, so they turn with it and stay on the art grid
  const WATCH = { cx: 16.5, cy: 50 };
  let slow = null;
  function shownTime() {
    const now = new Date();
    if (!slow) return now;
    return new Date(slow.from + Math.floor((Date.now() - slow.from) / 3000) * 1000);
  }
  function drawHands() {
    const t = shownTime(), cs = getComputedStyle(document.documentElement);
    const ink = cs.getPropertyValue("--ink").trim(), red = cs.getPropertyValue("--stamp-red").trim();
    $$("canvas.hands").forEach((c) => {
      const g = c.getContext("2d");
      g.clearRect(0, 0, c.width, c.height);
      const line = (turns, len, thick, col) => {
        const a = turns * 2 * Math.PI - Math.PI / 2, dx = Math.cos(a), dy = Math.sin(a);
        g.fillStyle = col;
        for (let k = 0; k <= len; k++) {
          const x = Math.floor(WATCH.cx + dx * k), y = Math.floor(WATCH.cy + dy * k);
          g.fillRect(x, y, 1, 1);
          if (thick > 1) { if (Math.abs(dx) > Math.abs(dy)) g.fillRect(x, y - 1, 1, 1); else g.fillRect(x - 1, y, 1, 1); }
        }
      };
      const sec = t.getSeconds(), min = t.getMinutes() + sec / 60, hr = (t.getHours() % 12) + min / 60;
      line(hr / 12, 6, 2, ink); line(min / 60, 9, 1, ink); line(sec / 60, 10, 1, red);
      g.fillStyle = ink; g.fillRect(Math.floor(WATCH.cx) - 1, Math.floor(WATCH.cy) - 1, 2, 2);
    });
  }
  let lastSec = -1;
  setInterval(() => {
    if (document.hidden || !$("canvas.hands")) return;
    const s = shownTime().getSeconds();
    if (s === lastSec) return;
    lastSec = s; drawHands();
    if (ui.dwOpen === "personal" || $("#desk > .pobj.p-watch")) FX.play("wtick");
  }, 250);
  // Slow time: about 12 seconds where the second hand ticks every 3 seconds, animations run at a third of their
  // speed, the desk dims a little, the lamp pool warms a step and sounds drop in pitch. Then it eases back.
  function slowAnimations() { document.getAnimations().forEach((a) => { if (a.playbackRate !== 1 / 3) a.playbackRate = 1 / 3; }); }
  function setSlow(on) {
    const stage = $("#stage");
    if (on && !slow) {
      slow = { from: Date.now() - (Date.now() % 1000), timer: setTimeout(() => setSlow(false), 12000), loop: setInterval(slowAnimations, 150) };
      if (stage) stage.classList.add("slow");
      FX.setRate(0.9); slowAnimations();
    } else if (!on && slow) {
      clearTimeout(slow.timer); clearInterval(slow.loop); slow = null;
      if (stage) stage.classList.remove("slow");
      FX.setRate(1);
      document.getAnimations().forEach((a) => { a.playbackRate = 1; });
      drawHands();
    }
  }
  function usePobj(el) {
    const id = el.dataset.p;
    showNote(el);
    if (id === "watch") { if (!reduced()) setSlow(!slow); return; }
    if (id === "bottle") {
      FX.play("fizz");
      if (reduced()) return;
      el.classList.remove("wobble"); void el.offsetWidth; el.classList.add("wobble");
      setTimeout(() => el.classList.remove("wobble"), 260);
      return;
    }
    if (id === "sketchbook") { say("sketchbook"); if ((state.sketches || []).length) openSketchbook(); }
  }
  // move a thing between its drawer spot and the desk (dragging does the same with the pointer)
  function pobjToDesk(el, x, y) {
    const desk = $("#desk");
    el.classList.remove("rot"); el.classList.add("sticker", "on-desk");
    el.dataset.sticker = el.dataset.p;
    desk.appendChild(el);
    moveTo(el, x, y); raise(el); drawHands();
  }
  function pobjHome(el) {
    const id = el.dataset.p, o = POBJ[id], fl = $("#dw-things");
    el.classList.remove("sticker", "on-desk", "held"); if (o.rot) el.classList.add("rot");
    delete el.dataset.sticker; delete ui.stickers[id];
    el.style.zIndex = "";
    fl.appendChild(el);
    placePobj(el); drawHands();
  }
  function placePobj(el) {
    const o = POBJ[el.dataset.p];
    if (isPhone()) return;
    const gm = dwGeom();
    el.style.left = (gm.mapX(o.x) - DW_FLOOR.x) * gm.sc + "px"; el.style.top = (o.y - DW_FLOOR.y) * gm.sc + "px";
  }
  function movePobj(el) {
    if (isPhone()) return;
    if (el.classList.contains("on-desk")) { pobjHome(el); if (ui.dwOpen !== "personal") setDrawer("personal"); }
    else { const u = usable(); pobjToDesk(el, Math.round(u.w / 2 - 60), u.top + 40); }
    FX.play("tap"); el.focus({ preventScroll: true });
  }
  // the sketchbook opens over the desk like a case file, two sketches to a spread; until there are sketches it stays shut
  let sketchSpread = 0;
  function openSketchbook() {
    const list = state.sketches || [];
    if (!list.length) return;
    let ov = $("#sketchbook-view");
    if (!ov) { ov = document.createElement("div"); ov.className = "sk-view"; ov.id = "sketchbook-view"; $("#desk").appendChild(ov); }
    const a = ART["sketchbook-open"], desk = $("#desk"), sc = Math.max(2, Math.min(8, Math.floor(Math.min((desk.clientWidth - 80) / a.w, (desk.clientHeight - 140) / a.h))));
    const page = (src, x0, x1) => src ? '<img class="sketch" src="' + esc(src) + '" alt="A sketch by Thea" style="left:' + (x0 * sc + 2) + "px;top:" + (3 * sc + 2) + "px;width:" + ((x1 - x0) * sc - 4) + "px;height:" + (53 * sc - 4) + 'px">' : "";
    ov.innerHTML = '<div class="sk-book" style="width:' + a.w * sc + "px;height:" + a.h * sc + 'px">' + SPR.art("sketchbook-open", sc) +
      page(list[sketchSpread * 2], 5, 47) + page(list[sketchSpread * 2 + 1], 53, 95) + "</div>" +
      '<div class="sk-nav"><button class="btn-quiet" data-act="sk-turn" data-dir="-1"' + (sketchSpread ? "" : " disabled") + '>Turn back</button><button class="btn-quiet" data-act="sk-close">Close sketchbook</button><button class="btn-quiet" data-act="sk-turn" data-dir="1"' + ((sketchSpread + 1) * 2 < list.length ? "" : " disabled") + ">Turn the page</button></div>";
    ov.hidden = false;
    const b = $(".sk-nav button:not([disabled])", ov); if (b) b.focus({ preventScroll: true });
  }

  // ----- the stamps -----
  // Stamps live in their slots on the bar. Drag one onto a paper and let go: it presses down, leaves ink exactly
  // under its face, then slides back to its slot. Let go anywhere else and it just slides back.
  const onScreen = (el) => { if (!el || (!el.offsetParent && getComputedStyle(el).position !== "fixed")) return false; const r = rectOf(el); return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth; };
  function stampables() { return $$(".stampable").filter((s) => onScreen(s) && $(".stamp-box", s) && !s.closest(".pp-leaf.turned")); }
  function stampableAt(x, y) { return stampables().find((s) => inside(rectOf(s), x, y)) || null; }
  function stampableShown() {
    if ($("#intro")) return ui.introStep >= 1 && !ui.introDone;
    if (ui.view !== "desk" || editing || ui.contactOpen) return false;
    const r = receiptEl();
    if (!r || r.hidden || !ui.printed) return false;
    const b = rectOf(r), box = $(".stamp-box", r);
    if (!box) return false;
    // open only once the record's stamp box is clear of where the tray would sit
    const bb = rectOf(box);
    return b.bottom > 120 && bb.top >= 8 && bb.bottom <= trayTopOpen() - 16;
  }
  // the top edge of the tray when it is open, whether or not it is open now
  function trayTopOpen() { const g = $("#pills"), bar = $("#stampbar"); return g && bar ? rectOf(g).top - 8 - bar.offsetHeight : window.innerHeight; }
  function updateBar() {
    const bar = $("#stampbar");
    if (!bar) return;
    const auto = stampableShown() || !!held;
    document.documentElement.classList.toggle("holding-stamp", !!held);
    if (auto !== ui.barAuto) { ui.barAuto = auto; ui.barPinned = null; }
    const open = ui.barPinned == null ? auto : ui.barPinned;
    bar.classList.toggle("out", open);
    $("#stamp-handle").setAttribute("aria-expanded", String(open));
    $("#bar-rail").inert = !open;
    if (open) placeTray();
  }
  function placeTray() {
    const dock = $("#stampdock"), bar = $("#stampbar");
    if (!dock || !bar) return;
    const side = !!$("#intro") && window.innerHeight < 760 && !isPhone();
    bar.classList.toggle("side", side);
    if (side) {
      const d = rectOf(dock), pp = $("#passport"), pr = pp ? rectOf(pp) : null, w = bar.offsetWidth, h = bar.offsetHeight;
      const left = pr ? Math.min(window.innerWidth - w - 16, pr.right + 24) : window.innerWidth - w - 24;
      bar.style.left = Math.round(left - d.left + (parseFloat(getComputedStyle(dock).translate) || 0)) + "px";
      bar.style.bottom = Math.round(d.bottom - (window.innerHeight / 2 + h / 2)) + "px";
      return;
    }
    bar.style.left = ""; bar.style.bottom = "";
    if (isPhone()) { bar.style.removeProperty("--tray-dx"); return; }
    const d = rectOf(dock), w = bar.offsetWidth, c = d.left + d.width / 2 - (parseFloat(getComputedStyle(dock).translate) || 0);
    const want = c - w / 2, left = clamp(want, 8, window.innerWidth - 8 - w);
    bar.style.setProperty("--tray-dx", Math.round(left - want) + "px");
  }
  // After the passport: the Stamps pill slides left to make room, then the area pill rises into place beside it.
  function revealNav() {
    const g = $("#pills"), dock = $("#stampdock"), nav = $("#pill");
    if (!g || !g.classList.contains("solo")) return;
    if (reduced()) { g.classList.remove("solo"); placeTray(); fitPinboard(); return; }
    const before = rectOf(dock).left;
    nav.classList.add("below");
    g.classList.remove("solo");
    const after = rectOf(dock).left;
    dock.style.translate = before - after + "px 0";
    dock.getBoundingClientRect();
    dock.classList.add("sliding");
    dock.style.translate = "";
    setTimeout(() => {
      dock.classList.remove("sliding"); placeTray(); layoutDrawer(false); fitPinboard();
      nav.classList.add("rising"); nav.classList.remove("below");
      setTimeout(() => nav.classList.remove("rising"), 260);
    }, 300);
  }
  // Keep the stamp box that is on screen above the open tray: the visa scrolls inside the passport screen
  // (phones), the entry record scrolls the page.
  function keepBoxClear() {
    const bar = $("#stampbar"), intro = $("#intro");
    if (!bar || !bar.classList.contains("out")) return;
    const box = intro ? $("#intro .visa .stamp-box") : (ui.printed && receiptEl() && !receiptEl().hidden ? $(".stamp-box", receiptEl()) : null);
    if (!box || !onScreen(box)) return;
    const top = trayTopOpen(), b = rectOf(box), by = b.bottom - top + 24;
    if (!intro && !isPhone()) return;
    if (bar.classList.contains("side")) return;
    if (b.bottom > top - 16) (intro || window).scrollBy({ top: by, behavior: behavior() });
  }
  function toggleTray(force) {
    const open = force != null ? force : !$("#stampbar").classList.contains("out");
    ui.barPinned = open; updateBar();
    if (open) { keepBoxClear(); const first = $("#stampbar .stamp-btn"); if (first) setTimeout(() => first.focus({ preventScroll: true }), reduced() ? 0 : 210); }
    else if (document.activeElement && document.activeElement.closest("#stampdock")) $("#stamp-handle").focus({ preventScroll: true });
  }
  function markHTML(m) {
    return '<span class="mark ink ' + (m.kind === "approved" ? "green" : "red") + '" style="left:' + m.x + "px;top:" + m.y + "px;--tilt:" + m.rot + "deg;opacity:" + m.op +
      ";--mx:" + m.mx + "px;--my:" + m.my + 'px">' + (m.kind === "approved" ? "APPROVED" : "DENIED") + (m.really ? '<span class="really">...really?</span>' : "") + "</span>";
  }
  function renderMarks(key) {
    $$('[data-marks="' + key + '"]').forEach((el) => {
      el.innerHTML = ui.marks[key].map(markHTML).join("");
      const box = $(".stamp-box", el.parentNode); if (box) box.classList.toggle("inked", ui.inked[key]);
    });
  }
  function inkAt(s, x, y, kind) {
    const key = s.dataset.stamp, r = rectOf(s), box = rectOf($(".stamp-box", s)), k = s.offsetWidth ? r.width / s.offsetWidth : 1;
    ui.marks[key].push({ kind: kind, x: Math.round((x - r.left) / k), y: Math.round((y - r.top) / k), rot: (Math.random() * 6 - 3).toFixed(1), op: (0.78 + Math.random() * 0.17).toFixed(2),
      mx: Math.floor(Math.random() * 16) * 3, my: Math.floor(Math.random() * 16) * 3 });
    const fw = FACE.w, fh = FACE.h; // the inked area is the face, drawn at twice its drawing size
    if (x + fw > box.left && x - fw < box.right && y + fh > box.top && y - fh < box.bottom) ui.inked[key] = true;
    renderMarks(key); FX.play("thud");
    if (key === "id" && kind === "denied") { ui.marks.id[ui.marks.id.length - 1].really = true; renderMarks("id"); }
    $("#stamp-status").textContent = (kind === "approved" ? "Approved" : "Denied") + " stamp pressed on the " + (key === "visa" ? "visa" : key === "id" ? "ID card" : "entry record") + ".";
    afterStamp(key, kind);
  }

  let held = null, pending = null;
  const slotBtn = (kind) => $('.stamp-btn[data-kind="' + kind + '"]');
  function heldFace() { return rectOf($(".word", held.el)); }
  function pickUp(kind, mode) {
    if (held) springBack(true);
    const btn = slotBtn(kind), art = rectOf($(".stamp-art", btn)), face = rectOf($(".word", btn));
    const el = document.createElement("div");
    el.className = "held-stamp " + kind;
    el.innerHTML = stampArt(kind);
    el.style.left = art.left + "px"; el.style.top = art.top + "px";
    fixedRoot.appendChild(el);
    held = { kind: kind, el: el, btn: btn, mode: mode, off: [face.left - art.left + face.width / 2, face.top - art.top + face.height / 2], fx: face.left + face.width / 2, fy: face.top + face.height / 2, over: null, grab: [0, 0], busy: false };
    btn.classList.add("empty");
    void el.offsetWidth; el.classList.add("lifted");
    FX.play("tick");
    updateBar();
    if (mode !== "drag") $("#stamp-status").textContent = (kind === "approved" ? "Approved" : "Denied") + " stamp picked up.";
  }
  // Put the stamp's face centre at (x, y): stay inside the window, lean a little toward a nearby stamp box,
  // and show a faint outline of the ink wherever it would land.
  function placeHeld(x, y, animate) {
    if (!held) return;
    const r = rectOf(held.el), hw = r.width, hh = r.height;
    x = clamp(x, held.off[0] + 8, window.innerWidth - (hw - held.off[0]) - 14);
    y = clamp(y, held.off[1] + 8, window.innerHeight - (hh - held.off[1]) - 14);
    const s = stampableAt(x, y);
    if (s) {
      const b = rectOf($(".stamp-box", s)), cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      if (x > b.left - 24 && x < b.right + 24 && y > b.top - 24 && y < b.bottom + 24) { x += (cx - x) * 0.3; y += (cy - y) * 0.3; }
    }
    held.fx = x; held.fy = y; held.over = s;
    held.el.classList.toggle("glide", !!animate);
    held.el.style.left = x - held.off[0] + "px"; held.el.style.top = y - held.off[1] + "px";
    const pv = $("#ink-preview");
    if (s) { pv.className = "mark ink ink-preview " + (held.kind === "approved" ? "green" : "red"); pv.textContent = held.kind === "approved" ? "APPROVED" : "DENIED"; pv.style.left = x + "px"; pv.style.top = y + "px"; pv.hidden = false; }
    else pv.hidden = true;
  }
  function springBack(now) {
    if (!held) return;
    const h = held; held = null;
    $("#ink-preview").hidden = true;
    const art = rectOf($(".stamp-art", h.btn)), done = () => { h.el.remove(); h.btn.classList.remove("empty"); updateBar(); if (!now) FX.play("clack"); };
    if (now || reduced()) { done(); return; }
    h.el.classList.remove("lifted", "pressed"); h.el.classList.add("glide");
    h.el.style.left = art.left + "px"; h.el.style.top = art.top + "px";
    setTimeout(done, 210);
  }
  function stampDown() {
    if (!held || held.busy) return;
    const h = held; h.busy = true;
    $("#ink-preview").hidden = true;
    const s = h.over || stampableAt(h.fx, h.fy), x = h.fx, y = h.fy;
    const finish = () => { if (s) inkAt(s, x, y, h.kind); else FX.play("tick"); };
    if (reduced()) { finish(); springBack(); return; }
    h.el.classList.remove("glide"); h.el.classList.add("pressed");
    setTimeout(() => { finish(); setTimeout(() => { h.el.classList.remove("pressed"); setTimeout(springBack, 70); }, 40); }, 90);
  }
  async function stampOnto(root, kind) {
    const s = $(".stampable", root) || root;
    if (!s || !$(".stamp-box", s)) return;
    if (!$("#stampbar").classList.contains("out")) { ui.barPinned = true; updateBar(); await wait(300); }
    pickUp(kind, "key");
    await wait(80);
    const b = rectOf($(".stamp-box", s));
    placeHeld(b.left + b.width / 2 + Math.random() * 8 - 4, b.top + b.height / 2 + Math.random() * 6 - 3, true);
    await wait(260);
    if (held) { held.over = s; stampDown(); }
  }
  function afterStamp(key, kind) {
    if (key === "record") { say(kind); return; }
    if (key !== "visa" || ui.introDone) return;
    ui.introDone = true; ui.admitted = kind;
    $("#say").textContent = kind === "approved" ? "Entry granted. Come on through to the booth." : deniedLine();
    $$("#intro .intro-actions button").forEach((b) => { b.disabled = true; });
    const n = $("#denied-note"); if (n) n.hidden = kind !== "denied";
    // hold so the ink is seen, fade the words, slide the passport away, and only then show the booth
    const r = reduced();
    setTimeout(() => {
      const intro = $("#intro"); if (intro) intro.classList.add("quiet");
      setTimeout(() => {
        const pp = $("#passport"); if (pp) pp.classList.add("gone");
        setTimeout(closeIntro, r ? 0 : 480);
      }, r ? 0 : 300);
    }, kind === "approved" ? 1200 : 2400);
  }

  // ----- the printer on the desk; the entry record lands in its own section below -----
  function receiptEl() { return $("#receipt"); }
  // The light blinks and a stub feeds out of the slot line by line. Then it tears off at the slot, slides off
  // the bottom of the desk, and the page scrolls down to the entry record section where the full record lands.
  function printRecord() {
    if (ui.printing) return;
    const pr = $("#printer"), feed = $("#feed");
    say("record");
    if (isPhone() || reduced() || !pr || !feed) { FX.play("print"); landRecord(false); if (isPhone()) scrollToRecord("auto"); else goRoom(1); return; }
    ui.printing = true;
    pr.classList.add("busy");
    FX.play("print");
    const steps = 10, max = 108;
    feed.classList.remove("torn");
    for (let k = 1; k <= steps; k++) setTimeout(() => { feed.style.setProperty("--feed", Math.round(max * k / steps) + "px"); }, k * 110);
    setTimeout(() => {
      pr.classList.remove("busy");
      FX.play("lift");
      feed.classList.add("torn");
      setTimeout(() => goRoom(1, true), 380);
      setTimeout(() => { landRecord(true); setTimeout(() => { updateBar(); const r = receiptEl(); if (r) r.focus({ preventScroll: true }); }, 380); }, 860);
      setTimeout(() => { feed.classList.remove("torn"); feed.style.setProperty("--feed", "0px"); ui.printing = false; }, 1300);
    }, steps * 110 + 120);
  }
  function scrollToRecord(how) {
    const r = $("#record"), rc = receiptEl();
    if (!r) return;
    let top = docTop(r);
    const box = rc && !rc.hidden ? $(".stamp-box", rc) : null;
    if (box) top = Math.max(top, docTop(box) + box.offsetHeight - (trayTopOpen() - 16) + 8);
    window.scrollTo({ top: top, behavior: how === "smooth" && !reduced() ? "smooth" : "auto" });
  }
  function landRecord(animate) {
    const r = receiptEl(), empty = $("#record-empty");
    ui.printed = true;
    if (empty) empty.remove();
    if (!r) return;
    r.hidden = false;
    $$('.record-intro [data-act="print"]', $("#record")).forEach((b) => { b.textContent = "Print it again"; });
    renderMarks("record");
    r.classList.remove("landing");
    if (animate && !reduced()) { void r.offsetWidth; r.classList.add("landing"); FX.play("settle"); }
    updateBar(); updatePill();
  }
  function setTear(v) { ui.torn = v; const r = receiptEl(); if (r) r.style.setProperty("--tear", v); }
  // Tearing off the slip: it comes away, slides to the middle of the screen and becomes the contact screen.
  function tearOff() {
    if (ui.slipTorn) return;
    const slip = $("#slip"), r = receiptEl(), area = $("#record-area");
    ui.slipTorn = true; FX.play("lift");
    r.classList.add("torn"); $("#perf").remove();
    slip.classList.add("loose");
    slip.dataset.drag = ""; slip.tabIndex = 0;
    slip.setAttribute("role", "button"); slip.setAttribute("aria-label", "Contact slip. Press Enter to open the contact screen.");
    area.appendChild(slip);
    if (!isPhone()) moveTo(slip, r.offsetLeft + r.offsetWidth + 28, Math.max(0, r.offsetTop + r.offsetHeight - slip.offsetHeight - 10));
    setTear(0);
    if (reduced()) { openContact(slip); return; }
    const sr = rectOf(slip), dx = window.innerWidth / 2 - (sr.left + sr.width / 2), dy = window.innerHeight / 2 - (sr.top + sr.height / 2);
    slip.style.transition = "transform 0.28s ease-out"; slip.style.transform = "translate(" + dx + "px," + dy + "px)";
    setTimeout(() => { openContact(slip); slip.style.transition = "none"; slip.style.transform = ""; void slip.offsetWidth; slip.style.transition = ""; }, 300);
  }
  function tearAll() {
    if (reduced()) { tearOff(); return; }
    [0.35, 0.7, 1].forEach((v, i) => setTimeout(() => { setTear(v); if (v === 1) tearOff(); }, i * 60));
  }

  // ----- the contact screen: a retro computer (or phone) with a mail form and a small browser on its screen -----
  let contactReturn = null, lastField = null;
  function mailto() {
    const p = state.profile, subj = $("#cm-subject"), msg = $("#cm-msg");
    return "mailto:" + p.email + "?subject=" + encodeURIComponent(subj ? subj.value : "Hello from your portfolio") + (msg && msg.value ? "&body=" + encodeURIComponent(msg.value) : "");
  }
  // shortcuts on the browser's start page: generic pixel icons, never the companies' logos
  function shortcuts(phone) {
    const p = state.profile, links = p.links.filter((l) => safeUrl(l.url));
    const handle = (u) => u.replace(/\/+$/, "").split("/").pop();
    const site = (l) => /linkedin/i.test(l.url) ? { icon: "brief", label: p.name + " · LinkedIn" } : /github/i.test(l.url) ? { icon: "code", label: handle(l.url) + " · GitHub" } : { icon: "paper", label: l.label };
    const tile = (inner, attrs) => (attrs.href ? '<a class="br-tile" ' : '<button class="br-tile" ') + Object.keys(attrs).map((k) => k + '="' + esc(attrs[k]) + '"').join(" ") + ">" + inner + (attrs.href ? "</a>" : "</button>");
    const face = (icon, label) => '<span class="br-circle">' + SPR.draw(icon, 3) + '</span><span class="br-label">' + esc(label) + "</span>";
    return links.map((l) => { const x = site(l); return tile(face(x.icon, x.label), { href: safeUrl(l.url), target: "_blank", rel: "noopener", "data-address": safeUrl(l.url).replace(/^https?:\/\/(www\.)?/, "") }); }).join("") +
      (phone ? tile(face("mail", "Write to me"), { href: mailto(), id: "cm-send" }) : tile(face("mail", "Write to me"), { "data-act": "br-mail" })) +
      tile(face("stampicon", "This desk"), { "data-act": "cm-close" });
  }
  function contactContent(phone) {
    const p = state.profile;
    if (phone) return '<p class="cm-title" id="cm-title">Look me up</p><div class="br-tiles br-grid">' + shortcuts(true) + '</div><p class="cm-note" id="cm-note" aria-live="polite"></p>';
    return '<div class="cm-mail" id="cm-mail"><p class="cm-title" id="cm-title">New message</p>' +
      '<div class="cm-row"><span class="cm-lab">To:</span><span class="cm-val">' + esc(p.email) + '</span><button class="cm-btn" data-act="cm-copy">Copy address</button></div>' +
      '<label class="cm-row" for="cm-subject"><span class="cm-lab">Subject:</span><input id="cm-subject" class="cm-in" value="Hello from your portfolio" autocomplete="off"></label>' +
      '<p class="cm-sudo" id="cm-sudo" role="status" hidden></p><label class="cm-lab cm-block" for="cm-msg">Message:</label><textarea id="cm-msg" class="cm-in" rows="3"></textarea>' +
      '<div class="cm-row"><a class="cm-btn cm-send" id="cm-send" href="' + esc(mailto()) + '">Send</a><button class="cm-btn" data-act="cm-browser">Look me up</button><span class="cm-note" id="cm-note" aria-live="polite"></span></div></div>' +
      '<div class="cm-browser" id="cm-browser" hidden><div class="br-title"><span>Look me up</span><button class="br-x" data-act="br-close" aria-label="Close the browser">X</button></div>' +
      '<div class="br-nav"><button class="br-arrow" aria-label="Back" disabled>' + SPR.draw("left", 3) + '</button><button class="br-arrow" aria-label="Forward" disabled>' + SPR.draw("right", 3) + "</button>" +
      '<div class="br-addr"><span class="br-search">search:</span> <span id="br-url"></span></div></div><div class="br-load" id="br-load"><i></i></div>' +
      '<div class="br-tiles">' + shortcuts(false) + "</div></div>";
  }
  // keys drawn over the sprite's flat keyboard so they can go down: three rows and a space bar, in art pixels
  const KEYROWS = [["QWERTYUIOP", 6, 49], ["ASDFGHJKL", 7, 52], ["ZXCVBNM", 8, 55]];
  function keyboardHTML(s) {
    const k = (label, x, y, w, extra) => '<span class="cm-key' + (extra || "") + '" data-k="' + esc(label) + '" style="left:' + x * s + "px;top:" + y * s + "px;width:" + w * s + "px;height:" + 2 * s + "px;--ks:" + s + 'px"></span>';
    let out = "";
    KEYROWS.forEach((r) => { r[0].split("").forEach((ch, i) => { out += k(ch, r[1] + i * 4, r[2], 3); }); });
    out += k("Back", 46, 49, 6, " wide") + k("Enter", 44, 52, 8, " wide") + k("Enter", 44 + 0, 55, 0, " gone") + k(" ", 16, 58, 24, " wide");
    const kb = ART.computer.keys;
    return '<div class="cm-keys" aria-hidden="true" style="left:' + kb.x * s + "px;top:" + kb.y * s + "px;width:" + kb.w * s + "px;height:" + kb.h * s + 'px"></div>' +
      '<div class="cm-keyset" aria-hidden="true">' + out + "</div>";
  }
  function pressKey(name) {
    if (reduced()) return;
    let el = $('.cm-key[data-k="' + (name === " " ? " " : name) + '"]');
    if (!el) { const all = $$(".cm-key:not(.wide):not(.gone)"); el = all[Math.floor(Math.random() * all.length)]; }
    if (!el) return;
    el.classList.add("down");
    setTimeout(() => el.classList.remove("down"), 80);
  }
  function keyName(ev) { return ev.key === "Enter" ? "Enter" : ev.key === "Backspace" ? "Back" : ev.key === " " ? " " : ev.key.length === 1 ? ev.key.toUpperCase() : null; }
  function typeSound(name) { FX.play(name === " " || name === "Enter" || name === "Back" ? "keybig" : "key"); }
  function openContact(from) {
    const box = $("#contact"), dev = $("#cm-device"), phone = isPhone(), a = ART[phone ? "phone" : "computer"];
    if (!box || !a) return;
    contactReturn = from || document.activeElement;
    // the largest whole-number scale where the whole device fits with 24px to spare
    const s = Math.max(3, Math.min(14, Math.floor(Math.min((window.innerWidth - 48) / a.w, (window.innerHeight - 48) / a.h))));
    const sc = a.screen, cl = phone ? { x: 4, y: 19 } : a.close;
    dev.innerHTML = SPR.art(phone ? "phone" : "computer", s) + (phone ? "" : keyboardHTML(s)) +
      '<div class="cm-screen" style="left:' + sc.x * s + "px;top:" + sc.y * s + "px;width:" + sc.w * s + "px;height:" + sc.h * s + 'px"><div class="cm-content" id="cm-content">' + contactContent(phone) + "</div></div>" +
      (phone ? '<button class="cm-x" data-act="cm-close" aria-label="Close the contact screen" style="left:' + cl.x * s + "px;top:" + cl.y * s + 'px">X</button>'
        : '<button class="cm-power" data-act="cm-close" aria-label="Turn off computer (close)" style="left:' + (a.power.x * s + s - 16) + "px;top:" + (a.power.y * s + s - 16) + "px;--led:" + 2 * s + 'px"><span class="tip" aria-hidden="true">Power off</span></button>');
    dev.style.width = a.w * s + "px"; dev.style.height = a.h * s + "px";
    box.hidden = false; ui.contactOpen = true;
    app.inert = true; introRoot.inert = true;
    fitContact(sc.w * s, sc.h * s);
    void dev.offsetWidth; box.classList.add("open");
    FX.play("hum");
    const first = $("#cm-subject", dev) || $(".br-tile", dev);
    setTimeout(() => { if (first) first.focus({ preventScroll: true }); }, reduced() ? 0 : 200);
  }
  // Content larger than the screen is scaled down, never the computer itself.
  function fitContact(w, h) {
    const c = $("#cm-content");
    c.style.transform = ""; c.style.width = w + "px"; c.style.height = "";
    const k = Math.min(1, h / c.scrollHeight);
    if (k < 1) { c.style.width = w / k + "px"; const k2 = Math.min(1, h / c.scrollHeight); c.style.transform = "scale(" + k2 + ")"; c.style.height = h / k2 + "px"; }
    else c.style.height = h + "px";
  }
  function openBrowser() {
    const b = $("#cm-browser");
    if (!b) return;
    b.hidden = false; $("#cm-mail").hidden = true;
    $("#br-url").textContent = ""; $("#br-load").className = "br-load";
    const t = $(".br-tile", b); if (t) t.focus({ preventScroll: true });
  }
  function closeBrowser() {
    const b = $("#cm-browser");
    if (!b || b.hidden) return false;
    b.hidden = true; $("#cm-mail").hidden = false;
    const back = $('[data-act="cm-browser"]'); if (back) back.focus({ preventScroll: true });
    return true;
  }
  // The site opens in a new tab straight from the click; the address bar types it out and loads alongside.
  let typing = null;
  function typeAddress(text) {
    const url = $("#br-url"), load = $("#br-load");
    if (!url) return;
    clearInterval(typing); url.textContent = ""; load.className = "br-load";
    if (reduced()) { url.textContent = text; load.className = "br-load done"; return; }
    let i = 0;
    typing = setInterval(() => {
      url.textContent = text.slice(0, ++i);
      const ch = text[i - 1]; FX.play("key"); pressKey(/[a-z]/i.test(ch) ? ch.toUpperCase() : null);
      if (i >= text.length) { clearInterval(typing); load.className = "br-load go"; setTimeout(() => { load.className = "br-load done"; }, 500); }
    }, 20);
  }
  // Power off: the button presses for a frame, the picture folds to a line and then a dot, the screen goes dark,
  // and the computer slides away. Escape and a click outside close it the same way.
  function closeContact() {
    const box = $("#contact");
    if (!box || !ui.contactOpen || box.classList.contains("closing")) return;
    clearInterval(typing);
    const done = () => {
      ui.contactOpen = false;
      box.classList.remove("open", "closing", "off"); box.hidden = true;
      app.inert = false; introRoot.inert = false;
      const back = $("#slip.loose") || contactReturn;
      if (back) back.focus({ preventScroll: true });
    };
    if (reduced()) { done(); return; }
    const pw = $(".cm-power", box);
    box.classList.add("closing");
    if (pw) pw.classList.add("pressed");
    FX.play("poweroff");
    setTimeout(() => {
      if (pw) pw.classList.remove("pressed");
      box.classList.add("off");
      setTimeout(() => { box.classList.remove("open"); setTimeout(done, 360); }, 300);
    }, 60);
  }

  // ----- the lamp: base on the desk's top-right corner, shade over the counter strip only -----
  function setLampVisible(on) { const st = $("#stage"); if (st) st.classList.toggle("lamp-ready", on); }
  function toggleLamp(auto) { if (auto !== true) ui.lampTouched = true; ui.lampOn = !ui.lampOn; $("#stage").classList.toggle("lamp-off", !ui.lampOn); FX.play("lamp"); $("#lamp-switch").setAttribute("aria-pressed", String(ui.lampOn)); }
  // Open or held papers pass over the lamp; when one overlaps it, the lamp fades back.
  function checkLamp() {
    const lamp = $("#lamp");
    if (!lamp) return;
    const r = rectOf(lamp);
    const over = $$("#desk .paper.open, #desk .paper.held").some((p) => { const b = rectOf(p); return b.left < r.right && r.left < b.right && b.top < r.bottom && r.top < b.bottom; });
    lamp.classList.toggle("faded", over);
  }

  // ----- pill nav -----
  const AREAS = [["desk", "Desk"], ["record", "Records"]];
  function currentArea() {
    if (ui.view !== "desk" || !$("#scene")) return 0;
    if (!isPhone()) return ui.room;
    return rectOf($("#record")).top < window.innerHeight * 0.55 ? 1 : 0;
  }
  // The camera pans sideways between the rooms; with reduced motion they swap with a quick fade.
  function goRoom(i, quiet) {
    i = clamp(i, 0, AREAS.length - 1);
    if (isPhone()) { deskScroll(i ? docTop($("#record")) : docTop($("#scene")), behavior()); return; }
    if (i === ui.room) return;
    const rooms = $("#rooms");
    if (i !== 0 && ui.dwOpen) setDrawer(null);
    ui.room = i;
    if (reduced()) { rooms.classList.remove("fading"); void rooms.offsetWidth; rooms.classList.add("fading"); }
    rooms.style.setProperty("--room", i);
    $$(".room").forEach((r, k) => { r.inert = k !== i; });
    updatePill();
    setTimeout(() => { updateBar(); if (!quiet) { const t = i ? (receiptEl() && !receiptEl().hidden ? receiptEl() : $("#record-h")) : $("#hello"); if (t) t.focus({ preventScroll: true }); } }, reduced() ? 0 : 460);
  }
  function goArea(i) {
    const id = AREAS[i][0];
    if (id === "desk") { goRoom(0); return; }
    // the record room: print first if nothing is printed yet, otherwise just go there
    if (!ui.forced) { ui.forced = true; ui.boothForced = true; applyScene(); }
    if (ui.printed) { goRoom(1); return; }
    if (ui.room !== 0 && !isPhone()) goRoom(0, true);
    printRecord();
  }
  function updatePill() { const n = $("#area-name"); if (n) n.textContent = AREAS[currentArea()][1]; }

  // the note goes out through the visitor's own mail app; nothing is stored or sent by the page
  function noteLink() {
    const t = $("#vnote-text"), a = $("#vn-send"), c = $("#vn-count");
    if (!t || !a) return;
    const text = t.value.slice(0, 280);
    c.textContent = text.length + " of 280";
    a.href = "mailto:" + state.profile.email + "?subject=" + encodeURIComponent("A note from your desk") + "&body=" + encodeURIComponent(text);
    a.classList.toggle("off", !text.trim());
    a.setAttribute("aria-disabled", String(!text.trim()));
  }
  function noteSent() {
    const t = $("#vnote-text"), f = $("#vnote"), sent = $("#vsent");
    if (!t || !t.value.trim()) return false;
    ui.noteSent = true; ui.noteText = t.value.trim();
    f.hidden = true; $("#notepad").hidden = true;
    $("#vs-text").textContent = ui.noteText.length > 60 ? ui.noteText.slice(0, 57) + "..." : ui.noteText;
    sent.hidden = false; FX.play("tap");
    return true;
  }
  // ----- the radio's asides (only lines Thea has written are ever shown) -----
  let asideTimer = null;
  function sayNow(trigger) {
    const line = (state.assistant.find((a) => a.when === trigger) || {}).line, el = $("#aside");
    if (!line || !el) return false;
    el.textContent = line; el.hidden = false;
    clearTimeout(asideTimer);
    asideTimer = setTimeout(() => { el.hidden = true; }, 5000);
    return true;
  }
  function say(trigger) {
    if (!ui.radioOn || !hasRadio() || ui.said.has(trigger)) return;
    const i = trigger.indexOf("case:") === 0 ? +trigger.slice(5) : -1;
    const line = i >= 0 ? state.projects[i] && state.projects[i].aside : (state.assistant.find((a) => a.when === trigger) || {}).line;
    const el = $("#aside");
    if (!line || !el) return;
    ui.said.add(trigger);
    el.textContent = line; el.hidden = false;
    clearTimeout(asideTimer);
    asideTimer = setTimeout(() => { el.hidden = true; }, 5000);
  }

  // ----- list view and amend mode -----
  function f(path, ph, cls, tag) {
    tag = tag || "span";
    const val = at(path), text = Array.isArray(val) ? val.join(", ") : val;
    if (!editing) return "<" + tag + (cls ? ' class="' + cls + '"' : "") + ">" + esc(text) + "</" + tag + ">";
    return "<" + tag + ' class="f ' + (cls || "") + '" data-k="' + path + '"' + (Array.isArray(val) ? " data-list" : "") +
      ' data-ph="' + esc(ph) + '" role="textbox" aria-label="' + esc(ph) + '" spellcheck="false">' + esc(text) + "</" + tag + ">";
  }
  const del = (path, i, what) => (editing ? '<button class="mini" data-act="del" data-p="' + path + '" data-i="' + i + '">Remove ' + what + "</button>" : "");
  const add = (path, type, what) => (editing ? '<button class="mini add" data-act="add" data-p="' + path + '" data-t="' + type + '">Add ' + what + "</button>" : "");
  const row = (label, html) => '<div class="edit-row"><span class="lab">' + label + "</span>" + html + "</div>";
  const blk = () => (editing ? "block" : "");
  const BLANK = {
    point: "", strength: "", link: { label: "", url: "" }, skill: { group: "", items: [] }, award: { year: "", result: "", event: "", note: "" },
    project: { name: "", short: "", icon: "paper", demo: "", role: "", dates: "", event: "", award: "", line: "", points: [""], stack: "", aside: "", featured: "" },
  };
  const WHEN = { arrive: "When the booth opens", unpacked: "When the file is unpacked", drawer: "When the Skills drawer opens", record: "When the entry record prints",
    firstcase: "When the first case file opens", personal: "When the Personal drawer opens", watch: "When the watch is picked up", sketchbook: "When the sketchbook is opened",
    intercom: "When the intercom is pressed", idle: "After 30 quiet seconds",
    approved: "After an approved stamp on the record", denied: "After a denied stamp on the record" };

  function listCase(x, i) {
    const k = "projects." + i + ".";
    if (editing) {
      return '<article class="case">' + row("Name", f(k + "name", "Project name")) + row("Role", f(k + "role", "Your role")) + row("Dates", f(k + "dates", "When")) +
        row("Event", f(k + "event", "Hackathon or event, optional")) + row("Award stamp", f(k + "award", "Award, optional")) + row("Short label", f(k + "short", "Folder tab label, optional")) + row("One-liner", f(k + "line", "What it does, in one sentence")) +
        x.points.map((pt, j) => '<div class="edit-point">' + f(k + "points." + j, "What you built, and for whom", "block") + del(k + "points", j, "point") + "</div>").join("") +
        add(k + "points", "point", "point") + row("Built with", f(k + "stack", "Tools and services")) + row("Radio aside", f(k + "aside", "Shown once when this file is opened. Leave empty to stay quiet.")) +
        row("On entry record", f(k + "featured", "Type yes to list it as a top project")) + del("projects", i, "case file") + "</article>";
    }
    return '<article class="case"><div class="case-top">' + SPR.draw(x.icon || "paper", PX) + "<div><h3>" + esc(x.name) + '</h3><p class="meta">' + [x.role, x.dates, x.event].filter(Boolean).map(esc).join(" · ") + "</p></div>" +
      (x.award ? '<span class="ink red">' + esc(x.award) + "</span>" : "") + '</div><p class="line">' + esc(x.line) + "</p><ul>" +
      x.points.filter(Boolean).map((t) => "<li>" + esc(t) + "</li>").join("") + '</ul><p class="stack">Built with: ' + esc(x.stack) + "</p></article>";
  }
  function renderList() {
    const p = state.profile, sec = (id, title, sub, body) => '<section class="sec" id="' + id + '"><header><h2>' + title + "</h2>" + (sub ? "<p>" + sub + "</p>" : "") + "</header><div>" + body + "</div></section>";
    const links = p.links.map((l, i) => editing
      ? '<div class="edit-row">' + f("profile.links." + i + ".label", "Label") + f("profile.links." + i + ".url", "https://…") + del("profile.links", i, "link") + "</div>"
      : (safeUrl(l.url) ? '<a href="' + esc(safeUrl(l.url)) + '" target="_blank" rel="noopener">' + esc(l.label) + "</a>" : "")).join("");
    const answered = state.interview.filter((q) => q.q && q.a);
    app.innerHTML = '<div class="wrap list"><header class="top"><span class="who">' + esc(p.name) + '</span><nav aria-label="Page">' +
      (editing ? "" : '<button class="btn-quiet" data-act="view" data-v="desk">Desk view</button><button class="btn-quiet" data-act="passport">View passport</button>') +
      '<span class="owner" id="owner">' + ownerBar() + "</span></nav></header>" +
      '<section class="hero">' + (ui.admitted === "approved" && !editing ? '<span class="ink green entry">Approved<small>' + today + "</small></span>" : "") +
      f("profile.greeting", "Greeting", "", "h1").replace("<h1", '<h1 tabindex="-1" id="hello"') + f("profile.tagline", "One-line tagline", "tagline " + blk(), "p") +
      f("profile.summary", "A short summary", "summary " + blk(), "p") +
      (editing ? '<div style="margin-top:20px">' + row("Full name", f("profile.name", "Full name")) + row("Nationality", f("profile.nationality", "Nationality")) +
        row("Based in", f("profile.basedIn", "Where you live")) + row("Occupation", f("profile.occupation", "Shown on the passport and ID card")) +
        row("Seeking", f("profile.seeking", "Roles you want, for the entry record")) + row("Departure board", f("profile.board", "Phrases, separated by commas")) + "</div>" : "") + "</section>" +
      sec("cases", "Case files", "Projects I built or led, most with a student team.", state.projects.map(listCase).join("") + add("projects", "project", "case file")) +
      sec("strengths", "Strengths", editing ? "Printed on the entry record." : "",
        editing ? state.strengths.map((s, i) => '<div class="edit-point">' + f("strengths." + i, "A strength, as a plain fact", "block") + del("strengths", i, "strength") + "</div>").join("") + add("strengths", "strength", "strength")
          : '<ul class="plain">' + state.strengths.filter(Boolean).map((s) => "<li>" + esc(s) + "</li>").join("") + "</ul>") +
      (editing || answered.length ? sec("interview", "Interview", editing ? "Questions with an empty answer stay hidden from visitors." : "",
        editing ? state.interview.map((q, i) => '<div class="edit-point">' + row("Question", f("interview." + i + ".q", "Question")) + f("interview." + i + ".a", "Your answer, two or three sentences", "block") + "</div>").join("")
          : answered.map((q) => "<h3>" + esc(q.q) + "</h3><p>" + esc(q.a) + "</p>").join("")) : "") +
      (editing ? sec("radio", "Booth radio", "One line each, shown once. The radio stays hidden until at least one line is written.",
        state.assistant.map((a, i) => row(esc(WHEN[a.when] || a.when), f("assistant." + i + ".line", "Leave empty to stay quiet"))).join("")) : "") +
      (editing ? sec("things", "Desk things", "A note beside each thing in the Personal drawer. Empty notes stay hidden.",
        (state.effects || []).map((e, i) => row(esc({ watch: "Watch", sketchbook: "Sketchbook", bottle: "Bottle" }[e.id] || e.id), f("effects." + i + ".note", "Leave empty to stay hidden"))).join("")) : "") +
      sec("honours", "Commendations", "Hackathon results from 2026.", state.awards.map((a, i) => '<div class="honour"><span class="yr">' + f("awards." + i + ".year", "Year") + "</span><div><b>" +
        f("awards." + i + ".result", "Result") + "</b>, " + f("awards." + i + ".event", "Event") + "<p>" + f("awards." + i + ".note", "What it was for") + "</p>" + del("awards", i, "entry") + "</div></div>").join("") + add("awards", "award", "entry")) +
      sec("skills", "Skills", "What I have used in the case files above.", '<dl class="skills">' + state.skills.map((s, i) => "<dt>" + f("skills." + i + ".group", "Group") + "</dt><dd>" +
        f("skills." + i + ".items", "Skills, separated by commas", blk()) + del("skills", i, "group") + "</dd>").join("") + "</dl>" + add("skills", "skill", "group")) +
      sec("diploma", "Diploma", "", f("education.degree", "Degree", blk(), "h3") + f("education.school", "School", blk(), "p") + "<p>" + f("education.major", "Major") +
        '</p><p class="meta">Graduated ' + f("education.graduated", "When") + " · Coursework: " + f("education.coursework", "Coursework") + "</p>") +
      sec("contact", "Contact", "Email is the fastest way to reach me.", '<div class="row">' + f("profile.email", "Email address", "email") +
        (editing ? "" : '<button class="btn-quiet" data-act="copy">Copy address</button>') + '</div><div class="' + (editing ? "" : "row ") + 'links">' + links + "</div>" + add("profile.links", "link", "link")) +
      "</div>";
    $$(".f", app).forEach((el) => {
      try { el.contentEditable = "plaintext-only"; } catch (err) { el.contentEditable = "true"; }
      if (el.contentEditable !== "plaintext-only") el.contentEditable = "true";
    });
  }

  function renderDesk() {
    app.innerHTML = '<main class="site"><div class="rooms" id="rooms" style="--room:' + (isPhone() ? 0 : ui.room) + '"><section class="room room-desk scene" id="scene" aria-label="Desk"><div class="room-pan" id="room-pan"><div class="stage' + (ui.lampOn ? "" : " lamp-off") + '" id="stage">' + boothHTML() + deskHTML() +
      '</div><div class="floor" aria-hidden="true"></div><div class="dw-pull" id="dw-pull">' + deskBelowHTML() + '</div></div></section>' + recordHTML() + "</div></main>";
    board = FX.board($("#board"), state.profile.board, 20);
    sizeScene();
    if (!isPhone()) placeFurniture();
    computeFit();
    placeStickers();
    renderPutAway();
    renderMarks("record"); renderMarks("id");
    if (ui.slipTorn && ui.slipPos && !isPhone()) setPos($("#slip"), ui.slipPos[0], ui.slipPos[1]);
    layoutDrawer(false);
    $$(".pobj").forEach(placePobj); drawHands(); fitPinboard();
    applyScene(true);
    paperIds().forEach((id) => { const el = paperEl(id); if (el && pst(id).open) placeOpen(el); });
    updatePill(); updateBar();
    $$(".room").forEach((r, k) => { r.inert = !isPhone() && k !== ui.room; });
    // the Records room scrolls on its own; the tray follows the stamp box as it does
    const recRoom = $("#record");
    if (recRoom) recRoom.addEventListener("scroll", () => { updateBar(); if (held && !held.busy) placeHeld(held.fx, held.fy); }, { passive: true });
  }
  function render() {
    const desk = !editing && ui.view === "desk";
    if (held) springBack(true);
    document.documentElement.classList.toggle("desk-mode", desk);
    if (desk) renderDesk(); else renderList();
    updateBar();
  }

  // ----- intro: the passport, opened as a two-page spread -----
  const mrz = (s, n) => esc((String(s).toUpperCase().replace(/[^A-Z0-9]/g, "<") + "<".repeat(n)).slice(0, n));
  // The passport is a small book. The right-hand leaf is hinged at the spine: its front is the visa,
  // its back is the next left page (commendations), and turning it reveals the next right page (studies).
  const passCorner = (dir) => '<button class="corner ' + (dir > 0 ? "fwd" : "back") + '" data-act="flip-pass" aria-label="' + (dir > 0 ? "Turn the page" : "Turn back to the visa") + '">' + SPR.draw("corner", PX) + "</button>";
  function visaFront() {
    const p = state.profile;
    return '<div class="visa-page visa stampable" data-stamp="visa"><h2>Entry visa</h2><dl class="visa-lines"><dt>Holder</dt><dd>' + esc(p.name) +
      "</dd><dt>Purpose</dt><dd>" + esc(p.seeking) + "</dd><dt>Issued</dt><dd>" + today + '</dd></dl><div class="stamp-box' + (ui.inked.visa ? " inked" : "") + '">Stamp box</div><div class="marks" data-marks="visa"></div></div>' + passCorner(1);
  }
  function commendationsBack() {
    return '<div class="visa-page"><h2>Commendations</h2><div class="pp-stamps">' + state.awards.filter((a) => a.result).map((a, i) =>
      '<span class="ink green" style="--tilt:' + [-4, 3, -2, 5][i % 4] + 'deg">' + esc(a.result) + "<small>" + esc(a.event + " " + a.year) + "</small></span>").join("") + "</div></div>" + passCorner(-1);
  }
  function studiesUnder() {
    const e = state.education;
    return '<div class="visa-page"><h2>Studies</h2><dl class="visa-lines"><dt>Degree</dt><dd>' + esc(e.degree) + "</dd><dt>School</dt><dd>" + esc(e.school) +
      "</dd><dt>Major</dt><dd>" + esc(e.major) + "</dd><dt>Graduated</dt><dd>" + esc(e.graduated) + "</dd><dt>Courses</dt><dd>" + esc(e.coursework) + "</dd></dl></div>";
  }
  // Turn the leaf around the spine in four stepped frames; on phones, squash it at the spine edge instead.
  function setLeaf(page, animate) {
    const leaf = $("#pp-leaf"), pp = $("#passport");
    if (!leaf) return;
    ui.passPage = page;
    const face = () => { const c = $(page ? ".leaf-back .corner" : ".leaf-front .corner", leaf); if (c) c.focus({ preventScroll: true }); };
    leaf.style.transform = "";
    pp.classList.toggle("on-studies", page === 1);
    if (!animate || reduced()) { leaf.classList.toggle("turned", page === 1); face(); return; }
    FX.play("rustle");
    if (isPhone()) {
      leaf.classList.add("squash");
      setTimeout(() => { leaf.classList.toggle("turned", page === 1); leaf.classList.replace("squash", "unsquash"); setTimeout(() => { leaf.classList.remove("unsquash"); face(); }, 90); }, 90);
      return;
    }
    pp.classList.add("turning");
    leaf.classList.toggle("turned", page === 1);
    setTimeout(() => { pp.classList.remove("turning"); face(); }, 340);
  }
  function flipPass() { setLeaf(ui.passPage ? 0 : 1, true); }
  function renderIntro() {
    const p = state.profile, e = state.education;
    const parts = p.name.trim().split(/\s+/), surname = parts.length > 1 ? parts.pop() : "", given = parts.join(" ");
    ui.introStep = 0; ui.introDone = false; ui.passPage = 0;
    const S = passScale(), pp = (x) => x * S + "px";
    introRoot.innerHTML =
      '<div class="intro" id="intro" role="dialog" aria-label="Passport"><div class="intro-inner"><p class="intro-say" id="say" aria-live="polite">Next applicant. Open the passport to begin.</p>' +
      '<div class="passport" id="passport" data-frame="0" data-stamp-root tabindex="0" aria-label="Passport. Press A to stamp the visa approved or D to stamp it denied." style="--pp:' + S + ";width:" + pp(89) + ";height:" + pp(89) + '">' +
      '<span class="pp-frames" aria-hidden="true" data-act="intro-next" style="background-image:url(' + ART["passport-anim-sheet"].src + ')"></span>' +
      '<div class="pp-spread" id="pp-spread">' +
      '<div class="pp-left" style="left:' + pp(3) + ";top:" + pp(14) + ";width:" + pp(37) + ";height:" + pp(68) + '">' +
      '<div class="pp-photo" style="left:' + pp(4) + ";top:" + pp(7) + ";width:" + pp(18) + ";height:" + pp(25) + '">' + SPR.applicant("thea", Math.max(1, Math.floor(Math.min(18 * S / 55, 25 * S / 59))), portraitAlt) + "</div>" +
      '<dl class="fields pp-fields" style="top:' + pp(34) + '">' + field("Surname", surname) + field("Given name", given) + field("Nationality", p.nationality) + field("Graduated", e.graduated) + field("Occupation", p.occupation) + "</dl>" +
      '<div class="pp-mrz" aria-hidden="true">' + mrz("P " + p.nationality.slice(0, 3) + " " + surname + "  " + given, 40) + "<br>" + mrz("BCS " + e.graduated + " UOW SIM", 40) + "</div></div>" +
      '<div class="pp-right visa-page visa stampable" data-stamp="visa" style="left:' + pp(48) + ";top:" + pp(14) + ";width:" + pp(37) + ";height:" + pp(68) + '"><h2>Entry visa</h2><dl class="visa-lines">' +
      "<dt>Holder</dt><dd>" + esc(p.name) + "</dd><dt>Purpose</dt><dd>" + esc(p.seeking) + "</dd><dt>Issued</dt><dd>" + today + "</dd><dt>Based in</dt><dd>" + esc(p.basedIn) + "</dd></dl>" +
      '<div class="stamp-box' + (ui.inked.visa ? " inked" : "") + '">Stamp box</div><div class="marks" data-marks="visa"></div></div></div></div>' +
      '<div class="intro-actions"><button class="btn-main" id="intro-btn" data-act="intro-next">Open passport</button><button class="btn-quiet" data-act="intro-skip">Skip to the booth</button></div></div></div>';
    renderMarks("visa");
    document.documentElement.classList.add("locked");
    const g = $("#pills"); if (g) g.classList.add("solo");
    $("#intro-btn").focus({ preventScroll: true });
    updateBar();
  }
  // the passport scale: 6x where it fits above the open tray, otherwise a step down (on short screens the tray moves beside it)
  function passScale() {
    const vh = window.innerHeight, side = vh < 760 && !isPhone(), bottom = side ? vh - 80 : vh - 72 - ($("#stampbar") ? $("#stampbar").offsetHeight : 222) - 16;
    for (let k = 6; k >= 4; k--) if (12 + 84 * k <= bottom) return k;
    return 4;
  }
  function trayClear() { const bar = $("#stampbar"); return (bar ? bar.offsetHeight : 210) + 80; }
  function playPassport(dir) {
    const pp = $("#passport"); if (!pp) return;
    const to = dir > 0 ? 3 : 0;
    if (reduced()) { pp.dataset.frame = to; pp.classList.toggle("open", to === 3); return; }
    let f = +pp.dataset.frame;
    pp.classList.remove("open");
    const tick = () => { f += dir; pp.dataset.frame = f; if (f !== to) setTimeout(tick, 110); else pp.classList.toggle("open", to === 3); };
    setTimeout(tick, 110);
  }
  function introNext() {
    if (ui.introStep !== 0) return;
    playPassport(1);
    ui.introStep = 1;
    $("#say").textContent = "";
    $("#intro-btn").hidden = true;
    FX.play("rustle");
    setTimeout(() => { updateBar(); const b = slotBtn("approved"); if (b) b.focus({ preventScroll: true }); setTimeout(keepBoxClear, reduced() ? 0 : 220); }, reduced() ? 0 : 500);
  }
  function closeIntro() {
    const el = $("#intro");
    if (!el || el.classList.contains("leaving")) return;
    if (held) springBack(true);
    el.classList.add("leaving");
    document.documentElement.classList.remove("locked");
    ui.introDone = true;
    setTimeout(() => { introRoot.innerHTML = ""; updateBar(); revealNav(); const h = $("#hello"); if (h) h.focus({ preventScroll: true }); firstVisit(); }, reduced() ? 0 : 420);
  }

  // ----- the first visit, once per visit: about two seconds, skippable with a click or any key -----
  let firstRun = null;
  function firstVisit() {
    if (ui.firstDone || !$("#scene") || isPhone()) return;
    ui.firstDone = true;
    const finish = () => {
      if (!firstRun) return;
      firstRun.timers.forEach(clearTimeout); firstRun = null;
      document.removeEventListener("pointerdown", finish, true); document.removeEventListener("keydown", finish, true);
      ui.boothForced = true; ui.forced = true; ui.stagger = 0; applyScene(true);
      $$(".arriving").forEach((e) => e.classList.remove("arriving"));
    };
    if (reduced()) { firstRun = { timers: [] }; finish(); return; }
    firstRun = { timers: [] };
    const at = (ms, fn) => firstRun.timers.push(setTimeout(fn, ms));
    document.addEventListener("pointerdown", finish, true); document.addEventListener("keydown", finish, true);
    $$("#filebox, #filebox-front, .dw").forEach((e) => e.classList.add("arriving", "hold"));
    at(60, () => { ui.boothForced = true; applyScene(); });
    at(520, () => { if (ui.lampOn) FX.play("lamp"); });
    at(700, () => { ui.forced = true; ui.stagger = 60; applyScene(); ui.stagger = 0; });
    at(1500, () => { $$(".arriving").forEach((e) => e.classList.remove("hold")); FX.play("dwslide"); });
    at(2000, () => { $$(".arriving").forEach((e) => e.classList.remove("arriving")); firstRun.timers = []; finish(); });
  }

  // ----- idle details: mug steam, a blink at the window; paused when hidden, off with reduced motion -----
  const pace = (a, b) => (a + Math.random() * (b - a)) * (slow ? 3 : 1);
  function steamLoop() {
    setTimeout(() => {
      const st = $(".steam");
      if (st && !document.hidden && !reduced()) {
        st.className = "steam f1";
        setTimeout(() => { st.className = "steam f2"; }, 320 * (slow ? 3 : 1));
        setTimeout(() => { st.className = "steam f1"; }, 640 * (slow ? 3 : 1));
        setTimeout(() => { st.className = "steam"; }, 960 * (slow ? 3 : 1));
      }
      steamLoop();
    }, pace(4000, 6000));
  }
  function blinkLoop() {
    setTimeout(() => {
      const bl = $("#blink");
      if (bl && !document.hidden && !reduced()) { bl.classList.add("on"); setTimeout(() => bl.classList.remove("on"), 140 * (slow ? 3 : 1)); }
      blinkLoop();
    }, pace(6000, 10000));
  }
  steamLoop(); blinkLoop();
  // thirty quiet seconds: the booth assistant may say something, once
  let idleTimer = null;
  function poke() { clearTimeout(idleTimer); idleTimer = setTimeout(() => { if (ui.view === "desk" && !$("#intro")) say("idle"); }, 30000); }
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach((t) => document.addEventListener(t, poke, { passive: true, capture: true }));
  poke();
  // easter eggs: "hire" typed on the desk, five clicks on the mug, "sudo" in the message box
  let typed = "", mugClicks = 0, mugTimer = null;
  function hireEgg(ev) {
    if (ev.key.length !== 1 || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    typed = (typed + ev.key.toLowerCase()).slice(-4);
    if (typed !== "hire") return;
    typed = "";
    toggleTray(true);
    const b = slotBtn("approved");
    if (b && !reduced()) { b.classList.add("eager"); setTimeout(() => b.classList.remove("eager"), 1200); }
  }
  function mugEgg() {
    clearTimeout(mugTimer); mugTimer = setTimeout(() => { mugClicks = 0; }, 2500);
    if (++mugClicks < 5) return;
    mugClicks = 0;
    const mug = $('.sticker[data-sticker="mug"]'), desk = $("#desk");
    let n = $("#refill");
    if (!n) { n = document.createElement("p"); n.id = "refill"; n.className = "refill"; n.setAttribute("role", "status"); desk.appendChild(n); }
    n.textContent = "refill requested";
    n.hidden = false;
    setPos(n, clamp(mug.offsetLeft - 150, 8, desk.clientWidth - 160), clamp(mug.offsetTop - 30, TOP, usable().bottom - 50));
    FX.play("peel");
    setTimeout(() => { n.hidden = true; }, 3200);
  }
  function sudoEgg(t) {
    if (!/sudo\s*$/i.test(t.value)) return;
    const r = $("#cm-sudo");
    if (!r) return;
    r.textContent = "Permission denied. This desk runs without root.";
    r.hidden = false;
    clearTimeout(sudoEgg.timer); sudoEgg.timer = setTimeout(() => { r.hidden = true; }, 3000);
  }

  // ----- name tags: objects first, names when pointed at -----
  let tagTimer = null, tagFor = null;
  function tagTarget(el) { return el && el.closest && (el.closest(".dw-front") || el.closest(".p-case.filed .folder-tab")); }
  function showTag(el, now) {
    clearTimeout(tagTimer);
    const go = () => {
      let t = $("#tag");
      if (!t) { t = document.createElement("div"); t.id = "tag"; t.className = "tag"; t.setAttribute("role", "tooltip"); fixedRoot.appendChild(t); }
      tagFor = el;
      const r = rectOf(el), strip = el.classList.contains("folder-tab");
      if (strip) {
        const pr = state.projects[caseIndex(el.dataset.id)], box = rectOf($("#filebox"));
        t.innerHTML = '<b class="tg-name">' + esc(pr.name) + '</b><span class="tg-sub">' + esc([pr.role, pr.dates].filter(Boolean).join(", ")) + "</span>";
        t.className = "tag side pop"; t.hidden = false;
        t.style.left = Math.round(box.right + 14) + "px";
        t.style.top = Math.round(clamp(r.top + r.height / 2 - t.offsetHeight / 2, 8, window.innerHeight - t.offsetHeight - 8)) + "px";
      } else {
        t.innerHTML = '<span class="tg-word">' + esc(el.dataset.tag) + "</span>";
        t.className = "tag above pop"; t.hidden = false;
        const fr = rectOf(el.closest(".dw")), cx = fr.left + parseFloat(getComputedStyle(el.closest(".dw")).getPropertyValue("--crop")) + (fr.width - 2 * parseFloat(getComputedStyle(el.closest(".dw")).getPropertyValue("--crop"))) / 2;
        t.style.left = Math.round(clamp(cx - t.offsetWidth / 2, 8, window.innerWidth - t.offsetWidth - 8)) + "px";
        t.style.top = Math.round(r.bottom - DW_FRONT * FS - t.offsetHeight - 10) + "px";
      }
      setTimeout(() => t.classList.remove("pop"), 60);
    };
    if (now) go(); else tagTimer = setTimeout(go, 120);
  }
  function hideTag() { clearTimeout(tagTimer); tagFor = null; const t = $("#tag"); if (t) t.hidden = true; }
  document.addEventListener("pointerover", (ev) => { if (ev.pointerType === "touch") return; const t = tagTarget(ev.target); if (t && t !== tagFor) showTag(t); });
  document.addEventListener("pointerout", (ev) => { const t = tagTarget(ev.target); if (t && !t.contains(ev.relatedTarget) && ev.pointerType !== "touch") hideTag(); });
  document.addEventListener("focusin", (ev) => { const t = tagTarget(ev.target); if (t) showTag(t, true); });
  document.addEventListener("focusout", (ev) => { if (tagTarget(ev.target)) hideTag(); });
  // touch: the first tap shows the name, the second opens; a tap anywhere else hides it
  document.addEventListener("pointerdown", (ev) => {
    if (ev.pointerType !== "touch") return;
    const t = tagTarget(ev.target);
    if (!t) { hideTag(); return; }
    if (tagFor !== t) { showTag(t, true); swallowClick = true; }
  }, true);

  // ----- actions -----
  function touched() { dirty = true; note = ""; }
  const ACTIONS = {
    "intro-next": introNext,
    "intro-skip": closeIntro,
    passport: renderIntro,
    "flip-pass": flipPass,
    bar() { toggleTray(); },
    print() { printRecord(); },
    "cm-close"() { closeContact(); },
    "cm-browser"() { openBrowser(); },
    "br-close"() { closeBrowser(); },
    "br-mail"() { closeBrowser(); const f = $("#cm-msg"); if (f) f.focus({ preventScroll: true }); },
    "cm-copy"(b) {
      const note = $("#cm-note"), done = () => { if (note) note.textContent = "Copied"; b.textContent = "Copied"; setTimeout(() => { b.textContent = "Copy address"; if (note) note.textContent = ""; }, 1600); };
      try { navigator.clipboard.writeText(state.profile.email).then(done, () => { if (note) note.textContent = state.profile.email; }); } catch (err) { if (note) note.textContent = state.profile.email; }
    },
    "all-back"() { putAllBack(); },
    pin(b) {
      const i = +b.dataset.i;
      ui.pinHot = ui.pinHot === i ? null : i;
      $$(".p-honours .honour, .list .honour").forEach((h) => { const pb = $(".pin", h); const on = pb && +pb.dataset.i === ui.pinHot; h.classList.toggle("lit", on); if (pb) pb.setAttribute("aria-pressed", String(on)); });
      FX.play("tap");
    },
    intercom() {
      FX.play("chime");
      const trigger = AREAS[currentArea()][0] === "desk" ? "unpacked" : "record";
      setTimeout(() => { if (!sayNow("intercom")) sayNow(trigger); }, reduced() ? 0 : 450);
    },
    note() {
      const f = $("#vnote"), pad = $("#notepad"), desk = $("#desk");
      if (!f) return;
      FX.play("peel");
      f.hidden = false;
      if (!isPhone()) {
        const w = f.offsetWidth, h = f.offsetHeight;
        if (pad.classList.contains("in-records")) setPos(f, pad.offsetLeft, pad.offsetTop + pad.offsetHeight + 8);
        else setPos(f, clamp(pad.offsetLeft + pad.offsetWidth - w, 8, desk.clientWidth - w - 8), clamp(pad.offsetTop - h + pad.offsetHeight, TOP, usable().bottom - h));
      }
      raise(f);
      if (!reduced()) { f.classList.remove("peeling"); void f.offsetWidth; f.classList.add("peeling"); }
      $("#vnote-text").focus({ preventScroll: true });
      noteLink();
    },
    "note-cancel"() { const f = $("#vnote"); if (f) f.hidden = true; const pad = $("#notepad"); if (pad) pad.focus({ preventScroll: true }); },
    tab(b) { const id = b.dataset.id; openCase(id); const el = paperEl(id); if (el) el.focus({ preventScroll: true }); },
    "to-box"(b) { fileBack(b.dataset.id); const el = paperEl(b.dataset.id); if (el) el.focus({ preventScroll: true }); },
    page(b) { flipCase(b.dataset.id, +b.dataset.dir); },
    lamp() { toggleLamp(); },
    view(b) { ui.view = b.dataset.v; render(); window.scrollTo(0, 0); const h = $("#hello"); if (h) h.focus({ preventScroll: true }); },
    area(b) { goArea(AREAS.findIndex((a) => a[0] === b.dataset.to)); },
    step(b) { goRoom(currentArea() + +b.dataset.dir); },
    "open-booth"() { ui.boothForced = true; applyScene(); $("#hello").focus({ preventScroll: true }); },
    "open-file"() {
      ui.forced = true; ui.boothForced = true; applyScene();
      const first = paperEl("id"); if (first) first.focus({ preventScroll: true });
    },
    sound(b) { const on = FX.toggle(); b.setAttribute("aria-pressed", String(on)); $(".sb-label", b).textContent = on ? "Sound on" : "Sound off"; if (on) FX.play("tick"); },
    radio(b) { ui.radioOn = !ui.radioOn; b.textContent = ui.radioOn ? "Mute radio" : "Unmute radio"; b.setAttribute("aria-pressed", String(ui.radioOn)); if (!ui.radioOn) $("#aside").hidden = true; },
    ask(b) { ui.asked = +b.dataset.q; const el = $("#bubble"); el.hidden = false; el.textContent = state.interview[ui.asked].a; },
    "close-case"(b) { closeCase(b.dataset.id); },
    flip(b) { flipCase(b.dataset.id, 1); },
    return(b) { returnPaper(b.dataset.id); },
    dw(b) { if (drawerDrag && drawerDrag.moved) return; if (ui.dwOpen === b.dataset.dw) closeDrawer(); else setDrawer(b.dataset.dw); },
    "sk-turn"(b) { sketchSpread = Math.max(0, sketchSpread + +b.dataset.dir); FX.play("flip"); openSketchbook(); },
    "dw-close"() { closeDrawer(); },
    "open-from-card"(b) { const id = b.dataset.id; liftCard(null); closeDrawer(true); setTimeout(() => { openCase(id); const el = paperEl(id); if (el) el.focus({ preventScroll: true }); }, reduced() ? 0 : 280); },
    card(b) { const i = +b.dataset.i; if (ui.liftCard === i) liftCard(null); else liftCard(i); },
    "card-back"() { liftCard(null); },
    "sk-close"() { const ov = $("#sketchbook-view"); if (ov) ov.hidden = true; },
    skill(b) {
      ui.hot = ui.hot === b.dataset.s ? null : b.dataset.s;
      refreshSkills();
      caseIds().forEach((id, i) => {
        const el = paperEl(id); if (!el) return;
        el.classList.toggle("hot", !!ui.hot && uses(state.projects[i].stack, ui.hot));
        const s = $(".stack-items", el); if (s) s.innerHTML = stackHTML(state.projects[i]);
      });
      const again = $('#sk-lift .sk[data-s="' + CSS.escape(b.dataset.s) + '"]') || $('.sk[data-s="' + CSS.escape(b.dataset.s) + '"]'); if (again) again.focus({ preventScroll: true });
    },
    demo(b) { const box = b.parentNode.querySelector(".demo-box"); box.hidden = false; b.hidden = true; DEMOS[state.projects[+b.dataset.i].demo](box); },
    tear() { if (perfMoved) return; tearAll(); },
    edit() { editing = true; note = ""; render(); window.scrollTo(0, 0); },
    discard() { state = JSON.parse(ORIGINAL); editing = false; dirty = false; note = ""; render(); },
    save: save,
    add(b) { at(b.dataset.p).push(JSON.parse(JSON.stringify(BLANK[b.dataset.t]))); touched(); render(); },
    del(b) { at(b.dataset.p).splice(+b.dataset.i, 1); touched(); render(); },
    copy(b) {
      const scope = b.closest(".slip") || b.closest(".row") || document;
      const pick = () => { const el = $(".email", scope); if (!el) return; const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Address selected"; };
      try { navigator.clipboard.writeText(state.profile.email).then(() => { b.textContent = "Copied"; }, pick); } catch (err) { pick(); }
    },
  };

  document.addEventListener("click", (ev) => {
    if (swallowClick) { swallowClick = false; ev.preventDefault(); ev.stopPropagation(); return; }
    const vs = ev.target.closest("#vn-send");
    if (vs) { if (!noteSent()) ev.preventDefault(); return; }
    const tile = ev.target.closest("a.br-tile[data-address]");
    if (tile) { typeAddress(tile.dataset.address); return; }
    if (ev.target.closest(".stamp-btn")) return; // stamps are handled by pointer and keyboard
    const po = ev.target.closest(".pobj");
    if (po) { if (!justDragged) usePobj(po); return; }
    if (ev.target.closest('.sticker[data-sticker="mug"]') && !justDragged) { mugEgg(); return; }
    if (ui.dwOpen && !isPhone() && !ev.target.closest(".dw, .dw-big, #pills, #fixed-root")) setDrawer(null);
    const b = ev.target.closest("[data-act]");
    if (b && !b.disabled) { ACTIONS[b.dataset.act](b); return; }
    const folder = ev.target.closest(".paper.p-case:not(.open)");
    if (folder && !justDragged) { openCase(folder.dataset.id); return; }
    const slipEl = ev.target.closest("#slip.loose");
    if (slipEl && !justDragged && !ev.target.closest("button, a")) openContact(slipEl);
  }, true);

  // pointer handling: stamps first, then the drawer handle, the perforation, and desk papers
  let drag = null, pageDrag = null, sheetDrag = null, justDragged = false, swallowClick = false, drawerDrag = null, perfDrag = null, perfMoved = false;
  const NO_DRAG = "button, a, input, textarea, select, label, .demo-box, .f";
  document.addEventListener("pointerover", (ev) => { const po = ev.target.closest && ev.target.closest(".pobj"); if (po && !drag) showNote(po); });
  document.addEventListener("pointerout", (ev) => { const po = ev.target.closest && ev.target.closest(".pobj"); if (po && !po.contains(ev.relatedTarget)) hideNote(); });
  document.addEventListener("focusout", (ev) => { if (ev.target.closest && ev.target.closest(".pobj")) hideNote(); });
  document.addEventListener("focusin", (ev) => { if (ev.target.matches && ev.target.matches(".pobj")) showNote(ev.target); });
  document.addEventListener("focusin", (ev) => { if (ev.target.matches && ev.target.matches("#cm-subject, #cm-msg")) lastField = ev.target; });
  document.addEventListener("input", (ev) => { if (ev.target.id === "vnote-text") noteLink(); if (ev.target.id === "cm-msg") sudoEgg(ev.target); });
  document.addEventListener("pointerdown", (ev) => {
    const key = ev.target.closest && ev.target.closest(".cm-key");
    if (key && ui.contactOpen) {
      ev.preventDefault();
      const f = lastField && lastField.isConnected ? lastField : $("#cm-msg"), k = key.dataset.k;
      if (!f) return;
      const a = f.selectionStart, b = f.selectionEnd, v = f.value;
      if (k === "Back") { const from = a === b ? Math.max(0, a - 1) : a; f.value = v.slice(0, from) + v.slice(b); f.selectionStart = f.selectionEnd = from; }
      else { const ch = k === "Enter" ? (f.tagName === "TEXTAREA" ? "\n" : "") : k === " " ? " " : k.toLowerCase(); f.value = v.slice(0, a) + ch + v.slice(b); f.selectionStart = f.selectionEnd = a + ch.length; }
      f.dispatchEvent(new Event("input", { bubbles: true }));
      f.focus({ preventScroll: true });
      typeSound(k); pressKey(k);
      return;
    }
    if (ev.button !== 0) return;
    const sbtn = ev.target.closest(".stamp-btn");
    if (held && held.mode === "armed" && !held.busy) {
      // a stamp is waiting: tap a paper to stamp there, tap anything else (or the same stamp) to put it back
      ev.preventDefault(); swallowClick = true;
      const s = stampableAt(ev.clientX, ev.clientY);
      if (s && !sbtn) { placeHeld(ev.clientX, ev.clientY, true); held.over = s; setTimeout(stampDown, reduced() ? 0 : 160); }
      else { const k = held.kind; springBack(); if (sbtn && sbtn.dataset.kind !== k) setTimeout(() => { pickUp(sbtn.dataset.kind, "armed"); }, reduced() ? 0 : 220); }
      return;
    }
    if (sbtn) {
      ev.preventDefault();
      if (held) springBack(true);
      pending = { kind: sbtn.dataset.kind, sx: ev.clientX, sy: ev.clientY, id: ev.pointerId };
      try { sbtn.setPointerCapture(ev.pointerId); } catch (err) { /* optional */ }
      return;
    }
    const cc = ev.target.closest('.corner[data-act="flip"]');
    if (cc && !isPhone() && !reduced()) {
      const el = cc.closest(".paper");
      sheetDrag = { id: el.dataset.id, sx: ev.clientX, w: $(".sheets", el).offsetWidth, moved: false, p: 0, sheet: null };
      try { cc.setPointerCapture(ev.pointerId); } catch (err) { /* optional */ }
      return;
    }
    const pc = ev.target.closest('.corner[data-act="flip-pass"]');
    if (pc && !isPhone() && !reduced()) {
      const leaf = $("#pp-leaf");
      pageDrag = { sx: ev.clientX, w: leaf.offsetWidth, from: ui.passPage, moved: false, p: 0, leaf: leaf };
      try { pc.setPointerCapture(ev.pointerId); } catch (err) { /* optional */ }
      return;
    }
    const front = ev.target.closest(".dw-front");
    if (front && !isPhone()) { drawerDrag = { sy: ev.clientY, id: front.dataset.dw, moved: false }; return; }
    const perf = ev.target.closest("#perf");
    if (perf) { perfDrag = { sx: ev.clientX, w: perf.offsetWidth, start: ui.torn }; perfMoved = false; perf.setPointerCapture(ev.pointerId); return; }
    const el = ev.target.closest("[data-drag]");
    if (!el) return;
    if (el.classList.contains("paper") || el.id === "slip") raise(el);
    if (ev.target.closest(NO_DRAG) || isPhone()) return;
    drag = { el: el, sx: ev.clientX, sy: ev.clientY, ox: el.offsetLeft, oy: el.offsetTop, moved: false, id: ev.pointerId };
  });
  document.addEventListener("pointermove", (ev) => {
    if (pending && ev.pointerId === pending.id) {
      if (Math.hypot(ev.clientX - pending.sx, ev.clientY - pending.sy) < 5) return;
      const p = pending; pending = null;
      pickUp(p.kind, "drag");
      held.grab = [p.sx - held.fx, p.sy - held.fy];
    }
    if (held && held.mode === "drag" && !held.busy) { placeHeld(ev.clientX - held.grab[0], ev.clientY - held.grab[1]); return; }
    if (sheetDrag) {
      const dx = sheetDrag.sx - ev.clientX;
      if (dx > 6 && !sheetDrag.moved) { sheetDrag.moved = true; sheetDrag.sheet = startSheet(sheetDrag.id, 1); sheetDrag.sheet.classList.add("held-page"); FX.play("flip"); }
      if (!sheetDrag.moved) return;
      sheetDrag.p = clamp(dx / sheetDrag.w, 0, 1);
      sheetDrag.sheet.style.transform = "rotateY(" + -Math.round(sheetDrag.p * 8) * 22.5 + "deg)";
      return;
    }
    if (pageDrag) {
      const dx = ev.clientX - pageDrag.sx;
      if (Math.abs(dx) > 6 && !pageDrag.moved) { pageDrag.moved = true; pageDrag.leaf.classList.add("held-page"); $("#passport").classList.add("turning"); }
      if (!pageDrag.moved) return;
      // toward the spine: left for the visa leaf, right once it has been turned
      pageDrag.p = clamp((pageDrag.from === 0 ? -dx : dx) / pageDrag.w, 0, 1);
      const turned = pageDrag.from === 0 ? pageDrag.p : 1 - pageDrag.p;
      pageDrag.leaf.style.transform = "rotateY(" + -Math.round(turned * 8) * 22.5 + "deg)";
      return;
    }
    if (drawerDrag) {
      const dy = drawerDrag.sy - ev.clientY;
      if (Math.abs(dy) > 5) drawerDrag.moved = true;
      if (dy > 16 && ui.dwOpen !== drawerDrag.id) setDrawer(drawerDrag.id);
      else if (dy < -16 && ui.dwOpen === drawerDrag.id) setDrawer(null);
      return;
    }
    if (perfDrag) {
      const dx = Math.abs(ev.clientX - perfDrag.sx);
      if (dx > 6) perfMoved = true;
      if (perfMoved) { setTear(clamp(perfDrag.start + (dx / perfDrag.w) * 1.2, 0, 1)); if (ui.torn >= 0.85) { perfDrag = null; tearOff(); } }
      return;
    }
    if (!drag || ev.pointerId !== drag.id) return;
    const dx = ev.clientX - drag.sx, dy = ev.clientY - drag.sy;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < 5) return;
      drag.moved = true;
      if (drag.el.classList.contains("pobj") && !drag.el.classList.contains("on-desk")) {
        const r = rectOf(drag.el), d = rectOf($("#desk")), x = r.left - d.left, y = r.top - d.top;
        hideNote(); pobjToDesk(drag.el, x, y); drag.ox = x; drag.oy = y;
      }
      if (drag.el.classList.contains("filed")) { const id = drag.el.dataset.id; pst(id).inBox = false; drag.el.classList.remove("filed"); }
      drag.el.classList.remove("moving", "nudge"); drag.el.classList.add("held");
      try { drag.el.setPointerCapture(ev.pointerId); } catch (err) { /* capture is optional */ }
      FX.play(drag.el.classList.contains("sticker") ? "tap" : "lift");
      if (drag.el.dataset.p === "watch") say("watch");
      if (drag.el.classList.contains("paper")) markHandled();
    }
    moveTo(drag.el, drag.ox + dx, drag.oy + dy);
    if (drag.el.classList.contains("paper")) checkLamp();
    const ct = $("#counter"), isCase = drag.el.classList.contains("p-case"), fb = $("#filebox");
    if (ct && drag.el.classList.contains("paper") && !isCase && !drag.el.classList.contains("p-record")) {
      const r = rectOf(ct); ct.classList.add("show-hint"); ct.classList.toggle("ready", ev.clientY < r.bottom && ev.clientY > r.top - 40);
    }
    if (fb && isCase) fb.classList.toggle("hot", inside(rectOf(fb), ev.clientX, ev.clientY));
  });
  function endDrag(ev) {
    if (pending && (!ev || ev.pointerId === pending.id)) {
      // a tap on a stamp lifts it; the next tap on a paper stamps it there
      const p = pending; pending = null;
      if (ev && ev.type === "pointerup") pickUp(p.kind, "armed");
      return;
    }
    if (held && held.mode === "drag" && !held.busy) { if (held.over) stampDown(); else springBack(); return; }
    if (sheetDrag) {
      const d = sheetDrag; sheetDrag = null;
      if (!d.moved) return;
      swallowClick = true;
      d.sheet.classList.remove("held-page");
      finishSheet(d.id, d.sheet, 1, d.p > 0.5);
      return;
    }
    if (pageDrag) {
      const d = pageDrag; pageDrag = null;
      if (!d.moved) return;
      swallowClick = true;
      d.leaf.classList.remove("held-page");
      setLeaf(d.p > 0.5 ? 1 - d.from : d.from, true);
      return;
    }
    if (drawerDrag) {
      if (drawerDrag.moved) setTimeout(() => { drawerDrag = null; }, 0); else drawerDrag = null;
      return;
    }
    if (perfDrag) { perfDrag = null; return; }
    if (!drag) return;
    const d = drag; drag = null;
    if (!d.moved) return;
    justDragged = true; setTimeout(() => { justDragged = false; }, 0);
    d.el.classList.remove("held");
    const tilt = +(Math.random() * 6 - 3).toFixed(1);
    d.el.style.setProperty("--tilt", tilt + "deg");
    const ct = $("#counter"), fb = $("#filebox");
    if (ct) ct.classList.remove("show-hint");
    if (fb && fb.classList.contains("hot")) { fb.classList.remove("hot"); fileBack(d.el.dataset.id); return; }
    if (d.el.classList.contains("pobj")) {
      const home = $('#dw-big.open[data-dw="personal"] .dw-floor-personal');
      if (home && inside(rectOf(home), ev.clientX, ev.clientY)) { pobjHome(d.el); FX.play("tap"); return; }
    }
    checkLamp();
    if (d.el.classList.contains("paper")) {
      pst(d.el.dataset.id).tilt = tilt;
      if (ct && ct.classList.contains("ready")) { ct.classList.remove("ready"); putAway(d.el.dataset.id, { x: d.ox, y: Math.max(d.oy, TOP) }); return; }
    }
    if (ct) ct.classList.remove("ready");
    FX.play(d.el.classList.contains("sticker") ? "tap" : "settle");
  }
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);
  document.addEventListener("dragstart", (ev) => { if (ev.target.closest && ev.target.closest("[data-drag], .stamp-btn, [data-stamp-root]")) ev.preventDefault(); });

  document.addEventListener("keydown", (ev) => {
    if (!ui.contactOpen && !editing && ui.view === "desk" && !$("#intro") && !(ev.target.matches && ev.target.matches("input, textarea, [contenteditable], .f"))) hireEgg(ev);
    const po = ev.target.closest && ev.target.closest(".pobj");
    if ((ev.key === "ArrowLeft" || ev.key === "ArrowRight") && !isPhone() && ui.view === "desk" && !editing && !held && !ui.contactOpen && !$("#intro") &&
      !(ev.target.closest && ev.target.closest("input, textarea, select, [contenteditable], .f, [data-drag], .pobj, .passport, .cm-device, .pager, .sk-lift"))) {
      ev.preventDefault(); goRoom(ui.room + (ev.key === "ArrowRight" ? 1 : -1)); return;
    }
    if (po && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); usePobj(po); return; }
    if (po && (ev.key === "m" || ev.key === "M")) { ev.preventDefault(); movePobj(po); return; }
    if (ui.contactOpen) {
      if (ev.key === "Escape") { ev.preventDefault(); if (!closeBrowser()) closeContact(); return; }
      if (ev.target.matches && ev.target.matches("#cm-subject, #cm-msg") && !ev.ctrlKey && !ev.metaKey) {
        const k = keyName(ev);
        if (k) { typeSound(k); pressKey(k); }
      }
      if (ev.key === "Tab") {
        const f = $$("#contact a[href], #contact button, #contact input, #contact textarea").filter((e) => e.offsetParent);
        const i = f.indexOf(document.activeElement);
        if (ev.shiftKey && (i <= 0)) { ev.preventDefault(); f[f.length - 1].focus(); }
        else if (!ev.shiftKey && i === f.length - 1) { ev.preventDefault(); f[0].focus(); }
      }
      return;
    }
    if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches && ev.target.matches("#slip.loose")) { ev.preventDefault(); openContact(ev.target); return; }
    const t = ev.target, typing = t.closest && t.closest(".f, input, textarea, [contenteditable]");
    if (ev.key === "Enter" && t.closest && t.closest(".f")) ev.preventDefault();
    if (typing || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    const sbtn = t.closest && t.closest(".stamp-btn");
    if (sbtn) {
      // keyboard stamping: Enter picks up and stamps, arrows move, B jumps to the stamp box, Escape puts it back
      const mine = held && held.btn === sbtn;
      if (ev.key === "Enter" || ev.key === " ") {
        ev.preventDefault();
        if (!mine) { pickUp(sbtn.dataset.kind, "key"); return; }
        if (!held.busy) { held.over = stampableAt(held.fx, held.fy); stampDown(); }
        return;
      }
      if (mine && !held.busy) {
        const big = ev.shiftKey ? 48 : 12, step = { ArrowLeft: [-big, 0], ArrowRight: [big, 0], ArrowUp: [0, -big], ArrowDown: [0, big] }[ev.key];
        if (step) { ev.preventDefault(); placeHeld(held.fx + step[0], held.fy + step[1]); return; }
        if (ev.key === "b" || ev.key === "B") {
          ev.preventDefault();
          const s = stampables()[0];
          if (s) { const b = rectOf($(".stamp-box", s)); placeHeld(b.left + b.width / 2, b.top + b.height / 2, true); $("#stamp-status").textContent = "Over the stamp box. Press Enter to stamp."; }
          return;
        }
        if (ev.key === "Escape") { ev.preventDefault(); springBack(); $("#stamp-status").textContent = "Stamp put back."; return; }
      }
    }
    if (ev.key === "Escape" && !held && $("#stampbar").classList.contains("out") && document.activeElement && document.activeElement.closest("#stampdock")) { toggleTray(false); return; }
    if ((ev.key === "s" || ev.key === "S") && !typing && !held && (ui.view === "desk" || $("#intro")) && !editing) { ev.preventDefault(); toggleTray(); return; }
    if (ev.key === "Escape") {
      if (held) { springBack(); return; }

      if ($("#intro")) { closeIntro(); return; }
      if (slow) { setSlow(false); return; }
      const sv = $("#sketchbook-view"); if (sv && !sv.hidden) { sv.hidden = true; return; }
      if (ui.liftCard != null) { liftCard(null); return; }
      if (ui.dwOpen && !isPhone()) { closeDrawer(); return; }
      if (ui.dwOpen && !isPhone()) { const f = $("#dw-" + ui.dwOpen + " .dw-front"); setDrawer(null); if (f) f.focus({ preventScroll: true }); return; }
      const open = paperIds().filter((id) => pst(id).open);
      const which = open.includes(ui.front) ? ui.front : open[open.length - 1];
      if (which) closeCase(which);
      return;
    }
    const k = ev.key.toLowerCase(), root = t.closest && t.closest("[data-stamp-root]");
    if ((k === "a" || k === "d") && root && !editing && !held && (root.id !== "passport" || root.classList.contains("open")) && (root.id !== "receipt" || ui.printed)) {
      ev.preventDefault();
      if (root.id === "passport" && ui.passPage !== 0) flipPass();
      stampOnto(root, k === "a" ? "approved" : "denied");
      return;
    }
    const el = t.closest && t.closest("[data-drag]");
    if (!el || el !== t || isPhone()) return;
    if ((ev.key === "Enter" || ev.key === " ") && el.matches(".p-case:not(.open)")) { ev.preventDefault(); if (pst(el.dataset.id).inBox) takeOut(el.dataset.id); else openCase(el.dataset.id); return; }
    if ((ev.key === "b" || ev.key === "B") && el.matches(".p-case")) { ev.preventDefault(); fileBack(el.dataset.id); return; }
    const step = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] }[ev.key];
    if (step) { ev.preventDefault(); markHandled(); raise(el); moveTo(el, el.offsetLeft + step[0], el.offsetTop + step[1]); }
  });
  document.addEventListener("input", (ev) => {
    if (ev.target.closest && ev.target.closest("#contact")) { const a = $("#cm-send"); if (a) a.href = mailto(); }
  });
  app.addEventListener("input", (ev) => {
    const el = ev.target.closest("[data-k]");
    if (!el) return;
    const keys = el.dataset.k.split("."), last = keys.pop();
    const text = el.textContent.replace(/\s+/g, " ").trim();
    at(keys.join("."))[last] = el.hasAttribute("data-list") ? text.split(",").map((s) => s.trim()).filter(Boolean) : text;
    touched(); setOwner();
  });

  let swipe = null;
  document.addEventListener("pointerdown", (ev) => {
    if (ev.pointerType !== "touch" || isPhone() || ui.view !== "desk" || $("#intro") || ev.target.closest("[data-drag], button, a, input, textarea, .stamp-btn, .pobj, .dw, .cm-device")) { swipe = null; return; }
    swipe = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
  });
  document.addEventListener("pointerup", (ev) => {
    if (!swipe || ev.pointerId !== swipe.id) return;
    const dx = ev.clientX - swipe.x, dy = ev.clientY - swipe.y; swipe = null;
    if (Math.abs(dx) > 60 && Math.abs(dy) < 50) goRoom(ui.room + (dx < 0 ? 1 : -1));
  });
  let ticking = false;
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (ui.view === "desk" && !editing) { applyScene(); updatePill(); updateBar(); }
      if (held && !held.busy) placeHeld(held.fx, held.fy);
    });
  }, { passive: true });
  let rz = null;
  window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(onResize, 120); });
  narrow.addEventListener("change", () => { if (ui.view === "desk" && !editing) render(); });
  setInterval(() => { const c = $("#clock"); if (c) c.textContent = clock(); }, 20000);

  // ----- saving: the whole page, rebuilt from its own source and the current data -----
  function buildDoc() {
    const lt = "<", sc = "script", block = (id) => lt + sc + ' id="' + id + '">' + $("#" + id).textContent + lt + "/" + sc + ">\n";
    const json = JSON.stringify(state, null, 1).replace(/</g, "\\u003c");
    return "<!doctype html><html><head><meta charset=utf8><meta name=viewport content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><style>" +
      ":root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}" +
      "</style></head><body>" +
      "<title>CV Please</title>\n<meta name=\"claude:viewport-fit-sides\" content=\"cover\">\n" +
      '<link rel="stylesheet" href="' + $("#fonts").getAttribute("href") + '" id="fonts">\n' +
      "<style id=\"page-style\">" + $("#page-style").textContent + "</style>\n<div id=\"app\"></div>\n<div id=\"intro-root\"></div>\n<div id=\"fixed-root\"></div>\n" +
      lt + sc + " type=\"application/json\" id=\"cv-data\">" + json + lt + "/" + sc + ">\n" + block("art") + block("sprites") + block("sounds") + block("fx") + block("demos") + block("main") + "</body></html>";
  }
  async function save() {
    if (!artifact || busy || !dirty) return;
    busy = true; note = ""; setOwner();
    try {
      await artifact.publish(buildDoc());
    } catch (err) {
      busy = false;
      const code = err && err.code;
      if (code === "conflict") note = "A newer version was saved first. Reloading it.";
      else if (["not_writer", "not_granted", "not_declared", "consent_required", "capability_disabled", "capability_removed"].includes(code)) {
        canEdit = false; editing = false; state = JSON.parse(ORIGINAL); render(); return;
      }
      else if (code === "too_large") note = "Too much text to save. Shorten something and try again.";
      else if (code === "rate_limited") note = "Saving too often. Wait a moment, then file again.";
      else note = "Could not save. Your edits are still here, so try again.";
      setOwner();
    }
  }

  SPR.installTiles(PX);
  renderFixed();
  render();
  renderIntro();

  (async function () {
    if (!window.claude || !window.claude.use) return;
    const got = await Promise.all([window.claude.use("artifact"), window.claude.use("user")]);
    artifact = got[0];
    if (!artifact) return;
    canEdit = got[1] ? await got[1].canEdit() : true;
    if (canEdit) setOwner();
  })();
})();
