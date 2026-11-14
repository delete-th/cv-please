(function () {
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const app = $("#app"), introRoot = $("#intro-root"), fixedRoot = $("#fixed-root");
  const SPR = window.SPR, DEMOS = window.DEMOS, FX = window.FX, PX = 3;
  const ORIGINAL = $("#cv-data").textContent;
  let state = JSON.parse(ORIGINAL);

  let editing = false, dirty = false, canEdit = false, busy = false, note = "", artifact = null;
  const ui = {
    view: "desk", admitted: null, holding: null, introStep: 0, introDone: false, passPage: 0,
    marks: { visa: [], record: [] }, papers: {}, stickers: {}, scene: null, maxOut: 0,
    forced: false, boothForced: false, handled: false, drawer: 0, drawerShown: false,
    hot: null, front: null, printed: false, torn: 0, slipTorn: false, slipPos: null,
    radioOn: true, said: new Set(), asked: null,
  };
  let topZ = 40, board = null, lastPointer = "mouse", lastXY = null;

  const narrow = window.matchMedia("(max-width: 820px)");
  const isPhone = () => narrow.matches;
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const behavior = () => (reduced() ? "auto" : "smooth");
  const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
  const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  const clock = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const safeUrl = (u) => (/^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "");
  const at = (path) => path.split(".").reduce((o, k) => o[k], state);
  const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const rnd = (id, salt) => SPR.seeded(hash(id + ":" + salt))();
  const shortName = (p) => p.name.split(":")[0].trim();

  // ----- skills and stacks -----
  const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const skillParts = (sk) => sk.replace(/\(.*?\)/g, "").split("/").map((s) => s.trim().toLowerCase()).filter(Boolean);
  const uses = (text, sk) => skillParts(sk).some((p) => new RegExp("(^|[^a-z0-9+#])" + reEsc(p) + "($|[^a-z0-9+#])").test(String(text).toLowerCase()));
  const stackHTML = (x) => x.stack.split(/,\s*/).map((item) => (ui.hot && uses(item, ui.hot) ? "<mark>" + esc(item) + "</mark>" : esc(item))).join(", ");

  // ----- the papers on the desk -----
  const caseIds = () => state.projects.map((p, i) => "case-" + i);
  const ORDER = () => ["id", "diploma", "honours"].concat(caseIds(), ["drawer"]);
  const paperIds = () => ["id", "diploma"].concat(caseIds(), ["honours"]);
  const caseIndex = (id) => (/^case-\d+$/.test(id) ? +id.slice(5) : -1);
  const paperLabel = (id) => (id === "id" ? "ID card" : id === "diploma" ? "Diploma" : id === "honours" ? "Commendations" : shortName(state.projects[caseIndex(id)]));
  const pages = (p) => (DEMOS[p.demo] ? 2 : 1);
  const pst = (id) => ui.papers[id] || (ui.papers[id] = { x: null, y: null, tilt: +(rnd(id, "tilt") * 6 - 3).toFixed(1), open: false, page: 0, away: false, prev: null });
  const paperEl = (id) => $('#desk .paper[data-id="' + id + '"]');

  function idInner() {
    const p = state.profile;
    return '<div class="paper-pad"><p class="paper-title">Identity card</p><div class="id-body"><div class="id-photo">' +
      SPR.draw("portrait", 2, "Pixel portrait of the card holder, with shoulder-length dark hair and a green top") +
      '</div><dl class="id-fields"><div><dt>Name</dt><dd>' + esc(p.name) + "</dd></div><div><dt>Nationality</dt><dd>" + esc(p.nationality) +
      "</dd></div><div><dt>Based in</dt><dd>" + esc(p.basedIn) + "</dd></div><div><dt>Occupation</dt><dd>" + esc(p.occupation) + "</dd></div></dl></div></div>";
  }
  function diplomaInner() {
    const e = state.education;
    return '<div class="paper-pad"><span class="ink green seal">With distinction</span><p class="paper-title">Diploma</p><h3>' + esc(e.degree) + "</h3><p>" + esc(e.school) +
      "</p><p>" + esc(e.major) + '</p><p class="meta">Graduated ' + esc(e.graduated) + "<br>Coursework: " + esc(e.coursework) + "</p></div>";
  }
  function honoursInner() {
    return '<div class="paper-pad"><p class="paper-title">Commendations</p>' + state.awards.filter((a) => a.result).map((a) =>
      '<div class="honour"><span class="yr">' + esc(a.year) + "</span><div><b>" + esc(a.result) + "</b>, " + esc(a.event) + "<p>" + esc(a.note) + "</p></div></div>").join("") + "</div>";
  }
  function folderInner(i) {
    const p = state.projects[i];
    return '<span class="folder-tab">' + esc(shortName(p)) + "</span>" + (i % 2 ? '<span class="tape" aria-hidden="true"></span>' : '<span class="clip">' + SPR.draw("clip", PX) + "</span>") +
      '<div class="folder-face">' + SPR.draw(p.icon || "paper", PX) + "<div><b>" + esc(shortName(p)) + '</b><span class="meta">' + esc(p.dates) + "</span></div></div>" +
      (p.award ? '<span class="ink red mini-stamp">' + esc(p.award) + "</span>" : "") + '<span class="peek" aria-hidden="true">Open file</span>';
  }
  function caseInner(i) {
    const p = state.projects[i], st = pst("case-" + i), n = pages(p), page = Math.min(st.page, n - 1);
    const meta = [p.role, p.dates, p.event].filter(Boolean).map(esc).join(" · ");
    const stack = '<p class="stack">Built with: <span class="stack-items">' + stackHTML(p) + "</span></p>";
    const body = page === 0
      ? '<div class="case-top">' + SPR.draw(p.icon || "paper", PX) + "<div><h3>" + esc(p.name) + '</h3><p class="meta">' + meta + "</p></div>" +
        (p.award ? '<span class="ink red">' + esc(p.award) + "</span>" : "") + '</div><p class="line">' + esc(p.line) + '</p><ul class="points">' +
        p.points.filter(Boolean).map((t) => "<li>" + esc(t) + "</li>").join("") + "</ul>" + (n === 1 ? stack : "")
      : stack + '<div class="demo-zone"><button class="btn-main" data-act="demo" data-i="' + i + '">Run demo</button><div class="demo-box" hidden></div></div>';
    return '<header class="paper-head"><h2>' + esc(shortName(p)) + "</h2>" + (n > 1 ? '<span class="pg">Page ' + (page + 1) + " of " + n + "</span>" : "") +
      '<button class="close" data-act="close-case" data-id="case-' + i + '">Close file</button></header><div class="paper-body">' + body + "</div>" +
      (n > 1 ? '<button class="corner" data-act="flip" data-id="case-' + i + '" aria-label="Turn to page ' + (page === 0 ? 2 : 1) + '">' + SPR.draw("corner", PX) + "</button>" : "");
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
      (i >= 0 ? ' aria-expanded="' + st.open + '"' : "") + ' style="--tilt:' + st.tilt + 'deg">' + paperInner(id) + "</article>";
  }
  function skillsHTML() {
    const p = frontCase();
    return '<div class="skills-card"><p class="note">Pick a skill to see which case files used it.</p>' + state.skills.map((g) => '<div class="sk-group"><h3>' + esc(g.group) + "</h3>" +
      g.items.map((s) => '<button class="sk' + (ui.hot === s ? " hot" : "") + (p && uses(p.stack, s) ? " used" : "") + '" data-act="skill" data-s="' + esc(s) + '" aria-pressed="' + (ui.hot === s) + '">' + esc(s) + "</button>").join("") + "</div>").join("") + "</div>";
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
    return '<header class="booth" id="booth"><div class="window-wrap"><div class="window">' + SPR.scene(PX) +
      '<div class="board" id="board" aria-hidden="true"></div><p class="sr-only">Departure board: ' + esc(p.board.join(", ")) + "</p></div>" +
      '<div class="shutter" id="shutter"><span>Booth closed. Scroll to open.</span><button class="btn-quiet" data-act="open-booth">Open the shutter</button></div></div>' +
      '<div class="hello"><h1 id="hello" tabindex="-1">' + esc(p.greeting) + '</h1><p class="tagline">' + esc(p.tagline) + "</p>" +
      '<p class="denied-note" id="denied-note"' + (ui.admitted === "denied" ? "" : " hidden") + ">" + esc(deniedLine()) + "</p>" +
      (qs.length ? '<div class="ask">' + qs.map((x) => '<button class="btn-quiet" data-act="ask" data-q="' + x[1] + '">' + esc(x[0].q) + "</button>").join("") + "</div>" +
        '<p class="bubble" id="bubble" aria-live="polite"' + (ui.asked == null ? " hidden" : "") + ">" + (ui.asked == null ? "" : esc(state.interview[ui.asked].a)) + "</p>" : "") +
      '<div class="booth-links"><button class="btn-quiet" data-act="area" data-to="record">60-second version</button><button class="btn-quiet" data-act="view" data-v="list">List view</button>' +
      '<button class="btn-quiet" data-act="passport">View passport</button><span class="owner" id="owner">' + ownerBar() + "</span></div></div>" +
      '<div class="booth-side"><p class="clock"><time id="clock">' + clock() + "</time></p>" +
      '<button class="btn-quiet" data-act="sound" aria-pressed="' + FX.soundOn + '">' + (FX.soundOn ? "Sound on" : "Sound off") + "</button>" +
      (hasRadio() ? '<div class="radio">' + SPR.draw("radio", PX) + '<button class="btn-quiet" data-act="radio" aria-pressed="' + ui.radioOn + '">' + (ui.radioOn ? "Mute radio" : "Unmute radio") + "</button></div>" : "") +
      '</div><p class="aside" id="aside" aria-live="polite" hidden></p></header>';
  }

  function deskHTML() {
    const sticker = (id, name) => '<span class="sticker" data-sticker="' + id + '" data-drag aria-hidden="true">' + SPR.draw(name, PX) + "</span>";
    return '<section class="desk" id="desk" aria-label="Desk">' +
      '<p class="phone-hint">Swipe through the papers. Tap a folder to open it.</p>' +
      '<div class="counter" id="counter"><span class="counter-label">Counter</span><div class="put-away" id="putaway"></div></div>' +
      '<div class="lamp" aria-hidden="true"><span class="off">' + SPR.lamp(false, PX) + '</span><span class="on">' + SPR.lamp(true, PX) + "</span></div>" +
      '<span class="pool" aria-hidden="true">' + SPR.pool(PX) + '</span><span class="ring" aria-hidden="true">' + SPR.ring(PX) + "</span>" +
      sticker("cup", "cup") + sticker("plant", "plant") + sticker("laptop", "laptop") + sticker("shield", "shield") +
      '<div class="envelope" id="envelope" aria-hidden="true">' + SPR.draw("envelope", PX) + '<span class="ink red env-stamp">Applicant file</span></div>' +
      '<div class="unpack-hint" id="unpack-hint"><p id="unpack-say">Scroll down and the applicant file unpacks itself.</p><button class="btn-main" data-act="open-file">Open the file</button></div>' +
      paperIds().map(paperHTML).join("") +
      '<div class="drawer" id="drawer"><div class="drawer-box" id="drawer-box">' + skillsHTML() + '</div><div class="drawer-front">' +
      '<button class="handle" id="handle" data-act="drawer" aria-expanded="false" aria-controls="drawer-box">' + SPR.draw("handle", PX) + "<span>Skills drawer</span></button></div></div></section>";
  }

  // ----- entry record -----
  function recordHTML() {
    const p = state.profile, e = state.education, feat = state.projects.filter((x) => x.featured);
    const marks = '<div class="marks" data-marks="record"></div>';
    const slip = '<div class="slip' + (ui.slipTorn && !isPhone() ? " loose" : "") + '" id="slip" tabindex="-1"' + (ui.slipTorn ? " data-drag" : "") + '><p class="s-title">Contact slip</p>' +
      '<span class="email">' + esc(p.email) + '</span><div class="row"><button class="btn-quiet" data-act="copy">Copy address</button>' +
      p.links.map((l) => (safeUrl(l.url) ? '<a href="' + esc(safeUrl(l.url)) + '" target="_blank" rel="noopener">' + esc(l.label) + "</a>" : "")).join("") + "</div></div>";
    return '<section class="record-sec" id="record" aria-labelledby="record-h"><div class="record-wrap"><div class="record-intro"><h2 id="record-h">Entry record</h2>' +
      "<p>The 60-second version, printed at the booth. Everything else is on the desk above.</p></div>" +
      '<div class="printer-area' + (ui.printed ? " printed" : "") + '" id="printer-area"><div class="printer" aria-hidden="true"><span class="led"></span></div>' +
      '<div class="receipt' + (ui.slipTorn ? " torn" : "") + '" id="receipt"><div class="rec stampable" data-stamp="record"><p class="r-title">Entry record</p><p class="meta">Desk 04 · ' + today + "</p>" +
      "<dl><dt>Name</dt><dd>" + esc(p.name) + "</dd><dt>Seeking</dt><dd>" + esc(p.seeking) + "</dd><dt>Based in</dt><dd>" + esc(p.basedIn) + "</dd><dt>Education</dt><dd>" +
      esc(e.degree) + ", " + esc(e.graduated) + '</dd></dl><p class="r-h">Strengths</p><ul>' + state.strengths.filter(Boolean).map((s) => "<li>" + esc(s) + "</li>").join("") +
      '</ul><p class="r-h">Top projects</p><ul>' + feat.map((x) => "<li>" + esc(shortName(x)) + ", " + esc(x.award || x.role) + "</li>").join("") +
      '</ul><button class="target" data-target="record">Inspector\'s stamp</button>' + marks + "</div>" +
      (ui.slipTorn ? "" : '<button class="perf" id="perf" data-act="tear" aria-label="Tear off the contact slip"><span class="lab">Tear here</span></button>' + slip) + "</div>" +
      (ui.slipTorn ? slip : "") + "</div></div>" +
      '<footer class="foot">' + esc(p.name) + " · " + esc(p.basedIn) + "</footer></section>";
  }

  // ----- fixed controls: stamp rack, cursor stamp, pill nav -----
  function renderFixed() {
    fixedRoot.innerHTML = '<div class="rack" id="rack" role="group" aria-label="Stamps. Press S to pick one up.">' +
      ["approved", "denied"].map((k) => '<button class="rack-stamp" data-act="pick" data-kind="' + k + '" aria-pressed="' + (ui.holding === k) + '">' +
        SPR.tool(k, 2) + "<span>" + (k === "approved" ? "Approve" : "Deny") + "</span></button>").join("") + "</div>" +
      '<div class="ghost" id="ghost" hidden></div><span class="preview ink" id="preview" hidden></span>' +
      '<nav class="pill" id="pill" aria-label="Areas"><button data-act="step" data-dir="-1" aria-label="Previous area">' + SPR.draw("left", PX) +
      '</button><span class="area" id="area-name" aria-live="polite">Booth</span><button data-act="step" data-dir="1" aria-label="Next area">' + SPR.draw("right", PX) + "</button></nav>";
  }

  // ----- scroll scene: the booth builds, then the file unpacks -----
  const B_SHUT = 160, B_COUNTER = 120, B_LAMP = 70, B_BOARD = 70, BOOT = B_SHUT + B_COUNTER + B_LAMP + B_BOARD, UNIT = 110, DWELL = 320;
  const stageH = () => Math.max(window.innerHeight, 640);
  const unpackEnd = () => BOOT + ORDER().length * UNIT;
  const docTop = (el) => el.getBoundingClientRect().top + window.scrollY;
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
    const px = Math.max(0, -$("#scene").getBoundingClientRect().top), bf = ui.boothForced || ui.forced;
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
    const s = sceneNow(), prev = force ? {} : ui.scene || {};
    const sh = $("#shutter"), ct = $("#counter"), desk = $("#desk");
    if (s.shut !== prev.shut) { sh.style.transform = "translateY(" + -s.shut * 25 + "%)"; sh.classList.toggle("up", s.shut === 4); if (!force) FX.play("tick"); }
    if (s.counter !== prev.counter) ct.style.transform = "translateX(" + -(3 - s.counter) * 34 + "%)";
    if (s.lamp !== prev.lamp) { desk.classList.toggle("lamp-on", s.lamp); if (!force && s.lamp) FX.play("tick"); }
    if (s.board !== prev.board) { if (s.board) board.start(); else board.blank(); }
    ORDER().forEach((id, i) => {
      const want = i < s.out, had = prev.out != null && i < prev.out;
      if (!force && want === had) return;
      if (id === "drawer") showDrawer(want, force);
      else if (want) unpack(id, force, i);
      else pack(id, force);
    });
    const hint = $("#unpack-hint"), n = ORDER().length;
    hint.hidden = s.out >= n;
    $("#unpack-say").hidden = s.out > 0;
    if (s.shut === 4 && s.board && prev.board !== true) say("arrive");
    if (s.out >= n && prev.out < n) say("unpacked");
    ui.maxOut = Math.max(ui.maxOut, s.out);
    ui.scene = s;
  }

  function envCenter() { const e = $("#envelope"); return [e.offsetLeft + e.offsetWidth / 2, e.offsetTop + e.offsetHeight / 2]; }
  function fanPos(id, el) {
    const desk = $("#desk"), w = desk.clientWidth, h = desk.clientHeight, i = caseIndex(id);
    const f = i >= 0 ? [0.19 + i * 0.072, 0.55 + (i % 2) * 0.08] : { id: [0.19, 0.1], diploma: [0.43, 0.07], honours: [0.71, 0.11] }[id];
    const x = Math.round(f[0] * w + rnd(id, "jx") * 20 - 10), y = Math.round(f[1] * h + rnd(id, "jy") * 16 - 8);
    return [clamp(x, 8, Math.max(8, w - el.offsetWidth - 8)), clamp(y, 56, Math.max(56, h - el.offsetHeight - 48))];
  }
  function setPos(el, x, y) { el.style.left = x + "px"; el.style.top = y + "px"; }
  function still(el, fn) { el.classList.remove("moving"); el.style.transition = "none"; fn(); void el.offsetWidth; el.style.transition = ""; }
  function unpack(id, instant, order) {
    const el = paperEl(id), st = pst(id);
    if (!el || st.away) return;
    if (st.x == null) { const p = fanPos(id, el); st.x = p[0]; st.y = p[1]; }
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
    const desk = $("#desk"), w = desk.clientWidth, h = desk.clientHeight;
    const spots = { cup: [0.84, 0.72], plant: [0.93, 0.5], laptop: [0.06, 0.84], shield: [0.16, 0.24] };
    $$(".sticker", desk).forEach((el) => {
      const id = el.dataset.sticker, p = ui.stickers[id] || [Math.round(spots[id][0] * w), Math.round(spots[id][1] * h)];
      setPos(el, clamp(p[0], 0, w - 50), clamp(p[1], 50, h - 50));
      el.style.rotate = (rnd(id, "t") * 16 - 8).toFixed(0) + "deg";
    });
  }
  function onResize() {
    if (!$("#desk")) return;
    sizeScene();
    if (isPhone()) return;
    const desk = $("#desk");
    paperIds().forEach((id) => {
      const el = paperEl(id), st = pst(id);
      if (!el || st.x == null) return;
      st.x = clamp(st.x, 8 - el.offsetWidth + 80, desk.clientWidth - 80);
      st.y = clamp(st.y, 0, desk.clientHeight - 60);
      if (!el.classList.contains("packed")) still(el, () => setPos(el, st.x, st.y));
      if (st.open) fitOpen(el);
    });
    placeStickers();
    layoutDrawer(false);
    applyScene(true);
  }

  // ----- handling papers -----
  function raise(el) {
    el.style.zIndex = ++topZ;
    if (el.classList.contains("paper")) { ui.front = el.dataset.id; refreshSkills(); }
  }
  function markHandled() { if (!ui.handled) { ui.handled = true; ui.maxOut = Math.max(ui.maxOut, (ui.scene && ui.scene.out) || 0); } }
  function fitOpen(el) {
    if (isPhone()) return;
    const desk = $("#desk"), st = pst(el.dataset.id), dh = desk.clientHeight;
    el.style.maxHeight = "";
    const h = Math.min(el.offsetHeight, dh - 66);
    st.x = clamp(st.x, 8, Math.max(8, desk.clientWidth - el.offsetWidth - 8));
    st.y = clamp(st.y, 56, Math.max(56, dh - h - 10));
    setPos(el, st.x, st.y);
    el.style.maxHeight = dh - st.y - 10 + "px";
  }
  function openCase(id) {
    const el = paperEl(id), st = pst(id), i = caseIndex(id);
    if (!el || st.open) return;
    markHandled();
    st.open = true; st.page = 0;
    el.classList.add("open"); el.setAttribute("aria-expanded", "true");
    el.innerHTML = caseInner(i);
    fitOpen(el); raise(el); FX.play("rustle");
    el.focus({ preventScroll: true });
    say("case:" + i);
  }
  function closeCase(id) {
    const el = paperEl(id), st = pst(id);
    if (!el || !st.open) return;
    st.open = false; st.page = 0;
    el.classList.remove("open"); el.setAttribute("aria-expanded", "false"); el.style.maxHeight = "";
    el.innerHTML = folderInner(caseIndex(id));
    if (!isPhone()) { const desk = $("#desk"); st.x = clamp(st.x, 8, desk.clientWidth - el.offsetWidth - 8); setPos(el, st.x, st.y); }
    FX.play("rustle");
    el.focus({ preventScroll: true });
  }
  function flipCase(id) {
    const el = paperEl(id), st = pst(id), i = caseIndex(id);
    const swap = () => { st.page = st.page ? 0 : 1; el.innerHTML = caseInner(i); fitOpen(el); const c = $(".corner", el); if (c) c.focus({ preventScroll: true }); };
    turn($(".paper-body", el), swap);
    FX.play("rustle");
  }
  function turn(part, swap) {
    if (reduced() || !part) { swap(); return; }
    part.classList.add("flip-out");
    setTimeout(() => { swap(); const fresh = part.isConnected ? part : null; if (fresh) fresh.classList.remove("flip-out"); }, 95);
  }
  function putAway(id, prev) {
    const el = paperEl(id), st = pst(id);
    if (st.open) closeCase(id);
    st.away = true; st.prev = prev;
    el.classList.add("leaving"); FX.play("rustle");
    setTimeout(() => { el.classList.remove("leaving"); el.classList.add("away"); renderPutAway(); }, reduced() ? 0 : 210);
  }
  function returnPaper(id) {
    const el = paperEl(id), st = pst(id), prev = st.prev || { x: 80, y: 80 };
    st.away = false; st.x = prev.x; st.y = prev.y;
    el.classList.remove("away", "packed");
    still(el, () => setPos(el, prev.x, -el.offsetHeight));
    el.classList.add("moving"); setPos(el, prev.x, prev.y);
    raise(el); renderPutAway(); FX.play("rustle");
    el.focus({ preventScroll: true });
  }
  function renderPutAway() {
    const box = $("#putaway");
    if (box) box.innerHTML = paperIds().filter((id) => pst(id).away).map((id) => '<button class="chip" data-act="return" data-id="' + id + '">' + esc(paperLabel(id)) + "</button>").join("");
  }
  function moveTo(el, x, y) {
    const box = el.parentElement, w = box.clientWidth, h = box.clientHeight;
    x = clamp(x, 60 - el.offsetWidth, w - 60);
    y = clamp(y, 0, Math.max(0, h - 40));
    setPos(el, x, y);
    if (el.classList.contains("paper")) { const st = pst(el.dataset.id); st.x = x; st.y = y; if (st.open) el.style.maxHeight = $("#desk").clientHeight - y - 10 + "px"; }
    else if (el.dataset.sticker) ui.stickers[el.dataset.sticker] = [x, y];
    else if (el.id === "slip") ui.slipPos = [x, y];
  }

  // ----- the skills drawer -----
  function boxH() { const b = $("#drawer-box"); return b ? b.offsetHeight : 0; }
  function layoutDrawer(animate) {
    const d = $("#drawer");
    if (!d) return;
    d.classList.toggle("sliding", !!animate);
    const front = 34;
    d.style.setProperty("--drawer-y", (ui.drawerShown ? (1 - ui.drawer) * boxH() : boxH() + front + 20) + "px");
    const open = ui.drawer > 0.5;
    $("#drawer-box").inert = !open;
    $("#drawer-box").hidden = isPhone() && !open;
    $("#handle").setAttribute("aria-expanded", String(open));
  }
  function showDrawer(on, instant) { ui.drawerShown = on || isPhone(); if (!on) ui.drawer = 0; layoutDrawer(!instant); }
  function setDrawer(v) {
    const was = ui.drawer > 0.5;
    ui.drawer = v; layoutDrawer(true);
    if (v > 0.5 && !was) { markHandled(); FX.play("drawer"); $("#drawer").style.zIndex = ++topZ; say("drawer"); }
    else if (v <= 0.5 && was) FX.play("drawer");
  }
  function refreshSkills() { const b = $("#drawer-box"); if (b) b.innerHTML = skillsHTML(); }

  // ----- the stamp -----
  function pick(kind) {
    ui.holding = kind;
    document.documentElement.classList.add("holding");
    $$(".rack-stamp").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.kind === kind)));
    const g = $("#ghost"), pv = $("#preview");
    g.innerHTML = SPR.tool(kind, PX);
    pv.className = "preview ink " + (kind === "approved" ? "green" : "red");
    pv.textContent = kind === "approved" ? "APPROVED" : "DENIED";
    if (lastXY && lastPointer === "mouse") { g.hidden = false; moveGhost(lastXY[0], lastXY[1]); }
  }
  function putBack() {
    ui.holding = null;
    document.documentElement.classList.remove("holding");
    $$(".rack-stamp").forEach((b) => b.setAttribute("aria-pressed", "false"));
    $("#ghost").hidden = true; $("#preview").hidden = true;
  }
  function moveGhost(x, y) { const g = $("#ghost"); g.style.left = x - 36 + "px"; g.style.top = y - 60 + "px"; }
  function pulled(s, x, y) {
    const t = $(".target", s);
    if (!t) return [x, y];
    const r = t.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    if (x > r.left - 24 && x < r.right + 24 && y > r.top - 24 && y < r.bottom + 24) return [x + (cx - x) * 0.4, y + (cy - y) * 0.4];
    return [x, y];
  }
  function markHTML(m) {
    return '<span class="mark ink ' + (m.kind === "approved" ? "green" : "red") + '" style="left:' + m.x + "px;top:" + m.y + "px;--tilt:" + m.rot + "deg;opacity:" + m.op +
      ";--mx:" + m.mx + "px;--my:" + m.my + 'px">' + (m.kind === "approved" ? "APPROVED" : "DENIED") + "<small>" + today + "</small></span>";
  }
  function renderMarks(key) { $$('[data-marks="' + key + '"]').forEach((el) => { el.innerHTML = ui.marks[key].map(markHTML).join(""); }); }
  function stampAt(s, x, y, kind) {
    const key = s.dataset.stamp, r = s.getBoundingClientRect();
    const m = { kind: kind, x: Math.round(x - r.left), y: Math.round(y - r.top), rot: (Math.random() * 8 - 4).toFixed(1), op: (0.78 + Math.random() * 0.17).toFixed(2),
      mx: Math.floor(Math.random() * 16) * 3, my: Math.floor(Math.random() * 16) * 3 };
    slam(x, y, () => { ui.marks[key].push(m); renderMarks(key); FX.play("thud"); afterStamp(key, kind); });
  }
  function slam(x, y, done) {
    const g = $("#ghost");
    if (!g.innerHTML) g.innerHTML = SPR.tool(ui.holding || "approved", PX);
    moveGhost(x, y); g.hidden = false;
    if (reduced()) { done(); if (lastPointer !== "mouse") g.hidden = true; return; }
    g.classList.add("lift");
    setTimeout(() => {
      g.classList.replace("lift", "slam"); done();
      setTimeout(() => { g.classList.remove("slam"); if (lastPointer !== "mouse" || !ui.holding) g.hidden = true; }, 90);
    }, 70);
  }
  function afterStamp(key, kind) {
    if (key === "record") { say(kind); return; }
    if (key !== "visa" || ui.introDone) return;
    ui.introDone = true; ui.admitted = kind;
    const sayEl = $("#say");
    if (kind === "approved") { sayEl.textContent = "Entry granted. Welcome to the booth."; setTimeout(closeIntro, 1000); }
    else { sayEl.textContent = deniedLine(); setTimeout(closeIntro, 2600); }
    const n = $("#denied-note"); if (n) n.hidden = kind !== "denied";
  }
  function stampTarget() {
    if ($("#intro")) {
      if (ui.introStep === 0) introNext();
      if (ui.passPage !== 0) flipPass();
      return $('#intro .target[data-target="visa"]');
    }
    if (ui.view !== "desk") return null;
    printNow();
    return $('.target[data-target="record"]');
  }

  // ----- the entry record printer and the tear-off slip -----
  function printNow() { ui.printed = true; const a = $("#printer-area"); if (a) { a.classList.remove("printing"); a.classList.add("printed"); } }
  function watchPrinter() {
    const a = $("#printer-area");
    if (!a || ui.printed) return;
    if (!("IntersectionObserver" in window)) { printNow(); return; }
    const io = new IntersectionObserver((es) => {
      if (!es.some((e) => e.isIntersecting) || ui.printed) return;
      io.disconnect(); ui.printed = true;
      if (reduced()) printNow(); else { a.classList.add("printing"); FX.play("print"); setTimeout(printNow, 1450); }
      say("record");
    }, { threshold: 0.25 });
    io.observe(a);
  }
  function setTear(v) { ui.torn = v; const r = $("#receipt"); if (r) r.style.setProperty("--tear", v); }
  function tearOff() {
    if (ui.slipTorn) return;
    const slip = $("#slip"), area = $("#printer-area"), sr = slip.getBoundingClientRect(), ar = area.getBoundingClientRect();
    ui.slipTorn = true; FX.play("rustle");
    $("#receipt").classList.add("torn"); $("#perf").remove();
    slip.style.removeProperty("rotate");
    area.appendChild(slip);
    slip.dataset.drag = "";
    if (!isPhone()) {
      slip.classList.add("loose");
      ui.slipPos = [Math.round(sr.left - ar.left + 12), Math.round(sr.top - ar.top + 18)];
      setPos(slip, ui.slipPos[0], ui.slipPos[1]);
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
    const vh = window.innerHeight, rec = $("#record").getBoundingClientRect(), slip = $("#slip");
    if (slip && ui.printed && slip.getBoundingClientRect().top < vh * 0.7) return 3;
    if (rec.top < vh * 0.55) return 2;
    if (isPhone()) return $("#desk").getBoundingClientRect().top < vh * 0.5 ? 1 : 0;
    return -$("#scene").getBoundingClientRect().top >= BOOT - 10 ? 1 : 0;
  }
  function goArea(i) {
    const id = AREAS[i][0], sc = $("#scene");
    if (id === "booth") window.scrollTo({ top: isPhone() ? 0 : docTop(sc), behavior: behavior() });
    else if (id === "desk") window.scrollTo({ top: isPhone() ? docTop($("#desk")) - 8 : docTop(sc) + unpackEnd(), behavior: behavior() });
    else if (id === "record") { window.scrollTo({ top: docTop($("#record")), behavior: behavior() }); }
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
    project: { name: "", icon: "paper", demo: "", role: "", dates: "", event: "", award: "", line: "", points: [""], stack: "", aside: "", featured: "" },
  };
  const WHEN = { arrive: "When the booth opens", unpacked: "When the file is unpacked", drawer: "When the skills drawer opens", record: "When the entry record prints",
    approved: "After an approved stamp on the record", denied: "After a denied stamp on the record" };

  function listCase(x, i) {
    const k = "projects." + i + ".";
    if (editing) {
      return '<article class="case">' + row("Name", f(k + "name", "Project name")) + row("Role", f(k + "role", "Your role")) + row("Dates", f(k + "dates", "When")) +
        row("Event", f(k + "event", "Hackathon or event, optional")) + row("Award stamp", f(k + "award", "Award, optional")) + row("One-liner", f(k + "line", "What it does, in one sentence")) +
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
    placeStickers();
    renderPutAway();
    renderMarks("record");
    if (ui.slipTorn && ui.slipPos && !isPhone()) setPos($("#slip"), ui.slipPos[0], ui.slipPos[1]);
    layoutDrawer(false);
    applyScene(true);
    watchPrinter();
    updatePill();
  }
  function render() {
    const desk = !editing && ui.view === "desk";
    if (!desk && ui.holding) putBack();
    document.documentElement.classList.toggle("desk-mode", desk);
    if (desk) renderDesk(); else renderList();
  }

  // ----- intro: the passport -----
  const mrz = (s, n) => esc((String(s).toUpperCase().replace(/[^A-Z0-9]/g, "<") + "<".repeat(n)).slice(0, n));
  function visaInner() {
    const corner = '<button class="corner" data-act="flip-pass" aria-label="Turn to page ' + (ui.passPage ? 1 : 2) + '">' + SPR.draw("corner", PX) + "</button>";
    if (ui.passPage === 0) {
      return '<div class="visa-page visa stampable" data-stamp="visa"><h2>Visa</h2><p class="note">Entry stamp for ' + esc(state.profile.name) + "</p>" +
        '<button class="target" data-target="visa">Stamp here</button><div class="marks" data-marks="visa"></div></div>' + corner;
    }
    return '<div class="visa-page"><h2>Entries and commendations</h2><div class="pp-stamps">' + state.awards.filter((a) => a.result).map((a, i) =>
      '<span class="ink green" style="--tilt:' + [-4, 3, -2, 5][i % 4] + 'deg">' + esc(a.result) + "<small>" + esc(a.event + " " + a.year) + "</small></span>").join("") + "</div></div>" + corner;
  }
  function flipPass() {
    const back = $("#pp-back");
    turn(back, () => { ui.passPage = ui.passPage ? 0 : 1; back.innerHTML = visaInner(); renderMarks("visa"); const c = $(".corner", back); if (c && document.activeElement === document.body) c.focus(); });
    FX.play("rustle");
  }
  function renderIntro() {
    const p = state.profile, e = state.education;
    const parts = p.name.trim().split(/\s+/), surname = parts.length > 1 ? parts.pop() : "", given = parts.join(" ");
    ui.introStep = 0; ui.introDone = false; ui.passPage = 0;
    introRoot.innerHTML =
      '<div class="intro" id="intro" role="dialog" aria-label="Passport"><div class="intro-inner"><p class="intro-say" id="say" aria-live="polite">Next applicant. Open the passport to begin.</p>' +
      '<div class="passport" id="passport"><div class="pp-data"><div class="pp-head"><span>Passport</span><span>' + mrz("P " + p.nationality.slice(0, 3), 5) + "</span></div>" +
      '<div class="pp-body"><div class="pp-photo">' + SPR.draw("portrait", PX, "Pixel portrait of the passport holder, with shoulder-length dark hair and a green top") + "</div>" +
      '<dl class="pp-fields"><div><dt>Surname</dt><dd>' + esc(surname) + "</dd></div><div><dt>Given name</dt><dd>" + esc(given) + "</dd></div>" +
      "<div><dt>Nationality</dt><dd>" + esc(p.nationality) + "</dd></div><div><dt>Graduated</dt><dd>" + esc(e.graduated) + "</dd></div>" +
      '<div class="wide"><dt>Occupation</dt><dd>' + esc(p.occupation) + '</dd></div><div class="wide"><dt>Based in</dt><dd>' + esc(p.basedIn) + "</dd></div></dl></div>" +
      '<div class="pp-mrz" aria-hidden="true">' + mrz("P " + p.nationality.slice(0, 3) + " " + surname + "  " + given, 38) + "<br>" + mrz("BCS " + e.graduated + " UOW SIM", 38) + "</div></div>" +
      '<div class="pp-cover"><div class="pp-front" data-act="intro-next">' + SPR.draw("emblem", PX) + "<b>Passport</b><span>" + esc(p.name) + "</span></div>" +
      '<div class="pp-back" id="pp-back">' + visaInner() + "</div></div></div>" +
      '<div class="intro-actions"><button class="btn-main" id="intro-btn" data-act="intro-next">Open passport</button><button class="btn-quiet" data-act="intro-skip">Skip to the booth</button></div></div></div>';
    renderMarks("visa");
    document.documentElement.classList.add("locked");
    $("#intro-btn").focus({ preventScroll: true });
  }
  function introNext() {
    if (ui.introStep === 0) {
      const pp = $("#passport");
      pp.parentNode.style.setProperty("--pp-h", pp.offsetHeight + "px");
      pp.classList.add("open");
      $("#say").textContent = "Pick up a stamp from the rack and stamp the visa. Approve or deny, both let you in.";
      $("#intro-btn").textContent = "Pick up the stamp";
      ui.introStep = 1;
      FX.play("rustle");
    } else {
      if (!ui.holding) pick("approved");
      const t = stampTarget();
      if (t) t.focus({ preventScroll: true });
    }
  }
  function closeIntro() {
    const el = $("#intro");
    if (!el || el.classList.contains("leaving")) return;
    if (ui.holding) putBack();
    el.classList.add("leaving");
    document.documentElement.classList.remove("locked");
    setTimeout(() => { introRoot.innerHTML = ""; const h = $("#hello"); if (h) h.focus({ preventScroll: true }); }, reduced() ? 0 : 620);
  }

  // ----- actions -----
  function touched() { dirty = true; note = ""; }
  const ACTIONS = {
    "intro-next": introNext,
    "intro-skip": closeIntro,
    passport: renderIntro,
    "flip-pass": flipPass,
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
    pick(b) { if (ui.holding === b.dataset.kind) putBack(); else pick(b.dataset.kind); },
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
    demo(b) { const box = b.parentNode.querySelector(".demo-box"); box.hidden = false; b.hidden = true; DEMOS[state.projects[+b.dataset.i].demo](box); const el = b.closest(".paper"); if (el) fitOpen(el); },
    tear() { if (perfMoved) return; tearAll(); },
    target(b) { if (!ui.holding) pick("approved"); },
    edit() { editing = true; note = ""; render(); window.scrollTo(0, 0); },
    discard() { state = JSON.parse(ORIGINAL); editing = false; dirty = false; note = ""; render(); },
    save: save,
    add(b) { at(b.dataset.p).push(JSON.parse(JSON.stringify(BLANK[b.dataset.t]))); touched(); render(); },
    del(b) { at(b.dataset.p).splice(+b.dataset.i, 1); touched(); render(); },
    copy(b) {
      const scope = b.closest(".slip") || b.closest(".row") || document;
      const pick2 = () => { const el = $(".email", scope); if (!el) return; const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Address selected"; };
      try { navigator.clipboard.writeText(state.profile.email).then(() => { b.textContent = "Copied"; }, pick2); } catch (err) { pick2(); }
    },
  };

  // stamping takes over clicks on stampable paper while a stamp is held
  document.addEventListener("click", (ev) => {
    const s = ev.target.closest(".stampable"), tgt = ev.target.closest(".target");
    if (s && !ev.target.closest(".corner") && (ui.holding || (tgt && ev.detail === 0))) {
      ev.preventDefault();
      const kind = ui.holding || "approved";
      if (ev.detail === 0 && tgt) {
        const r = tgt.getBoundingClientRect();
        stampAt(s, r.left + r.width / 2 + Math.random() * 6 - 3, r.top + r.height / 2 + Math.random() * 6 - 3, kind);
      } else {
        const p = lastPointer === "mouse" ? pulled(s, ev.clientX, ev.clientY) : [ev.clientX, ev.clientY];
        stampAt(s, p[0], p[1], kind);
      }
      return;
    }
    if (tgt) { ACTIONS.target(tgt); return; }
    const b = ev.target.closest("[data-act]");
    if (b && !b.disabled) { ACTIONS[b.dataset.act](b); return; }
    const folder = ev.target.closest(".paper.p-case:not(.open)");
    if (folder && !justDragged) openCase(folder.dataset.id);
  });

  // dragging: papers, stickers, the torn slip and the drawer handle
  let drag = null, justDragged = false, drawerDrag = null, perfDrag = null, perfMoved = false;
  const NO_DRAG = "button, a, input, textarea, select, label, .demo-box, .f";
  document.addEventListener("pointerdown", (ev) => {
    lastPointer = ev.pointerType || "mouse";
    if (ev.button !== 0) return;
    if (ev.target.closest("#handle") && !isPhone()) { drawerDrag = { sy: ev.clientY, start: ui.drawer, h: boxH(), moved: false }; return; }
    const perf = ev.target.closest("#perf");
    if (perf) { perfDrag = { sx: ev.clientX, w: perf.offsetWidth, start: ui.torn }; perfMoved = false; perf.setPointerCapture(ev.pointerId); return; }
    const el = ev.target.closest("[data-drag]");
    if (!el || ui.holding) return;
    if (el.classList.contains("paper") || el.id === "slip") raise(el);
    if (ev.target.closest(NO_DRAG) || isPhone()) return;
    drag = { el: el, sx: ev.clientX, sy: ev.clientY, ox: el.offsetLeft, oy: el.offsetTop, moved: false, id: ev.pointerId };
  });
  document.addEventListener("pointermove", (ev) => {
    lastXY = [ev.clientX, ev.clientY];
    if (ev.pointerType) lastPointer = ev.pointerType;
    if (ui.holding && ev.pointerType === "mouse") {
      const g = $("#ghost"), pv = $("#preview");
      g.hidden = false; moveGhost(ev.clientX, ev.clientY);
      const s = ev.target.closest && ev.target.closest(".stampable");
      if (s && !ev.target.closest(".corner")) { const p = pulled(s, ev.clientX, ev.clientY); pv.hidden = false; pv.style.left = p[0] + "px"; pv.style.top = p[1] + "px"; }
      else pv.hidden = true;
    }
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
      drag.el.classList.remove("moving"); drag.el.classList.add("held");
      try { drag.el.setPointerCapture(ev.pointerId); } catch (err) { /* capture is optional */ }
      FX.play("rustle");
      if (drag.el.classList.contains("paper")) markHandled();
    }
    moveTo(drag.el, drag.ox + dx, drag.oy + dy);
    const ct = $("#counter");
    if (ct && drag.el.classList.contains("paper")) { const r = ct.getBoundingClientRect(); ct.classList.toggle("ready", ev.clientY < r.bottom && ev.clientY > r.top - 40); }
  });
  function endDrag(ev) {
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
      if (ct && ct.classList.contains("ready")) { ct.classList.remove("ready"); putAway(d.el.dataset.id, { x: d.ox, y: Math.max(d.oy, 56) }); return; }
    } else if (d.el.id === "slip") d.el.style.setProperty("--tilt", tilt + "deg");
    if (ct) ct.classList.remove("ready");
    FX.play("rustle");
  }
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);

  document.addEventListener("keydown", (ev) => {
    const t = ev.target, typing = t.closest && t.closest(".f, input, textarea, [contenteditable]");
    if (ev.key === "Enter" && t.closest && t.closest(".f")) ev.preventDefault();
    if (typing || ev.ctrlKey || ev.metaKey || ev.altKey) return;
    if (ev.key === "Escape") {
      if (ui.holding) { putBack(); return; }
      if ($("#intro")) { closeIntro(); return; }
      if (ui.drawer > 0.5) { setDrawer(0); $("#handle").focus(); return; }
      const open = paperIds().filter((id) => pst(id).open);
      const which = open.includes(ui.front) ? ui.front : open[open.length - 1];
      if (which) closeCase(which);
      return;
    }
    if ((ev.key === "s" || ev.key === "S") && (ui.view === "desk" || $("#intro")) && !editing) {
      ev.preventDefault();
      if (!ui.holding) pick("approved"); else if (ui.holding === "approved") pick("denied"); else { putBack(); return; }
      const target = stampTarget();
      if (target) setTimeout(() => { target.scrollIntoView({ block: "center", behavior: behavior() }); target.focus({ preventScroll: true }); }, 0);
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
    requestAnimationFrame(() => { ticking = false; if (ui.view === "desk" && !editing) { applyScene(); updatePill(); } });
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
      "<link rel=\"stylesheet\" href=\"https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Pixelify+Sans:wght@400;600&display=swap\">\n" +
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
