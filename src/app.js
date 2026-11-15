(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const app = $("#app"), introRoot = $("#intro-root"), fixedRoot = $("#fixed-root");
  const SPR = window.SPR, DEMOS = window.DEMOS, FX = window.FX, PX = 3;
  const ORIGINAL = $("#cv-data").textContent;
  let state = JSON.parse(ORIGINAL);

  let editing = false, dirty = false, canEdit = false, busy = false, note = "", artifact = null;
  const ui = {
    view: "desk", admitted: null, introStep: 0, introDone: false, passPage: 0,
    marks: { visa: [], record: [] }, inked: { visa: false, record: false }, papers: {}, stickers: {}, scene: null, maxOut: 0,
    forced: false, boothForced: false, handled: false, drawer: 0, fit: 1,
    hot: null, front: null, printed: false, torn: 0, slipTorn: false, slipPos: null,
    barAuto: false, barPinned: null, radioOn: true, said: new Set(), asked: null,
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
  const pst = (id) => ui.papers[id] || (ui.papers[id] = { x: null, y: null, tilt: +(rnd(id, "tilt") * 3 - 1.5).toFixed(1), open: false, page: 0, pages: null, away: false, prev: null, nudged: null });
  const paperEl = (id) => $('#desk .paper[data-id="' + id + '"]');
  const portraitAlt = "Pixel portrait of Thea: short dark hair, light shirt with an open collar";

  function idInner() {
    const p = state.profile;
    return '<div class="pad"><p class="doc-title">Identity card</p><div class="id-body"><div class="id-photo">' + SPR.applicant("thea", 2, portraitAlt) +
      '</div><dl class="fields">' + field("Name", p.name) + field("Nationality", p.nationality) + field("Based in", p.basedIn) + field("Occupation", p.occupation) + "</dl></div></div>";
  }
  function diplomaInner() {
    const e = state.education;
    return '<div class="pad"><p class="doc-title">Diploma <span class="ink green seal">With distinction</span></p>' +
      '<p class="dip-line"><b>' + esc(e.degree) + '</b></p><p class="dip-line">' + esc(e.school) + '</p><p class="dip-line">' + esc(e.major) +
      '</p><p class="dip-line">Graduated ' + esc(e.graduated) + '</p><p class="dip-line">Coursework: ' + esc(e.coursework) + "</p></div>";
  }
  function honoursInner() {
    return '<div class="pad"><p class="doc-title">Commendations</p>' + state.awards.filter((a) => a.result).map((a) =>
      '<div class="honour"><b>' + esc(a.result) + "</b>, " + esc(a.event) + " " + esc(a.year) + "<p>" + esc(a.note) + "</p></div>").join("") + "</div>";
  }
  function folderInner(i) {
    const p = state.projects[i];
    return '<span class="folder-tab">' + esc(shortName(p)) + '</span><span class="clip">' + SPR.draw("clip", PX) + "</span>" +
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
    const p = state.projects[i], st = pst("case-" + i), pages = st.pages || [""], n = pages.length, page = Math.min(st.page, n - 1);
    return '<header class="paper-head"><h2>' + esc(shortName(p)) + "</h2>" + (n > 1 ? '<span class="pg">Page ' + (page + 1) + " of " + n + "</span>" : "") +
      '<button class="close" data-act="close-case" data-id="case-' + i + '">Close file</button></header><div class="paper-body">' + pages[page] + "</div>" +
      (n > 1 ? '<button class="corner" data-act="flip" data-id="case-' + i + '" aria-label="Turn to page ' + ((page + 1) % n + 1) + '">' + SPR.draw("corner", PX) + "</button>" : "");
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
    const cls = "paper p-" + kind + (st.open ? " open" : "") + (st.away ? " away" : "") + (isPhone() ? "" : " packed") +
      (i >= 0 && ui.hot && uses(state.projects[i].stack, ui.hot) ? " hot" : "");
    const label = i >= 0 ? "Case file: " + state.projects[i].name : paperLabel(id);
    return '<article class="' + cls + '" data-id="' + id + '" data-drag tabindex="0" aria-label="' + esc(label) + '"' +
      (i >= 0 ? ' aria-expanded="' + st.open + '"' : "") + ' style="--tilt:' + st.tilt + "deg" + (i >= 0 ? ";--tab-x:" + ((i % 3) * 34 + 8) + "px" : "") + '">' + paperInner(id) + "</article>";
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
    return '<header class="booth" id="booth"><div class="window-wrap"><div class="window"><span class="skyline">' + SPR.scene(PX) + "</span>" +
      SPR.applicant(p.applicant || "thea", PX, portraitAlt + ", standing at the booth window", "applicant") + '<span class="ledge" aria-hidden="true"></span>' +
      '<div class="shutter" id="shutter"><span>Booth closed. Scroll to open.</span><button class="btn-quiet" data-act="open-booth">Open the shutter</button></div></div>' +
      '<div class="board" id="board" aria-hidden="true"></div><p class="sr-only">Departure board: ' + esc(p.board.join(", ")) + "</p></div>" +
      '<div class="booth-main"><div class="booth-links"><button class="btn-quiet" data-act="area" data-to="record">60-second version</button><button class="btn-quiet" data-act="view" data-v="list">List view</button>' +
      '<button class="btn-quiet" data-act="passport">View passport</button><span class="owner" id="owner">' + ownerBar() + "</span></div>" +
      '<div class="plate-row"><div class="nameplate"><h1 id="hello" tabindex="-1">' + esc(p.greeting) + '</h1></div><p class="tagline">' + esc(p.tagline) + "</p></div>" +
      '<p class="denied-note" id="denied-note"' + (ui.admitted === "denied" ? "" : " hidden") + ">" + esc(deniedLine()) + "</p>" +
      (qs.length ? '<div class="ask">' + qs.map((x) => '<button class="btn-quiet" data-act="ask" data-q="' + x[1] + '">' + esc(x[0].q) + "</button>").join("") + "</div>" +
        '<p class="bubble" id="bubble" aria-live="polite"' + (ui.asked == null ? " hidden" : "") + ">" + (ui.asked == null ? "" : esc(state.interview[ui.asked].a)) + "</p>" : "") + "</div>" +
      '<div class="booth-side"><p class="clock"><time id="clock">' + clock() + "</time></p>" +
      '<button class="btn-quiet" data-act="sound" aria-pressed="' + FX.soundOn + '">' + (FX.soundOn ? "Sound on" : "Sound off") + "</button>" +
      (hasRadio() ? '<div class="radio">' + SPR.draw("radio", PX) + '<button class="btn-quiet" data-act="radio" aria-pressed="' + ui.radioOn + '">' + (ui.radioOn ? "Mute radio" : "Unmute radio") + "</button></div>" : "") +
      '</div><p class="aside" id="aside" aria-live="polite" hidden></p></header>';
  }

  function deskHTML() {
    const sticker = (id) => '<span class="sticker" data-sticker="' + id + '" data-drag aria-hidden="true">' + SPR.draw(id, PX) + "</span>";
    return '<section class="desk" id="desk" aria-label="Desk">' +
      '<p class="phone-hint">Swipe through the papers. Tap a folder to open it.</p>' +
      '<div class="counter" id="counter"><div class="put-away" id="putaway"></div><span class="counter-hint" id="counter-hint">Drop a paper on the counter to put it away</span></div>' +
      '<div class="lamp" aria-hidden="true"><span class="off">' + SPR.lamp(false, PX) + '</span><span class="on">' + SPR.lamp(true, PX) + "</span></div>" +
      '<span class="pool" aria-hidden="true">' + SPR.pool(PX) + '</span><span class="ring" aria-hidden="true">' + SPR.ring(PX) + "</span>" +
      sticker("cup") + sticker("plant") + sticker("laptop") +
      '<div class="envelope" id="envelope" aria-hidden="true">' + SPR.draw("envelope", PX) + '<span class="ink red env-stamp">Applicant file</span></div>' +
      '<div class="unpack-hint" id="unpack-hint"><p id="unpack-say">Scroll down and the applicant file unpacks itself.</p><button class="btn-main" data-act="open-file">Open the file</button></div>' +
      paperIds().map(paperHTML).join("") +
      '<div class="drawer" id="drawer"><div class="drawer-front"><button class="handle" id="handle" data-act="drawer" aria-expanded="false" aria-controls="drawer-box">' +
      SPR.draw("handle", PX) + '<span>Skills drawer</span></button></div><div class="drawer-box" id="drawer-box">' + skillsHTML() + "</div></div></section>";
  }

  // ----- entry record -----
  function recordHTML() {
    const p = state.profile, e = state.education, feat = state.projects.filter((x) => x.featured);
    const slip = '<div class="slip' + (ui.slipTorn && !isPhone() ? " loose" : "") + '" id="slip" tabindex="-1"' + (ui.slipTorn ? " data-drag" : "") + '><p class="s-title">Contact slip</p>' +
      '<span class="email">' + esc(p.email) + '</span><div class="row"><button class="btn-quiet" data-act="copy">Copy address</button>' +
      p.links.map((l) => (safeUrl(l.url) ? '<a href="' + esc(safeUrl(l.url)) + '" target="_blank" rel="noopener">' + esc(l.label) + "</a>" : "")).join("") + "</div></div>";
    return '<section class="record-sec" id="record" aria-labelledby="record-h"><div class="record-wrap"><div class="record-intro"><h2 id="record-h">Entry record</h2>' +
      "<p>The 60-second version, printed at the booth. Stamp it if you want to leave a verdict.</p></div>" +
      '<div class="printer-area' + (ui.printed ? " printed" : "") + '" id="printer-area"><div class="printer" id="printer">' +
      (ui.printed ? "" : '<button class="btn-quiet" data-act="print">Print record</button>') + '<span class="led" aria-hidden="true"></span></div>' +
      '<div class="receipt' + (ui.slipTorn ? " torn" : "") + '" id="receipt" data-stamp-root tabindex="0" aria-label="Entry record. Press A to stamp it approved or D to stamp it denied.">' +
      '<div class="rec stampable" data-stamp="record"><p class="r-title">Entry record</p><p>Desk 04 · ' + today + "</p>" +
      "<dl><dt>Name</dt><dd>" + esc(p.name) + "</dd><dt>Seeking</dt><dd>" + esc(p.seeking) + "</dd><dt>Based in</dt><dd>" + esc(p.basedIn) + "</dd><dt>Education</dt><dd>" +
      esc(e.degree) + ", " + esc(e.graduated) + '</dd></dl><p class="r-h">Strengths</p><ul>' + state.strengths.filter(Boolean).map((s) => "<li>" + esc(s) + "</li>").join("") +
      '</ul><p class="r-h">Top projects</p><ul>' + feat.map((x) => "<li>" + esc(shortName(x)) + ", " + esc(x.award || x.role) + "</li>").join("") +
      '</ul><div class="stamp-box' + (ui.inked.record ? " inked" : "") + '">Stamp box</div><div class="marks" data-marks="record"></div></div>' +
      (ui.slipTorn ? "" : '<button class="perf" id="perf" data-act="tear" aria-label="Tear off the contact slip"><span class="lab">Tear here</span></button>' + slip) + "</div>" +
      (ui.slipTorn ? slip : "") + "</div></div>" +
      '<footer class="foot">' + esc(p.name) + " · " + esc(p.basedIn) + "</footer></section>";
  }

  // ----- fixed controls: the stamp bar and the pill nav -----
  const FACE = SPR.STAMP_FACE;
  const stampArt = (kind) => '<span class="stamp-art">' + SPR.stamp(kind, 2) + '<span class="word" style="left:' + FACE.x * 2 + "px;top:" + FACE.y * 2 + "px;width:" + FACE.w * 2 + "px;height:" + FACE.h * 2 + 'px">' +
    (kind === "approved" ? "APPROVED" : "DENIED") + "</span></span>";
  function renderFixed() {
    const slot = (kind) => '<button class="stamp-btn" data-kind="' + kind + '" aria-label="' + (kind === "approved" ? "Approved" : "Denied") + ' stamp" aria-describedby="stamp-keys">' + stampArt(kind) + "</button>";
    fixedRoot.innerHTML = '<aside class="stampbar" id="stampbar" aria-label="Stamp bar">' +
      '<button class="bar-tab" data-act="bar" aria-expanded="false" aria-controls="bar-rail">Stamps</button>' +
      '<div class="bar-rail" id="bar-rail"><div class="rivets" aria-hidden="true"><i></i><i></i></div>' + slot("denied") + slot("approved") +
      '<p class="bar-note"><span class="point">Drag a stamp onto the paper and let go. Or tap a stamp, then the paper.</span><span class="touch">Drag a stamp onto the paper, or tap one, then the paper.</span></p><div class="rivets" aria-hidden="true"><i></i><i></i></div>' +
      '<p class="sr-only" id="stamp-keys">Press Enter to pick it up, arrow keys to move it, B to move it over the stamp box, Enter to stamp and Escape to put it back.</p></div></aside>' +
      '<p class="sr-only" id="stamp-status" aria-live="polite"></p>' +
      '<span class="mark ink ink-preview" id="ink-preview" hidden></span>' +
      '<nav class="pill" id="pill" aria-label="Areas"><button data-act="step" data-dir="-1" aria-label="Previous area">' + SPR.draw("left", PX) +
      '</button><span class="area" id="area-name" aria-live="polite">Booth</span><button data-act="step" data-dir="1" aria-label="Next area">' + SPR.draw("right", PX) + "</button></nav>";
  }

  // ----- scroll scene: the booth builds, then the file unpacks -----
  const B_SHUT = 160, B_COUNTER = 120, B_LAMP = 70, B_BOARD = 70, BOOT = B_SHUT + B_COUNTER + B_LAMP + B_BOARD, UNIT = 110, DWELL = 320;
  const stageH = () => Math.max(window.innerHeight, 600);
  const unpackEnd = () => BOOT + ORDER().length * UNIT;
  const docTop = (el) => rectOf(el).top + window.scrollY;
  function sizeScene() {
    const sc = $("#scene"), stage = $("#stage");
    if (!sc) return;
    if (isPhone()) { sc.style.height = ""; stage.style.height = ""; return; }
    stage.style.height = stageH() + "px";
    sc.style.height = stageH() + unpackEnd() + DWELL + "px";
  }
  function sceneNow() {
    const n = ORDER().length;
    if (isPhone()) return { shut: 4, counter: 3, lamp: true, board: true, out: n };
    const px = Math.max(0, -rectOf($("#scene")).top), bf = ui.boothForced || ui.forced;
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
    if (s.shut !== prev.shut) { sh.style.transform = "translateY(" + -s.shut * 25 + "%)"; sh.classList.toggle("up", s.shut === 4); if (!force) FX.play("tick"); }
    if (s.counter !== prev.counter) ct.style.transform = "translateX(" + -(3 - s.counter) * 34 + "%)";
    if (s.lamp !== prev.lamp) { desk.classList.toggle("lamp-on", s.lamp); if (!force && s.lamp) FX.play("tick"); }
    if (s.board !== prev.board) { if (s.board) board.start(); else board.blank(); }
    ORDER().forEach((id, i) => {
      const want = i < s.out, had = prev.out != null && i < prev.out;
      if (!force && want === had) return;
      if (want) unpack(id, force, i); else pack(id, force);
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
  const LANE = 170, MID_X = 286, TOP = 50, BOTTOM = 68, STACK_STEP = 28;
  const usable = () => { const d = $("#desk"); return { w: d.clientWidth, h: d.clientHeight, top: TOP, bottom: d.clientHeight - BOTTOM - 6 }; };
  function computeFit() {
    if (isPhone()) { ui.fit = 1; return; }
    const u = usable(), avail = u.bottom - u.top, el = (id) => paperEl(id);
    const folders = caseIds().map(el).filter(Boolean), last = folders[folders.length - 1];
    const stackH = 24 + (folders.length - 1) * STACK_STEP + (last ? last.offsetHeight : 120);
    const mids = ["id", "diploma", "honours"].map(el), midH = Math.max.apply(null, mids.map((e, k) => e.offsetHeight + [8, 16, 0][k]));
    const minW = mids[0].offsetWidth * 0.85 + mids[1].offsetWidth * 0.85 + mids[2].offsetWidth;
    ui.fit = clamp(Math.min(avail / stackH, avail / midH, (u.w - LANE - MID_X) / minW), 0.72, 1);
    $("#desk").style.setProperty("--fit", ui.fit.toFixed(3));
  }
  function landing(id, el) {
    const u = usable(), i = caseIndex(id), s = ui.fit;
    if (i >= 0) return [20 + (i % 2) * 6, Math.round(u.top + 24 * s + i * STACK_STEP * s)];
    const widths = ["id", "diploma", "honours"].map((k) => { const e = paperEl(k); return (e ? e.offsetWidth : 300) * s; });
    const midX = MID_X * Math.min(1, s + 0.1), avail = u.w - LANE - midX, min = widths[0] * 0.85 + widths[1] * 0.85 + widths[2];
    const extra = Math.max(0, avail - min) / 2;
    const gap0 = widths[0] * 0.85 + Math.min(extra, widths[0] * 0.15 + 40), gap1 = widths[1] * 0.85 + Math.min(extra, widths[1] * 0.15 + 40);
    const k = { id: 0, diploma: 1, honours: 2 }[id], x = [midX, midX + gap0, midX + gap0 + gap1][k];
    return [Math.round(x), Math.round(u.top + [8, 16, 0][k] * s)];
  }
  function envCenter() { const e = $("#envelope"); return [e.offsetLeft + e.offsetWidth / 2, e.offsetTop + e.offsetHeight / 2]; }
  function setPos(el, x, y) { el.style.left = x + "px"; el.style.top = y + "px"; }
  function still(el, fn) { el.classList.remove("moving"); el.style.transition = "none"; fn(); void el.offsetWidth; el.style.transition = ""; }
  function unpack(id, instant, order) {
    const el = paperEl(id), st = pst(id);
    if (!el || st.away) return;
    if (st.x == null) { const p = landing(id, el); st.x = p[0]; st.y = p[1]; }
    if (isPhone()) { el.classList.remove("packed"); return; }
    const go = () => { el.classList.remove("packed"); setPos(el, st.x, st.y); el.style.zIndex = 10 + (order || 0); };
    if (instant) still(el, go); else { el.classList.add("moving"); go(); FX.play("rustle"); }
  }
  function pack(id, instant) {
    const el = paperEl(id), st = pst(id);
    if (!el || st.away || isPhone()) return;
    const c = envCenter(), go = () => { el.classList.add("packed"); setPos(el, Math.round(c[0] - el.offsetWidth / 2), Math.round(c[1] - el.offsetHeight / 2)); };
    if (instant) still(el, go); else { el.classList.add("moving"); go(); }
  }
  function placeStickers() {
    const u = usable(), w = u.w;
    const spots = { cup: [w - 150, u.bottom - 60], plant: [w - 110, u.top + 150], laptop: [MID_X + 10, u.bottom - 50] };
    $$(".sticker", $("#desk")).forEach((el) => {
      const id = el.dataset.sticker, p = ui.stickers[id] || spots[id];
      setPos(el, clamp(p[0], 0, w - 50), clamp(p[1], u.top, u.bottom - 48));
      el.style.rotate = (rnd(id, "t") * 16 - 8).toFixed(0) + "deg";
    });
  }
  function relayout() {
    if (isPhone() || !$("#desk")) return;
    computeFit();
    paperIds().forEach((id) => {
      const el = paperEl(id), st = pst(id);
      if (!el || st.open || st.away) return;
      if (!ui.handled || st.x == null) { const p = landing(id, el); st.x = p[0]; st.y = p[1]; }
      if (!el.classList.contains("packed")) still(el, () => setPos(el, st.x, st.y));
    });
  }
  function onResize() {
    if (!$("#desk")) return;
    sizeScene();
    updateBar();
    if (isPhone()) return;
    relayout();
    paperIds().forEach((id) => { const el = paperEl(id); if (el && pst(id).open) placeOpen(el, false); });
    placeStickers();
    layoutDrawer(false);
    applyScene(true);
  }

  // ----- handling papers -----
  function raise(el) {
    if (topZ > 600) {
      // keep the pile's order but pull the numbers back down, so the lamp light and bar stay on top
      $$("#desk .paper, #desk .sticker, #drawer").sort((a, b) => (+a.style.zIndex || 0) - (+b.style.zIndex || 0)).forEach((e, k) => { e.style.zIndex = 10 + k; });
      topZ = 10 + $$("#desk .paper, #desk .sticker, #drawer").length;
    }
    el.style.zIndex = ++topZ;
    if (el.classList.contains("paper")) { ui.front = el.dataset.id; refreshSkills(); }
  }
  function markHandled() { if (!ui.handled) { ui.handled = true; ui.maxOut = Math.max(ui.maxOut, (ui.scene && ui.scene.out) || 0); } }
  const boxOf = (el) => ({ x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth * (el.classList.contains("open") ? 1 : ui.fit), h: el.offsetHeight * (el.classList.contains("open") ? 1 : ui.fit) });
  const hits = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  // Open files take the space right of the folder stack, as tall as the desk allows,
  // and the papers they would cover slide aside until the file is closed again.
  function placeOpen(el, nudge) {
    if (isPhone()) return;
    const u = usable(), st = pst(el.dataset.id), i = caseIndex(el.dataset.id);
    const w = Math.min(700, Math.max(380, Math.round((u.w - LANE - MID_X) * 0.78)));
    el.style.width = w + "px"; el.style.height = u.bottom - u.top + "px";
    st.x = MID_X; st.y = u.top;
    setPos(el, st.x, st.y);
    st.pages = paginate(i, el); st.page = Math.min(st.page, st.pages.length - 1);
    el.innerHTML = caseInner(i);
    if (!nudge) return;
    const file = { x: st.x, y: st.y, w: w, h: u.bottom - u.top };
    let k = 0;
    paperIds().forEach((id) => {
      const o = paperEl(id), ost = pst(id);
      if (!o || o === el || ost.open || ost.away || o.classList.contains("packed")) return;
      const b = boxOf(o);
      if (!hits(file, b)) return;
      if (!ost.nudged) ost.nudged = [ost.x, ost.y];
      ost.x = clamp(file.x + file.w + 14 + k * 26, 0, u.w - Math.round(b.w * 0.45)); ost.y = clamp(ost.y + k * 14, u.top, u.bottom - 40); k++;
      o.classList.add("moving", "nudge"); setPos(o, ost.x, ost.y);
    });
  }
  function unnudge() {
    if (paperIds().some((id) => pst(id).open)) return;
    paperIds().forEach((id) => {
      const o = paperEl(id), ost = pst(id);
      if (!o || !ost.nudged) return;
      ost.x = ost.nudged[0]; ost.y = ost.nudged[1]; ost.nudged = null;
      o.classList.add("moving", "nudge"); setPos(o, ost.x, ost.y);
    });
  }
  function openCase(id) {
    const el = paperEl(id), st = pst(id), i = caseIndex(id);
    if (!el || st.open) return;
    markHandled();
    st.open = true; st.page = 0; st.home = [st.x, st.y];
    el.classList.add("open"); el.setAttribute("aria-expanded", "true");
    el.innerHTML = caseInner(i);
    if (isPhone()) { st.pages = paginate(i, el); el.innerHTML = caseInner(i); }
    else placeOpen(el, true);
    raise(el); FX.play("rustle");
    el.focus({ preventScroll: true });
    say("case:" + i);
  }
  function closeCase(id) {
    const el = paperEl(id), st = pst(id);
    if (!el || !st.open) return;
    st.open = false; st.page = 0; st.pages = null;
    el.classList.remove("open"); el.setAttribute("aria-expanded", "false"); el.style.width = ""; el.style.height = "";
    el.innerHTML = folderInner(caseIndex(id));
    if (!isPhone() && st.home) { st.x = st.home[0]; st.y = st.home[1]; el.classList.add("moving"); setPos(el, st.x, st.y); }
    unnudge();
    FX.play("rustle");
    el.focus({ preventScroll: true });
  }
  function turn(part, swap) {
    if (reduced() || !part) { swap(); return; }
    part.classList.add("flip-out");
    setTimeout(() => { swap(); if (part.isConnected) part.classList.remove("flip-out"); }, 95);
  }
  function flipCase(id) {
    const el = paperEl(id), st = pst(id), i = caseIndex(id);
    turn($(".paper-body", el), () => { st.page = (st.page + 1) % (st.pages || [1]).length; el.innerHTML = caseInner(i); const c = $(".corner", el); if (c) c.focus({ preventScroll: true }); });
    FX.play("rustle");
  }
  function putAway(id, prev) {
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

  // ----- the skills drawer: a real drawer that slides up from the bottom edge -----
  function boxH() { const b = $("#drawer-box"); return b ? b.offsetHeight : 0; }
  function layoutDrawer(animate) {
    const d = $("#drawer");
    if (!d) return;
    if (!isPhone()) d.style.setProperty("--drawer-max", Math.max(160, usable().bottom - TOP + BOTTOM - 70) + "px");
    d.classList.toggle("sliding", !!animate);
    d.style.setProperty("--drawer-y", (1 - ui.drawer) * boxH() + "px");
    const open = ui.drawer > 0.5;
    $("#drawer-box").inert = !open;
    $("#drawer-box").hidden = isPhone() && !open;
    $("#handle").setAttribute("aria-expanded", String(open));
  }
  function setDrawer(v) {
    const was = ui.drawer > 0.5;
    ui.drawer = v; layoutDrawer(true);
    if (v > 0.5 && !was) { markHandled(); FX.play("drawer"); $("#drawer").style.zIndex = 650; say("drawer"); }
    else if (v <= 0.5 && was) { FX.play("drawer"); setTimeout(() => { if (ui.drawer <= 0.5) $("#drawer").style.zIndex = 6; }, 260); }
  }
  function refreshSkills() { const b = $("#drawer-box"); if (b) b.innerHTML = skillsHTML(); }

  // ----- the stamps -----
  // Stamps live in their slots on the bar. Drag one onto a paper and let go: it presses down, leaves ink exactly
  // under its face, then slides back to its slot. Let go anywhere else and it just slides back.
  const onScreen = (el) => { if (!el || (!el.offsetParent && getComputedStyle(el).position !== "fixed")) return false; const r = rectOf(el); return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth; };
  function stampables() { return $$(".stampable").filter((s) => onScreen(s) && $(".stamp-box", s)); }
  function stampableAt(x, y) { return stampables().find((s) => inside(rectOf(s), x, y)) || null; }
  function stampableShown() {
    if ($("#intro")) return ui.introStep >= 1 && !ui.introDone;
    if (ui.view !== "desk" || editing || !ui.printed) return false;
    const r = $("#receipt");
    if (!r) return false;
    const b = rectOf(r);
    return b.bottom > 120 && b.top < window.innerHeight - 120;
  }
  function updateBar() {
    const bar = $("#stampbar");
    if (!bar) return;
    const auto = stampableShown() || !!held;
    if (auto !== ui.barAuto) { ui.barAuto = auto; ui.barPinned = null; }
    const open = ui.barPinned == null ? auto : ui.barPinned;
    bar.classList.toggle("out", open);
    $(".bar-tab", bar).setAttribute("aria-expanded", String(open));
    $("#bar-rail").inert = !open;
  }
  function markHTML(m) {
    return '<span class="mark ink ' + (m.kind === "approved" ? "green" : "red") + '" style="left:' + m.x + "px;top:" + m.y + "px;--tilt:" + m.rot + "deg;opacity:" + m.op +
      ";--mx:" + m.mx + "px;--my:" + m.my + 'px">' + (m.kind === "approved" ? "APPROVED" : "DENIED") + "</span>";
  }
  function renderMarks(key) {
    $$('[data-marks="' + key + '"]').forEach((el) => {
      el.innerHTML = ui.marks[key].map(markHTML).join("");
      const box = $(".stamp-box", el.parentNode); if (box) box.classList.toggle("inked", ui.inked[key]);
    });
  }
  function inkAt(s, x, y, kind) {
    const key = s.dataset.stamp, r = rectOf(s), box = rectOf($(".stamp-box", s));
    ui.marks[key].push({ kind: kind, x: Math.round(x - r.left), y: Math.round(y - r.top), rot: (Math.random() * 6 - 3).toFixed(1), op: (0.78 + Math.random() * 0.17).toFixed(2),
      mx: Math.floor(Math.random() * 16) * 3, my: Math.floor(Math.random() * 16) * 3 });
    const fw = FACE.w, fh = FACE.h; // the inked area is the face, drawn at twice its drawing size
    if (x + fw > box.left && x - fw < box.right && y + fh > box.top && y - fh < box.bottom) ui.inked[key] = true;
    renderMarks(key); FX.play("thud");
    $("#stamp-status").textContent = (kind === "approved" ? "Approved" : "Denied") + " stamp pressed on the " + (key === "visa" ? "visa" : "entry record") + ".";
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
    const art = rectOf($(".stamp-art", h.btn)), done = () => { h.el.remove(); h.btn.classList.remove("empty"); updateBar(); };
    if (now || reduced()) { done(); return; }
    h.el.classList.remove("lifted", "p1", "p2"); h.el.classList.add("glide");
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
    h.el.classList.remove("glide"); h.el.classList.add("p1");
    setTimeout(() => { h.el.classList.replace("p1", "p2"); finish();
      setTimeout(() => { h.el.classList.remove("p2"); setTimeout(springBack, 70); }, 90); }, 60);
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
    // hold so the ink is seen, then hand the passport back
    setTimeout(() => {
      const pp = $("#passport");
      if (pp) pp.classList.add("gone");
      setTimeout(closeIntro, reduced() ? 0 : 460);
    }, 400 + (kind === "approved" ? 1200 : 2400));
  }

  // ----- the entry record printer and the tear-off slip -----
  function printNow() {
    ui.printed = true;
    const a = $("#printer-area"), r = $("#receipt");
    if (!a) return;
    a.classList.add("printed"); if (r) r.style.maxHeight = "";
    const b = $('[data-act="print"]'); if (b) b.remove();
    updateBar();
  }
  function printSlowly() {
    if (ui.printed) return;
    ui.printed = true;
    const r = $("#receipt"), full = r.scrollHeight, steps = 12;
    const b = $('[data-act="print"]'); if (b) b.remove();
    say("record");
    if (reduced()) { printNow(); return; }
    FX.play("print");
    for (let k = 1; k <= steps; k++) setTimeout(() => { r.style.maxHeight = Math.round(30 + (full - 30) * k / steps) + "px"; if (k === steps) printNow(); }, k * 95);
  }
  function watchPrinter() {
    const p = $("#printer");
    if (!p || ui.printed) return;
    if (!("IntersectionObserver" in window)) { printNow(); return; }
    const io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); printSlowly(); } }, { threshold: 0.3 });
    io.observe(p);
  }
  function setTear(v) { ui.torn = v; const r = $("#receipt"); if (r) r.style.setProperty("--tear", v); }
  function tearOff() {
    if (ui.slipTorn) return;
    const slip = $("#slip"), area = $("#printer-area"), sr = rectOf(slip), ar = rectOf(area);
    ui.slipTorn = true; FX.play("rustle");
    $("#receipt").classList.add("torn"); $("#perf").remove();
    area.appendChild(slip);
    slip.dataset.drag = "";
    if (!isPhone()) {
      slip.classList.add("loose");
      ui.slipPos = [Math.round(sr.left - ar.left + 12), Math.round(sr.top - ar.top + 18)];
      moveTo(slip, ui.slipPos[0], ui.slipPos[1]);
    }
    setTear(0);
    slip.focus({ preventScroll: true });
  }
  function tearAll() {
    if (reduced()) { tearOff(); return; }
    [0.35, 0.7, 1].forEach((v, i) => setTimeout(() => { setTear(v); if (v === 1) tearOff(); }, i * 60));
  }

  // ----- pill nav -----
  const AREAS = [["booth", "Booth"], ["desk", "Desk"], ["record", "Entry record"], ["contact", "Contact"]];
  function currentArea() {
    if (ui.view !== "desk" || !$("#scene")) return 0;
    const vh = window.innerHeight, rec = rectOf($("#record")), slip = $("#slip");
    if (slip && ui.printed && rectOf(slip).top < vh * 0.7) return 3;
    if (rec.top < vh * 0.55) return 2;
    if (isPhone()) return rectOf($("#desk")).top < vh * 0.5 ? 1 : 0;
    return -rectOf($("#scene")).top >= BOOT - 10 ? 1 : 0;
  }
  function goArea(i) {
    const id = AREAS[i][0], sc = $("#scene");
    if (id === "booth") window.scrollTo({ top: isPhone() ? 0 : docTop(sc), behavior: behavior() });
    else if (id === "desk") window.scrollTo({ top: isPhone() ? docTop($("#desk")) - 8 : docTop(sc) + unpackEnd(), behavior: behavior() });
    else if (id === "record") window.scrollTo({ top: docTop($("#record")), behavior: behavior() });
    else { printNow(); $("#slip").scrollIntoView({ behavior: behavior(), block: "center" }); }
  }
  function updatePill() { const n = $("#area-name"); if (n) n.textContent = AREAS[currentArea()][1]; }

  // ----- the radio's asides (only lines Thea has written are ever shown) -----
  let asideTimer = null;
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
  const WHEN = { arrive: "When the booth opens", unpacked: "When the file is unpacked", drawer: "When the skills drawer opens", record: "When the entry record prints",
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
      sec("honours", "Commendations", "Hackathon results from 2026.", state.awards.map((a, i) => '<div class="honour"><span class="yr">' + f("awards." + i + ".year", "Year") + "</span><div><b>" +
        f("awards." + i + ".result", "Result") + "</b>, " + f("awards." + i + ".event", "Event") + "<p>" + f("awards." + i + ".note", "What it was for") + "</p>" + del("awards", i, "entry") + "</div></div>").join("") + add("awards", "award", "entry")) +
      sec("skills", "Skills", "What I have used in the case files above.", '<dl class="skills">' + state.skills.map((s, i) => "<dt>" + f("skills." + i + ".group", "Group") + "</dt><dd>" +
        f("skills." + i + ".items", "Skills, separated by commas", blk()) + del("skills", i, "group") + "</dd>").join("") + "</dl>" + add("skills", "skill", "group")) +
      sec("diploma", "Diploma", "", f("education.degree", "Degree", blk(), "h3") + f("education.school", "School", blk(), "p") + "<p>" + f("education.major", "Major") +
        '</p><p class="meta">Graduated ' + f("education.graduated", "When") + " · Coursework: " + f("education.coursework", "Coursework") + "</p>") +
      sec("contact", "Contact", "Email is the fastest way to reach me.", '<div class="row">' + f("profile.email", "Email address", "email") +
        (editing ? "" : '<button class="btn-quiet" data-act="copy">Copy address</button>') + '</div><div class="' + (editing ? "" : "row ") + 'links">' + links + "</div>" + add("profile.links", "link", "link")) +
      '<footer class="foot">' + esc(p.name) + " · " + esc(p.basedIn) + "</footer></div>";
    $$(".f", app).forEach((el) => {
      try { el.contentEditable = "plaintext-only"; } catch (err) { el.contentEditable = "true"; }
      if (el.contentEditable !== "plaintext-only") el.contentEditable = "true";
    });
  }

  function renderDesk() {
    app.innerHTML = '<main class="site"><section class="scene" id="scene"><div class="stage" id="stage">' + boothHTML() + deskHTML() + "</div></section>" + recordHTML() + "</main>";
    board = FX.board($("#board"), state.profile.board, 20);
    sizeScene();
    computeFit();
    placeStickers();
    renderPutAway();
    renderMarks("record");
    if (ui.slipTorn && ui.slipPos && !isPhone()) setPos($("#slip"), ui.slipPos[0], ui.slipPos[1]);
    if (ui.printed) printNow();
    layoutDrawer(false);
    applyScene(true);
    paperIds().forEach((id) => { const el = paperEl(id); if (el && pst(id).open) placeOpen(el, false); });
    watchPrinter();
    updatePill(); updateBar();
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
  function visaInner() {
    const p = state.profile;
    const corner = '<button class="corner" data-act="flip-pass" aria-label="Turn to page ' + (ui.passPage ? 1 : 2) + '">' + SPR.draw("corner", PX) + "</button>";
    if (ui.passPage === 0) {
      return '<div class="visa-page visa stampable" data-stamp="visa"><h2>Entry visa</h2><dl class="visa-lines"><dt>Holder</dt><dd>' + esc(p.name) +
        "</dd><dt>Purpose</dt><dd>" + esc(p.seeking) + "</dd><dt>Issued</dt><dd>" + today + '</dd></dl><div class="stamp-box' + (ui.inked.visa ? " inked" : "") + '">Stamp box</div><div class="marks" data-marks="visa"></div></div>' + corner;
    }
    return '<div class="visa-page"><h2>Commendations</h2><div class="pp-stamps">' + state.awards.filter((a) => a.result).map((a, i) =>
      '<span class="ink green" style="--tilt:' + [-4, 3, -2, 5][i % 4] + 'deg">' + esc(a.result) + "<small>" + esc(a.event + " " + a.year) + "</small></span>").join("") + "</div></div>" + corner;
  }
  function flipPass() {
    const page = $("#pp-visa");
    turn(page, () => { ui.passPage = ui.passPage ? 0 : 1; page.innerHTML = visaInner(); renderMarks("visa"); const c = $(".corner", page); if (c) c.focus({ preventScroll: true }); });
    FX.play("rustle");
  }
  function renderIntro() {
    const p = state.profile, e = state.education;
    const parts = p.name.trim().split(/\s+/), surname = parts.length > 1 ? parts.pop() : "", given = parts.join(" ");
    ui.introStep = 0; ui.introDone = false; ui.passPage = 0;
    introRoot.innerHTML =
      '<div class="intro" id="intro" role="dialog" aria-label="Passport"><div class="intro-inner"><p class="intro-say" id="say" aria-live="polite">Next applicant. Open the passport to begin.</p>' +
      '<div class="passport" id="passport" data-stamp-root tabindex="0" aria-label="Passport. Press A to stamp the visa approved or D to stamp it denied.">' +
      '<div class="pp-page" id="pp-visa">' + visaInner() + "</div>" +
      '<div class="pp-cover"><div class="pp-front" data-act="intro-next">' + SPR.draw("emblem", PX) + "<b>Passport</b><span>" + esc(p.name) + "</span></div>" +
      '<div class="pp-back"><div class="pp-head"><span>Passport</span><span>' + mrz("P " + p.nationality.slice(0, 3), 5) + "</span></div>" +
      '<div class="pp-body"><div class="pp-photo">' + SPR.applicant("thea", PX, portraitAlt) + '</div><dl class="fields">' +
      field("Surname", surname) + field("Given name", given) + field("Nationality", p.nationality) + field("Occupation", p.occupation) + field("Based in", p.basedIn) + field("Graduated", e.graduated) + "</dl></div>" +
      '<div class="pp-mrz" aria-hidden="true">' + mrz("P " + p.nationality.slice(0, 3) + " " + surname + "  " + given, 40) + "<br>" + mrz("BCS " + e.graduated + " UOW SIM", 40) + "</div></div></div></div>" +
      '<div class="intro-actions"><button class="btn-main" id="intro-btn" data-act="intro-next">Open passport</button><button class="btn-quiet" data-act="intro-skip">Skip to the booth</button></div></div></div>';
    renderMarks("visa");
    document.documentElement.classList.add("locked");
    $("#intro-btn").focus({ preventScroll: true });
    updateBar();
  }
  function introNext() {
    if (ui.introStep !== 0) return;
    $("#passport").classList.add("open");
    ui.introStep = 1;
    $("#say").textContent = "";
    $("#intro-btn").hidden = true;
    FX.play("rustle");
    setTimeout(() => { updateBar(); const b = slotBtn("approved"); if (b) b.focus({ preventScroll: true }); }, reduced() ? 0 : 500);
  }
  function closeIntro() {
    const el = $("#intro");
    if (!el || el.classList.contains("leaving")) return;
    if (held) springBack(true);
    el.classList.add("leaving");
    document.documentElement.classList.remove("locked");
    ui.introDone = true;
    setTimeout(() => { introRoot.innerHTML = ""; updateBar(); const h = $("#hello"); if (h) h.focus({ preventScroll: true }); }, reduced() ? 0 : 420);
  }

  // ----- actions -----
  function touched() { dirty = true; note = ""; }
  const ACTIONS = {
    "intro-next": introNext,
    "intro-skip": closeIntro,
    passport: renderIntro,
    "flip-pass": flipPass,
    bar() { const open = $("#stampbar").classList.contains("out"); ui.barPinned = !open; updateBar(); },
    print() { printSlowly(); },
    view(b) { ui.view = b.dataset.v; render(); window.scrollTo(0, 0); const h = $("#hello"); if (h) h.focus({ preventScroll: true }); },
    area(b) { goArea(AREAS.findIndex((a) => a[0] === b.dataset.to)); },
    step(b) { goArea(clamp(currentArea() + +b.dataset.dir, 0, AREAS.length - 1)); },
    "open-booth"() { ui.boothForced = true; applyScene(); $("#hello").focus({ preventScroll: true }); },
    "open-file"() {
      ui.forced = true; ui.boothForced = true; applyScene();
      if (!isPhone()) window.scrollTo({ top: docTop($("#scene")) + unpackEnd(), behavior: "auto" });
      const first = paperEl("id"); if (first) first.focus({ preventScroll: true });
    },
    sound(b) { const on = FX.toggle(); b.textContent = on ? "Sound on" : "Sound off"; b.setAttribute("aria-pressed", String(on)); if (on) FX.play("tick"); },
    radio(b) { ui.radioOn = !ui.radioOn; b.textContent = ui.radioOn ? "Mute radio" : "Unmute radio"; b.setAttribute("aria-pressed", String(ui.radioOn)); if (!ui.radioOn) $("#aside").hidden = true; },
    ask(b) { ui.asked = +b.dataset.q; const el = $("#bubble"); el.hidden = false; el.textContent = state.interview[ui.asked].a; },
    "close-case"(b) { closeCase(b.dataset.id); },
    flip(b) { flipCase(b.dataset.id); },
    return(b) { returnPaper(b.dataset.id); },
    drawer() { if (drawerDrag && drawerDrag.moved) return; setDrawer(ui.drawer > 0.5 ? 0 : 1); },
    skill(b) {
      ui.hot = ui.hot === b.dataset.s ? null : b.dataset.s;
      refreshSkills();
      caseIds().forEach((id, i) => {
        const el = paperEl(id); if (!el) return;
        el.classList.toggle("hot", !!ui.hot && uses(state.projects[i].stack, ui.hot));
        const s = $(".stack-items", el); if (s) s.innerHTML = stackHTML(state.projects[i]);
      });
      const again = $('.sk[data-s="' + CSS.escape(b.dataset.s) + '"]'); if (again) again.focus({ preventScroll: true });
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
    if (ev.target.closest(".stamp-btn")) return; // stamps are handled by pointer and keyboard
    const b = ev.target.closest("[data-act]");
    if (b && !b.disabled) { ACTIONS[b.dataset.act](b); return; }
    const folder = ev.target.closest(".paper.p-case:not(.open)");
    if (folder && !justDragged) openCase(folder.dataset.id);
  }, true);

  // pointer handling: stamps first, then the drawer handle, the perforation, and desk papers
  let drag = null, justDragged = false, swallowClick = false, drawerDrag = null, perfDrag = null, perfMoved = false;
  const NO_DRAG = "button, a, input, textarea, select, label, .demo-box, .f";
  document.addEventListener("pointerdown", (ev) => {
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
    if (ev.target.closest("#handle") && !isPhone()) { drawerDrag = { sy: ev.clientY, start: ui.drawer, h: boxH(), moved: false }; return; }
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
    if (drawerDrag) {
      const dy = drawerDrag.sy - ev.clientY;
      if (Math.abs(dy) > 5) drawerDrag.moved = true;
      if (drawerDrag.moved && drawerDrag.h) { ui.drawer = clamp(drawerDrag.start + dy / drawerDrag.h, 0, 1); layoutDrawer(false); }
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
      drag.el.classList.remove("moving", "nudge"); drag.el.classList.add("held");
      try { drag.el.setPointerCapture(ev.pointerId); } catch (err) { /* capture is optional */ }
      FX.play("rustle");
      if (drag.el.classList.contains("paper")) markHandled();
    }
    moveTo(drag.el, drag.ox + dx, drag.oy + dy);
    const ct = $("#counter");
    if (ct && drag.el.classList.contains("paper")) { const r = rectOf(ct); ct.classList.toggle("ready", ev.clientY < r.bottom && ev.clientY > r.top - 40); }
  });
  function endDrag(ev) {
    if (pending && (!ev || ev.pointerId === pending.id)) {
      // a tap on a stamp lifts it; the next tap on a paper stamps it there
      const p = pending; pending = null;
      if (ev && ev.type === "pointerup") pickUp(p.kind, "armed");
      return;
    }
    if (held && held.mode === "drag" && !held.busy) { if (held.over) stampDown(); else springBack(); return; }
    if (drawerDrag) {
      if (drawerDrag.moved) { setDrawer(ui.drawer > 0.4 ? 1 : 0); setTimeout(() => { drawerDrag = null; }, 0); } else drawerDrag = null;
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
    const ct = $("#counter");
    if (d.el.classList.contains("paper")) {
      pst(d.el.dataset.id).tilt = tilt;
      if (ct && ct.classList.contains("ready")) { ct.classList.remove("ready"); putAway(d.el.dataset.id, { x: d.ox, y: Math.max(d.oy, TOP) }); return; }
    }
    if (ct) ct.classList.remove("ready");
    FX.play("rustle");
  }
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);
  document.addEventListener("dragstart", (ev) => { if (ev.target.closest && ev.target.closest("[data-drag], .stamp-btn, [data-stamp-root]")) ev.preventDefault(); });

  document.addEventListener("keydown", (ev) => {
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
    if (ev.key === "Escape") {
      if (held) { springBack(); return; }
      if ($("#intro")) { closeIntro(); return; }
      if (ui.drawer > 0.5) { setDrawer(0); $("#handle").focus(); return; }
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
    if ((ev.key === "Enter" || ev.key === " ") && el.matches(".p-case:not(.open)")) { ev.preventDefault(); openCase(el.dataset.id); return; }
    const step = { ArrowLeft: [-24, 0], ArrowRight: [24, 0], ArrowUp: [0, -24], ArrowDown: [0, 24] }[ev.key];
    if (step) { ev.preventDefault(); markHandled(); raise(el); moveTo(el, el.offsetLeft + step[0], el.offsetTop + step[1]); }
  });
  app.addEventListener("input", (ev) => {
    const el = ev.target.closest("[data-k]");
    if (!el) return;
    const keys = el.dataset.k.split("."), last = keys.pop();
    const text = el.textContent.replace(/\s+/g, " ").trim();
    at(keys.join("."))[last] = el.hasAttribute("data-list") ? text.split(",").map((s) => s.trim()).filter(Boolean) : text;
    touched(); setOwner();
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
      lt + sc + " type=\"application/json\" id=\"cv-data\">" + json + lt + "/" + sc + ">\n" + block("sprites") + block("fx") + block("demos") + block("main") + "</body></html>";
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
