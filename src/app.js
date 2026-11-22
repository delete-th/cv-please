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
    marks: { visa: [], record: [], id: [], diploma: [] }, inked: { visa: false, record: false, id: false, diploma: false }, papers: {}, stickers: {}, scene: null, maxOut: 0,
    forced: false, boothForced: false, handled: false, drawer: 0, fit: 1,
    mints: 3, hot: null, front: null, printed: false, torn: 0, slipTorn: false, slipPos: null,
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
      '<span class="id-ghost" aria-hidden="true">' + SPR.applicant("thea", 1, "") + '</span><span class="id-seal" aria-hidden="true"></span><span class="id-strip" aria-hidden="true"></span>' +
      '<div class="stamp-box ghost' + (ui.inked.id ? " inked" : "") + '" aria-hidden="true"></div><div class="marks" data-marks="id"></div></div>';
  }
  // A landscape certificate: crest watermark, gold seal, red ribbon, a double rule, and the wording of a real diploma.
  // The university and degree come from the education entry; the honour is split off the degree name.
  function diplomaInner() {
    const e = state.education, p = state.profile;
    const school = String(e.school || ""), uni = school.split("(")[0].trim(), partner = (school.match(/\(([^)]+)\)/) || [])[1] || "";
    const degree = String(e.degree || ""), honour = (degree.match(/\(([^)]+)\)/) || [])[1] || "", name = degree.replace(/\s*\([^)]*\)/, "").trim();
    return '<div class="dip stampable" data-stamp="diploma"><span class="dip-mark" aria-hidden="true">' + SPR.crest(7, "wood-5") + "</span>" +
      '<span class="dip-seal" aria-hidden="true">' + SPR.crest(2) + '</span><span class="dip-ribbon" aria-hidden="true"></span>' +
      '<p class="dip-uni">' + esc(uni) + "</p>" + (partner ? '<p class="dip-small dip-it">in partnership with the ' + esc(partner) + "</p>" : "") +
      '<p class="dip-small">On the recognition of successful completion of the requisite course of study, we hereby confer upon</p>' +
      '<p class="dip-name">' + esc(p.name) + '</p><p class="dip-small dip-it">the degree of</p><p class="dip-degree">' + esc(name) + "</p>" +
      (honour ? '<p class="dip-honour">' + esc(honour.charAt(0).toUpperCase() + honour.slice(1)) + "</p>" : "") +
      '<p class="dip-small">' + esc(e.major) + "</p>" +
      '<div class="dip-foot"><span class="dip-sign"><i aria-hidden="true">' + SPR.draw("squiggle", 1) + "</i><b>Registrar</b></span>" +
      '<span class="dip-conf">Conferred ' + esc(e.graduated) + '</span><span class="dip-sign"><i aria-hidden="true">' + SPR.draw("squiggle2", 1) + "</i><b>Dean</b></span></div>" +
      '<div class="stamp-box ghost' + (ui.inked.diploma ? " inked" : "") + '" aria-hidden="true"></div><div class="marks" data-marks="diploma"></div></div>';
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
    return '<span class="hon-clip" aria-hidden="true">' + SPR.art("paperclip", 3) + '</span><div class="pad"><p class="doc-title">Commendations</p>' + state.awards.filter((a) => a.result).map((a, i) => {
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
    // page count and the way back sit at the bottom right, beside the corner that turns the page
    const foot = n > 1 ? '<div class="pg-foot">' + (page > 0 ? '<button class="pg-back" data-act="page" data-id="' + id + '" data-dir="-1" aria-label="Back to page ' + page + '">Previous page</button>' : "") +
      '<span class="pg">Page ' + (page + 1) + " of " + n + "</span></div>" : "";
    const note = boardFor(p) && !isPhone() ? '<button class="cf-board" data-act="cf-board" data-id="' + id + '">How I built it ↑</button>' : "";
    return note + '<header class="paper-head"><h2>' + esc(p.name) + '</h2><div class="ph-row">' +
      '<button class="close icon-btn" data-act="to-box" data-id="' + id + '" aria-label="Return to box">' + SPR.draw("tobox", 2) + '<span class="ib-tip" aria-hidden="true">Return to box</span></button>' +
      '<button class="close icon-btn" data-act="close-case" data-id="' + id + '" aria-label="Close file">' + SPR.draw("xmark", 2) + '<span class="ib-tip" aria-hidden="true">Close file</span></button></div></header>' +
      '<div class="sheets"><div class="paper-body">' + pages[page] + "</div></div>" + foot +
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
  function deniedLine() { return "Entry denied. Unconvinced? Investigate the applicant at the desk."; }
  function boothHTML() {
    const p = state.profile, qs = state.interview.map((q, i) => [q, i]).filter((x) => x[0].q && x[0].a);
    return '<header class="booth" id="booth"><div class="window-wrap"><div class="window"><span class="skyline" id="skyline" data-phase="' + dayPhase() + '">' + SPR.scene(PX, dayPhase()) + "</span>" +
      SPR.applicant(p.applicant || "thea", 2, portraitAlt + ", standing at the booth window", "applicant") + '<span class="blink" id="blink" aria-hidden="true"><i></i><i></i></span><span class="mouth" id="mouth" aria-hidden="true"><i></i></span><span class="ledge" aria-hidden="true"></span>' +
      '<div class="shutter" id="shutter"><span>Booth closed.</span><button class="btn-quiet" data-act="open-booth">Open the shutter</button></div></div>' +
      '<div class="board" id="board" aria-hidden="true"></div><p class="sr-only">Departure board: ' + esc(p.board.join(", ")) + "</p></div>" +
      '<div class="booth-main">' + (p.eyebrow ? '<p class="eyebrow">' + esc(p.eyebrow) + "</p>" : "") +
      '<h1 class="bname" id="hello" tabindex="-1">' + esc(p.name) + '</h1><p class="tagline">' + esc(p.tagline) + "</p>" +
      '<p class="denied-note" id="denied-note"' + (ui.admitted === "denied" ? "" : " hidden") + ">" + esc(deniedLine()) + "</p>" +
      (qs.length ? '<div class="ask">' + qs.map((x) => '<button class="btn-quiet" data-act="ask" data-q="' + x[1] + '">' + esc(x[0].q) + "</button>").join("") + "</div>" +
        '<p class="bubble" id="bubble" aria-live="polite"' + (ui.asked == null ? " hidden" : "") + ">" + (ui.asked == null ? "" : esc(state.interview[ui.asked].a)) + "</p>" : "") +
      '<nav class="booth-links" aria-label="Shortcuts"><button class="btn-quiet" data-act="summary">Summary</button><button class="btn-quiet" data-act="view" data-v="list">Simplify</button>' +
      '<button class="btn-quiet" data-act="passport">Inspect passport</button><span class="owner" id="owner">' + ownerBar() + "</span></nav></div>" +
      '<div class="booth-side">' + pinboardHTML() + "</div>" +
      '<div class="booth-meta">' +
      (hasRadio() ? '<div class="radio">' + SPR.draw("radio", PX) + '<button class="btn-quiet" data-act="radio" aria-pressed="' + ui.radioOn + '">' + (ui.radioOn ? "Mute radio" : "Unmute radio") + "</button></div>" : "") +
      speakerHTML() + "</div>" +
      '<p class="aside" id="aside" aria-live="polite" hidden></p>' +
      '<div class="intercom" id="intercom">' + SPR.art("intercom", 2) + '<button class="ic-btn" data-act="intercom" aria-label="Intercom: ask Thea a question" aria-haspopup="dialog" aria-expanded="false"><span class="tip" aria-hidden="true">Intercom</span></button></div></header>';
  }

  // The alarm clock: the visitor's local time in amber seven-segment digits on its blank display, drawn on a canvas
  // the size of the sprite (1 canvas pixel = 1 art pixel) so the digits sit on the sprite's pixel grid.
  function alarmHTML() {
    return '<button class="aclock" id="aclock" data-act="snooze" aria-label="Alarm clock, snooze" data-tag="5 more minutes">' + SPR.art("alarm-clock", 3, "ac-up") + SPR.art("alarm-clock-snooze", 3, "ac-down") +
      '<canvas class="ac-led" width="58" height="32" aria-hidden="true"></canvas><span class="sr-only ac-time" id="ac-time"></span></button>';
  }
  // segments of a 5x9 digit: a top, b upper right, c lower right, d bottom, e lower left, f upper left, g middle
  const SEG = { a: [[1, 0], [2, 0], [3, 0]], b: [[4, 1], [4, 2], [4, 3]], c: [[4, 5], [4, 6], [4, 7]], d: [[1, 8], [2, 8], [3, 8]], e: [[0, 5], [0, 6], [0, 7]], f: [[0, 1], [0, 2], [0, 3]], g: [[1, 4], [2, 4], [3, 4]] };
  const DIGIT = ["abcdef", "bc", "abged", "abgcd", "fgbc", "afgcd", "afgedc", "abc", "abcdefg", "abcdfg"];
  const LED_ON = "#e8a33a", LED_OFF = "#2f3a2b";
  let acColon = true, acMinute = "";
  function drawAlarm() {
    const cv = $(".ac-led");
    if (!cv) return;
    const g = cv.getContext("2d"), now = new Date(), hh = String(now.getHours()).padStart(2, "0"), mm = String(now.getMinutes()).padStart(2, "0");
    g.clearRect(0, 0, 58, 32);
    // HH:MM is 25 art pixels wide and 9 tall, centred in the display (x 6 to 46, y 12 to 23)
    const x0 = 6 + Math.floor((41 - 25) / 2), y0 = 12 + Math.floor((12 - 9) / 2);
    const digit = (n, x) => Object.keys(SEG).forEach((k) => { g.fillStyle = DIGIT[n].includes(k) ? LED_ON : LED_OFF; SEG[k].forEach((q) => g.fillRect(x + q[0], y0 + q[1], 1, 1)); });
    digit(+hh[0], x0); digit(+hh[1], x0 + 6); digit(+mm[0], x0 + 14); digit(+mm[1], x0 + 20);
    g.fillStyle = acColon || reduced() ? LED_ON : LED_OFF; g.fillRect(x0 + 12, y0 + 2, 1, 1); g.fillRect(x0 + 12, y0 + 6, 1, 1);
    // the glass glare stays on top of the digits
    (ART["alarm-clock"].glare || []).forEach((q) => { g.fillStyle = q[2]; g.fillRect(q[0], q[1], 1, 1); });
    const t = hh + ":" + mm;
    if (t !== acMinute) { acMinute = t; const sr = $("#ac-time"); if (sr) sr.textContent = "Local time " + t; }
  }
  function alarmTick() {
    acColon = !acColon; drawAlarm();
    // the colon blinks once a second, slower while the watch has slowed time
    setTimeout(alarmTick, slow ? 1500 : 500);
  }
  setTimeout(alarmTick, 0);
  function snooze(el) {
    el.classList.add("down"); FX.play("snooze");
    setTimeout(() => el.classList.remove("down"), 150);
    showTag(el, true); clearTimeout(snooze.t); snooze.t = setTimeout(() => { if (tagFor === el) hideTag(); }, 3000);
  }
  // the portable speaker is the sound switch: light off when the site is quiet, amber light on when it makes sounds
  function speakerHTML() {
    const on = FX.soundOn;
    return '<button class="spk' + (on ? " on" : "") + '" data-act="sound" aria-pressed="' + on + '" aria-label="Sound and music" data-tag="' + (on ? "Music on" : "Music off") + '">' +
      SPR.art("speaker-off", 2, "spk-off") + SPR.art("speaker-on", 2, "spk-on") + '<span class="spk-light" aria-hidden="true"></span></button>';
  }
  // The pinboard: the prize voucher, an index card with the roles Thea is open to, and an optional "Currently" note.
  // (The awards themselves live on the Commendations paper.)
  function pinboardHTML() {
    const p = state.profile, src = ART["pinboard-large"] ? ART["pinboard-large"].src : "";
    const prize = state.awards.map((a) => String(a.note || "").match(/prize was an? (.+?)\.?$/i)).filter(Boolean)[0];
    const prizeAward = state.awards.find((a) => /prize was/i.test(a.note || ""));
    const ticket = prize ? '<span class="pbi pbi-ticket" tabindex="0" data-tag="' + esc("Won with " + prizeAward.result + " at " + prizeAward.event + " " + prizeAward.year + ".") + '"><span class="tack tack-ink" aria-hidden="true"></span><span class="pbi-tk">' + esc(prize[1].replace(/^./, (c) => c.toUpperCase())) + "</span></span>" : "";
    const card = p.openTo ? '<span class="pbi pbi-card" tabindex="0" data-tag="' + esc(p.seeking || "") + '"><span class="tack tack-red" aria-hidden="true"></span><b>Open to:</b> ' + esc(p.openTo) + "</span>" : "";
    const now = String(p.currently || "").trim();
    const cur = now ? '<span class="pbi pbi-note" tabindex="0" data-tag="' + esc("Updated by Thea.") + '"><span class="tack tack-green" aria-hidden="true"></span><b>Currently</b> ' + esc(now) + "</span>" : "";
    return '<div class="pinboard" role="group" aria-label="Pinboard" style="border-image-source: url(' + src + ')">' + card + ticket + cur + "</div>";
  }

  // the visitor's local hour sets the sky: dawn, day, dusk or night
  function dayPhase(d) {
    const h = (d || new Date()).getHours();
    return h >= 5 && h < 9 ? "dawn" : h >= 9 && h < 17 ? "day" : h >= 17 && h < 19 ? "dusk" : "night";
  }
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
    const b = $("#booth");
    if (!b) return;
    const w = window.innerWidth, h = window.innerHeight;
    const big = false;
    b.classList.toggle("pb3", big); b.classList.toggle("pb2", !big);
  }
  function deskHTML() {
    const sticker = (id, art) => '<span class="sticker" data-sticker="' + id + '" data-drag aria-hidden="true">' + SPR.art(art, SC) + (id === "mug" ? '<span class="steam">' + SPR.draw("steam1", PX) + SPR.draw("steam2", PX) + "</span>" : "") + "</span>";
    return '<section class="desk" id="desk" aria-label="Desk">' +
      '<p class="phone-hint">Swipe through the papers. Tap a folder to open it.</p>' +
      '<div class="counter" id="counter"><button class="peek-btn" data-act="wall" data-tag="Whiteboard" aria-label="Look up at the whiteboard"><span class="peek-art">' + SPR.art("board-peek", SC) +
        '<span class="pk-mk pk-blue">' + SPR.art("marker-blue", SC) + '</span><span class="pk-mk pk-black">' + SPR.art("marker-black", SC) + '</span><span class="pk-mk pk-red">' + SPR.art("marker-red", SC) + "</span></span></button>" +
        '<button class="desk-marker" data-act="marker-back" data-tag="Whiteboard" aria-label="Put the marker back on the whiteboard">' + SPR.art("marker-desk", SC) + "</button>" + '<div class="put-away" id="putaway"></div><span class="counter-hint" id="counter-hint">Drop here to put it away</span></div>' +
      '<div class="filebox" id="filebox" data-act="all-back"><span class="box-art" aria-hidden="true">' + SPR.art("filebox", BX) + "</span></div>" +
      '<div class="filebox-front" id="filebox-front">' + SPR.art("filebox-front", BX) + '<button class="box-plate" data-act="all-back" aria-label="Put all files back"></button></div>' +
      '<div class="printer" id="printer"><button class="printer-btn" data-act="print" aria-label="Print the entry record">' + SPR.art("printer-off", 4, "pr-off") + SPR.art("printer-on", 4, "pr-on") + "</button>" +
      '<span class="pr-paper" id="feed" aria-hidden="true"></span><span class="pr-front" aria-hidden="true">' + SPR.art("printer-front-off", 4, "pr-off") + SPR.art("printer-front-on", 4, "pr-on") + "</span></div>" +
      '<span class="pool" aria-hidden="true">' + SPR.pool(PX) + "</span>" +
      sticker("mug", "mug") + sticker("pen", "pen") +
      '<button class="notepad" id="notepad" data-act="note" aria-label="Sticky notes: leave Thea a note"' + (ui.noteSent ? " hidden" : "") + ">" + SPR.art("sticky-pad", SC) + "</button>" +
      '<form class="vnote" id="vnote" hidden><label class="sr-only" for="vnote-text">Your note to Thea</label><textarea id="vnote-text" maxlength="280" rows="5" placeholder="Write a note for Thea"></textarea>' +
      '<p class="vn-count" id="vn-count" aria-live="polite">0 of 280</p><div class="vn-row"><a class="btn-main" id="vn-send" href="#">Leave note</a><button type="button" class="btn-quiet" data-act="note-cancel">Put it back</button></div></form>' +
      '<p class="vsent" id="vsent"' + (ui.noteSent ? "" : " hidden") + '><span class="vs-text" id="vs-text"></span><span class="vs-tag">Sent</span></p>' + '<span class="ring cup-ring" aria-hidden="true">' + SPR.ring(PX) + "</span>" +
      '<div class="lamp" id="lamp">' + SPR.art("lamp", SC) + '<button class="lamp-switch" id="lamp-switch" data-act="lamp" aria-pressed="' + ui.lampOn + '" aria-label="Desk lamp switch"></button></div>' +
      '<div class="envelope" id="envelope" aria-hidden="true">' + SPR.art("envelope", SC) + '<span class="env-inside"></span><span class="env-flap">' + SPR.art("envelope", SC) + '</span><span class="env-stamp">Applicant<br>file</span></div>' +
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
    return '<section class="room room-record record-sec" id="record" aria-labelledby="record-h"><span class="rec-plant" aria-hidden="true">' + SPR.art("plant", SC) + '</span>' + alarmHTML() + '<div class="record-wrap"><div class="record-intro"><h2 id="record-h">Entry record</h2>' +
      "<p>The summary, printed at the desk. Stamp it if you want to leave a verdict, and tear off the slip to get in touch.</p>" +
      '<button class="btn-quiet" data-act="print">' + (ui.printed ? "Print it again" : "Print it") + "</button></div>" +
      '<div class="rec-printer" aria-hidden="false"><button class="printer-btn" data-act="print" aria-label="Print the entry record again">' + SPR.art("printer-off", 4, "pr-off") + SPR.art("printer-on", 4, "pr-on") + "</button>" +
      '<span class="pr-paper" aria-hidden="true"></span><span class="pr-front" aria-hidden="true">' + SPR.art("printer-front-off", 4, "pr-off") + SPR.art("printer-front-on", 4, "pr-on") + "</span></div>" +
      '<div class="record-area" id="record-area">' + (ui.printed ? "" : '<p class="record-empty" id="record-empty">Nothing printed yet. Click the printer on the desk, or print it from here.</p>') +
      receipt + (ui.slipTorn ? slip : "") + "</div></div></section>";
  }

  // ----- fixed controls: the stamp bar and the pill nav -----
  const FACE = SPR.STAMP_FACE;
  // panels in art pixels: resting and pressed; the pressed sprite stands on the same bottom-centre
  const STAMPS = {
    approved: { rest: [4, 38, 32, 10], press: [5, 36, 31, 8], fs: [17, 17] },
    denied: { rest: [4, 38, 32, 10], press: [5, 34, 30, 8], fs: [20, 20] },
  };
  const ST = 2;
  function stampArt(kind) {
    const k = STAMPS[kind], a = ART["stamp-" + kind], b = ART["stamp-" + kind + "-pressed"], word = kind === "approved" ? "APPROVED" : "DENIED";
    const layer = (cls, art, name, pnl, fs, dx, dy) => '<span class="' + cls + '" style="left:' + dx + "px;top:" + dy + 'px">' + SPR.art(name, ST) +
      '<span class="word" style="left:' + pnl[0] * ST + "px;top:" + pnl[1] * ST + "px;width:" + pnl[2] * ST + "px;height:" + pnl[3] * ST + "px;font-size:" + fs + 'px">' + word + "</span></span>";
    return '<span class="stamp-art" style="width:' + a.w * ST + "px;height:" + a.h * ST + 'px">' + layer("st-rest", a, "stamp-" + kind, k.rest, k.fs[0], 0, 0) +
      layer("st-press", b, "stamp-" + kind + "-pressed", k.press, k.fs[1], Math.floor((a.w - b.w) * ST / 2), (a.h - b.h) * ST) + "</span>";
  }
  const stampArtOld = (kind) => '<span class="stamp-art">' + SPR.stamp(kind, 2) + '<span class="word" style="left:' + FACE.x * 2 + "px;top:" + FACE.y * 2 + "px;width:" + FACE.w * 2 + "px;height:" + FACE.h * 2 + 'px">' +
    (kind === "approved" ? "APPROVED" : "DENIED") + "</span></span>";
  function renderFixed() {
    const slot = (kind) => '<button class="stamp-btn" data-kind="' + kind + '" aria-label="' + (kind === "approved" ? "Approved" : "Denied") + ' stamp" aria-describedby="stamp-keys"><span class="inkpad" aria-hidden="true">' +
      SPR.art(kind === "approved" ? "inkpad-green" : "inkpad-red", 2) + "</span>" + stampArt(kind) + "</button>";
    fixedRoot.innerHTML = '<p class="sr-only" id="stamp-status" aria-live="polite"></p>' +
      '<span class="mark ink ink-preview" id="ink-preview" hidden></span>' +
      '<div class="contact" id="contact" role="dialog" aria-modal="true" aria-labelledby="cm-title" hidden><div class="cm-back" data-act="cm-close"></div><div class="cm-device" id="cm-device"></div></div>' +
      '<div class="pills" id="pills"><div class="stamp-dock" id="stampdock"><div class="stampbar" id="stampbar" role="group" aria-label="Stamp tray">' +
      '<div class="bar-rail" id="bar-rail"><div class="rivets" aria-hidden="true"><i></i><i></i></div>' + slot("approved") + slot("denied") +
      '<p class="bar-note"><span class="point">Drag a stamp onto the paper, or tap one, then the paper.</span><span class="touch">Tap a stamp, then tap the paper.</span><span class="side-note">Drag to stamp, or tap, then tap.</span></p><div class="rivets" aria-hidden="true"><i></i><i></i></div>' +
      '<p class="sr-only" id="stamp-keys">Press Enter to pick it up, arrow keys to move it, B to move it over the stamp box, Enter to stamp and Escape to put it back.</p></div></div>' +
      '<button class="stamp-handle" id="stamp-handle" data-act="bar" aria-expanded="false" aria-controls="bar-rail">' + SPR.draw("pillstamp", 2) + "<span>Stamps</span>" +
      '<span class="caret" aria-hidden="true">' + SPR.draw("caretup", 2) + SPR.draw("caretdown", 2) + "</span></button></div>" +
      '<nav class="pill" id="pill" aria-label="Areas"><button data-act="step" data-dir="-1" aria-label="Previous area">' + SPR.draw("left", PX) +
      '</button><span class="area" id="area-name" aria-live="polite">Booth</span><button data-act="step" data-dir="1" aria-label="Next area">' + SPR.draw("right", PX) + "</button>" +
      '<button class="pill-down" data-act="wall-down" aria-label="Back down to the desk">' + SPR.draw("caretdown", PX) + "</button></nav></div>";
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
    if (s.shut !== prev.shut) {
      clearTimeout(applyScene.shutTimer);
      sh.classList.toggle("rolling", !force && !reduced());
      sh.classList.remove("up");
      sh.style.transform = "translateY(" + -s.shut * 25 + "%)";
      if (s.shut === 4) applyScene.shutTimer = setTimeout(() => sh.classList.add("up"), force || reduced() ? 0 : 1100);
      if (!force) FX.play("shutter");
    }
    if (s.counter !== prev.counter) ct.style.transform = "translateX(" + -(3 - s.counter) * 34 + "%)";
    if (s.lamp !== prev.lamp) { setLampVisible(s.lamp); if (!force && s.lamp) FX.play("lamp"); }
    if (s.board !== prev.board) { if (s.board) board.start(); else board.blank(); }
    ORDER().forEach((id, i) => {
      const want = i < s.out, had = prev.out != null && i < prev.out;
      if (!force && want === had) return;
      if (want) { if (ui.stagger && !force) setTimeout(() => unpack(id, false, i), i * ui.stagger); else unpack(id, force, i); } else pack(id, force);
    });
    $("#envelope").classList.toggle("folded", s.out >= n);
    // the flap is open whenever any paper is out of the folder
    if (s.out > 0) $("#envelope").classList.add("open"); else if (!ui.firstFlap) $("#envelope").classList.remove("open");
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
    ui.layoutH = $("#desk").clientHeight;
    box.style.left = "16px"; box.style.top = Math.max(8, u.bottom - box.offsetHeight) + "px";
    const front = $("#filebox-front"); front.style.left = box.style.left; front.style.top = box.style.top;
    // the lamp is anchored to the desk's top-right corner in CSS; keep the printer below its arm and clear of the Stamps tab
    const right = u.w - EDGE, below = lamp.offsetHeight + 8;
    pr.style.left = right - pr.offsetWidth + "px"; pr.style.top = Math.min(below, u.bottom - pr.offsetHeight) + "px";
    computeFit();
    const plan = colPlan();
    if (plan) { pr.style.left = Math.round(Math.max(plan.right + GAP, plan.lampLeft - GAP - pr.offsetWidth)) + "px"; pr.style.top = u.top + "px"; }
    env.style.left = Math.round(u.w * 0.3) + "px"; env.style.top = u.top + 16 + "px";
    $("#unpack-hint").style.left = Math.round(u.w * 0.3) + env.offsetWidth + 24 + "px";
  }
  function computeFit() {
    const dk = $("#desk"); if (dk) dk.classList.toggle("short", !isPhone() && window.innerHeight < 760);
    if (isPhone()) { ui.fit = 1; return; }
    const u = usable(), avail = u.bottom - u.top, el = (id) => paperEl(id);
    const mids = ["id", "diploma", "honours"].map(el), midH = Math.max.apply(null, mids.map((e, k) => e.offsetHeight + [8, 16, 0][k]));
    const left = boxRect().w + 30, minW = mids[0].offsetWidth - 54 + mids[1].offsetWidth - 36 + mids[2].offsetWidth;
    ui.fit = clamp(Math.min(avail / midH, (u.w - LANE - left) / minW), 0.75, 1);
    $("#desk").style.setProperty("--fit", ui.fit.toFixed(3));
  }
  const EDGE = 24, GAP = 16;
  function colPlan() {
    const dk = $("#desk"), lamp = $("#lamp");
    if (isPhone() || !dk || dk.classList.contains("short") || !lamp) return null;
    const u = usable(), s = ui.fit, e = ["id", "diploma", "honours"].map(paperEl);
    if (e.some((x) => !x)) return null;
    // a little extra for each paper's tilt
    const w = e.map((x) => x.offsetWidth * s + 6), h = e.map((x) => x.offsetHeight * s + 6);
    const hx = u.w - EDGE - w[2], hy = lamp.offsetTop + lamp.offsetHeight + 12, x0 = boxRect().w + 26;
    const spare = hx - GAP - (x0 + w[0] + GAP + w[1]);
    if (hy + h[2] > u.bottom || spare < 0) return null;
    const g = GAP + Math.min(spare / 2, 28);
    return { id: [x0, u.top + 8], diploma: [x0 + w[0] + g, u.top + 16], honours: [hx, hy], right: x0 + w[0] + g + w[1], lampLeft: lamp.offsetLeft };
  }
  function landing(id, el) {
    const u = usable(), i = caseIndex(id), s = ui.fit;
    if (i >= 0) return slotPos(i);
    const plan = colPlan();
    if (plan && plan[id]) return [Math.round(plan[id][0]), Math.round(plan[id][1])];
    const widths = ["id", "diploma", "honours"].map((k) => { const e = paperEl(k); return (e ? e.offsetWidth : 300) * s; });
    // papers may overlap only by their blank margins: the ID card's right edge, the diploma's side margins
    const ov = [54, 36], left = boxRect().w + 32, avail = u.w - LANE - left, min = widths[0] - ov[0] + widths[1] - ov[1] + widths[2];
    const extra = Math.max(0, avail - min) / 3, q = min > avail ? Math.max(0.5, (avail - widths[2]) / (min - widths[2])) : 1;
    const gap0 = (widths[0] - ov[0] + Math.min(extra, ov[0] + 60)) * q, gap1 = (widths[1] - ov[1] + Math.min(extra, ov[1] + 60)) * q;
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
      .concat(paperIds().map((id) => { const e = paperEl(id), st = pst(id); if (!e || st.inBox || st.open) return null; const at = st.x != null ? [st.x, st.y] : landing(id, e); return { x: at[0], y: at[1], w: e.offsetWidth * ui.fit + 8, h: e.offsetHeight * ui.fit + 8 }; }).filter(Boolean));
    const free = (x, y) => y >= u.top && y + h <= u.bottom && x >= 0 && x + w <= u.w - EDGE && !taken.some((r) => x < r.x + r.w + 12 && r.x < x + w + 12 && y < r.y + r.h + 12 && r.y < y + h + 12);
    const tries = [];
    for (let y = u.bottom - h; y >= u.top; y -= 12) for (let x = u.w - w - EDGE; x >= 0; x -= 12) tries.push([x, y]);
    const spot = tries.find((t) => free(t[0], t[1]));
    const home = spot ? $("#desk") : $("#record");
    // on a desk too short for it, the pad waits in the Records room, left of the record
    if (pad.parentElement !== home) { home.appendChild(pad); home.appendChild($("#vnote")); }
    pad.classList.toggle("in-records", !spot);
    if (spot) setPos(pad, spot[0], spot[1]); else setPos(pad, 24, 64);
  }
  function placeStickers() {
    const u = usable(), w = u.w, pr = $("#printer"), box = boxRect(), mugEl = $('.sticker[data-sticker="mug"]');
    const mugBelow = pr.offsetTop + pr.offsetHeight + 8 + mugEl.offsetHeight <= u.bottom, plan = colPlan();
    const paperBoxes = paperIds().map((id) => { const e = paperEl(id), st = pst(id); if (!e || st.inBox || st.open || st.away || st.x == null) return null; return { x: st.x, y: st.y, w: e.offsetWidth * ui.fit + 8, h: e.offsetHeight * ui.fit + 8 }; }).filter(Boolean);
    const clear = (x, y, ww, hh) => !paperBoxes.some((r) => x < r.x + r.w && r.x < x + ww && y < r.y + r.h && r.y < y + hh);
    let mugAt = mugBelow ? [pr.offsetLeft + pr.offsetWidth - mugEl.offsetWidth, pr.offsetTop + pr.offsetHeight + 8] : [pr.offsetLeft - mugEl.offsetWidth - 12, pr.offsetTop + 6];
    if (plan) mugAt = [plan.honours[0] - 28 - mugEl.offsetWidth, u.bottom - mugEl.offsetHeight - 10];
    mugEl.hidden = !ui.stickers.mug && !clear(mugAt[0], mugAt[1], mugEl.offsetWidth, mugEl.offsetHeight);
    const spots = {
      mug: mugAt,
      pen: [box.x + box.w + 18, u.bottom - 130],
    };
    $$(".sticker", $("#desk")).forEach((el) => {
      const id = el.dataset.sticker;
      if (id === "plant") return;
      const p = ui.stickers[id] || spots[id];
      setPos(el, clamp(p[0], 0, w - EDGE - el.offsetWidth), clamp(p[1], u.top, u.bottom - el.offsetHeight));
    });
    placePlant(); placeNotepad();
    const mug = mugEl, ring = $(".cup-ring");
    if (ring && mug) { ring.hidden = mug.hidden; setPos(ring, clamp(mug.offsetLeft - 48, 0, w - 50), clamp(mug.offsetTop + mug.offsetHeight - 36, u.top, u.bottom - 40)); }
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
    if ($("#passport")) placePassport(+$("#passport").dataset.frame);
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
    const u = usable(), st = pst(el.dataset.id), i = caseIndex(el.dataset.id), left = boxRect().x + boxRect().w + 24, right = u.w - LANE + 40;
    const w = Math.round(clamp(right - left, 440, 900));
    el.style.width = w + "px"; el.style.height = u.bottom - 4 + "px";
    st.x = Math.round(left + Math.max(0, (right - left - w) / 2)); st.y = 4;
    // keep clear of the intercom where it overhangs the desk's top edge
    const ic = $("#intercom"), dk = $("#desk");
    if (ic && dk) { const ir = rectOf(ic), dr = rectOf(dk); if (ir.right - dr.left > st.x && ir.left - dr.left < st.x + w && ir.bottom > dr.top) st.y = Math.round(ir.bottom - dr.top + 24); }
    el.style.height = u.bottom - st.y + "px";
    setPos(el, st.x, st.y);
    st.pages = paginate(i, el); st.page = Math.min(st.page, st.pages.length - 1);
    el.innerHTML = caseInner(i);
    slideAside(el);
  }
  // papers under an open file slide aside to the right, and come back when the last file closes
  function slideAside(open) {
    const r = { x: open.offsetLeft, w: open.offsetWidth }, u = usable();
    ["id", "diploma", "honours"].forEach((id, k) => {
      const e = paperEl(id), st = pst(id);
      if (!e || st.away || st.open) return;
      const w = e.offsetWidth * ui.fit;
      if (st.x + w <= r.x || st.x >= r.x + r.w) return;
      if (!st.aside) st.aside = [st.x, st.y];
      const h = e.offsetHeight * ui.fit;
      st.x = Math.round(Math.max(0, u.w - w - 8 - (2 - k) * 14)); st.y = Math.round(clamp(u.top + k * 36, u.top, u.bottom - h));
      e.classList.add("moving"); setPos(e, st.x, st.y);
    });
  }
  function slideBack() {
    if (paperIds().some((id) => pst(id).open)) return;
    ["id", "diploma", "honours"].forEach((id) => {
      const e = paperEl(id), st = pst(id);
      if (!e || !st.aside) return;
      st.x = st.aside[0]; st.y = st.aside[1]; st.aside = null;
      e.classList.add("moving"); setPos(e, st.x, st.y);
    });
  }
  function openCase(id) {
    const el = paperEl(id), st = pst(id), i = caseIndex(id);
    if (!el || st.open) return;
    hideTag();
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
    hideTag();
    st.open = false; st.page = 0; st.pages = null;
    el.classList.remove("open"); el.setAttribute("aria-expanded", "false"); el.style.width = ""; el.style.height = "";
    el.innerHTML = folderInner(caseIndex(id));
    if (!isPhone() && st.home && !st.inBox) { st.x = st.home[0]; st.y = st.home[1]; el.classList.add("moving"); setPos(el, st.x, st.y); }
    if (!isPhone()) slideBack();
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
    sheet._t = dir > 0 ? 0 : 1;
    peel(sheet, sheet._t);
    return sheet;
  }
  // t = 0: the sheet lies flat; t = 1: it is folded all the way back over the staple. The fold line runs
  // parallel to the bottom-left to top-right diagonal; the lifted corner is mirrored across it to show the back.
  function peel(sheet, t) {
    const W = sheet.offsetWidth, H = sheet.offsetHeight, front = $(".sheet-front", sheet), flap = $(".sheet-back", sheet);
    const poly = (pts, ox, oy) => pts.length > 2 ? "polygon(" + pts.map((q) => Math.round(q[0] + ox) + "px " + Math.round(q[1] + oy) + "px").join(", ") + ")" : "polygon(0 0, 0 0, 0 0)";
    sheet._t = t;
    if (t <= 0) { front.style.clipPath = ""; flap.style.clipPath = "polygon(0 0, 0 0, 0 0)"; return; }
    const a = t * 2 * W, b = t * 2 * H, f = (q) => (W - q[0]) / a + (H - q[1]) / b - 1;
    const cut = (pts, sg) => {
      const out = [];
      pts.forEach((q, k) => {
        const r = pts[(k + 1) % pts.length], fq = sg * f(q), fr = sg * f(r);
        if (fq >= 0) out.push(q);
        if ((fq >= 0) !== (fr >= 0)) { const m = fq / (fq - fr); out.push([q[0] + (r[0] - q[0]) * m, q[1] + (r[1] - q[1]) * m]); }
      });
      return out;
    };
    const box = [[0, 0], [W, 0], [W, H], [0, H]], A = [W - a, H], dx = a, dy = -b, L = dx * dx + dy * dy;
    const mirror = (q) => { const u = ((q[0] - A[0]) * dx + (q[1] - A[1]) * dy) / L, fx = A[0] + u * dx, fy = A[1] + u * dy; return [2 * fx - q[0], 2 * fy - q[1]]; };
    front.style.clipPath = poly(cut(box, 1), 0, 0);
    flap.style.clipPath = poly(cut(box, -1).map(mirror), W, H);
  }
  // steps the peel to a target in short hard steps, like the rest of the desk's motion
  function peelTo(sheet, target, done) {
    const from = sheet._t || 0, n = Math.max(1, Math.round(Math.abs(target - from) * 8));
    for (let k = 1; k <= n; k++) setTimeout(() => peel(sheet, from + (target - from) * k / n), k * 38);
    setTimeout(done, n * 38 + 30);
  }
  function finishSheet(id, sheet, dir, complete) {
    const el = paperEl(id), st = pst(id), i = caseIndex(id), to = st.page + dir;
    const target = complete ? (dir > 0 ? 1 : 0) : (dir > 0 ? 0 : 1);
    peelTo(sheet, target, () => {
      if (complete) st.page = to;
      el.classList.remove("turning");
      el.innerHTML = caseInner(i);
      focusPageControl(el, dir);
    });
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
    const b = (dir > 0 ? $(".corner", el) : $(".pg-back", el)) || $(".corner", el) || $(".pg-back", el);
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
    const bh = box.id === "record" ? Math.max(box.clientHeight, box.scrollHeight) : box.clientHeight;
    y = clamp(y, 0, Math.max(0, bh - Math.min(h, bh)));
    setPos(el, x, y);
    if (el.classList.contains("paper")) { const st = pst(el.dataset.id); st.x = x; st.y = y; st.nudged = null; }
    else if (el.dataset.sticker) ui.stickers[el.dataset.sticker] = [x, y];
    else if (el.id === "slip") ui.slipPos = [x, y];
  }

  // ----- the two desk drawers, Skills and Personal: one drawer sprite, only the front shows until it opens -----
  const DW_FRONT = 16, DW_FLOOR = { x: 14, y: 14, w: 182, h: 122 };
  // Thea's things in the Personal drawer, at their spots on the drawer floor (art pixels)
  const POBJ = {
    bottle: { art: "cola-bottle", x: 20, y: 19, label: "Glass bottle", hint: "Press Enter to nudge it." },
    watch: { art: "watch", x: 40, y: 66, rot: true, label: "Watch, showing your local time", hint: "Press Enter to slow time down." },
    sketchbook: { art: "sketchbook-closed", x: 147, y: 23, label: "Sketchbook", hint: "Press Enter to open it." },
    usb: { art: "usb", x: 18, y: 110, label: "USB stick with a tape label", hint: "Press Enter to plug it in and open Thea's GitHub in a new tab." },
    gum: { art: "gum", x: 76, y: 114, label: "Pack of stick gum", hint: "Press Enter to slide a stick out." },
    mints: { art: "mints-3", x: 162, y: 88, label: "Tin of mints", hint: "Press Enter to take a mint." },
    keycap: { art: "keycap-up", x: 127, y: 108, label: "Keycap fidget toy", hint: "Press Space or Enter to click it." },
  };
  const noteOf = (id) => ((state.effects || []).find((e) => e.id === id) || {}).note || "";
  function pobjHTML(id) {
    const o = POBJ[id], a = ART[o.art];
    return '<span class="pobj p-' + id + (o.rot ? " rot" : "") + '" data-p="' + id + '" data-drag role="button" tabindex="0" aria-label="' + esc(o.label + ". " + o.hint + " Press M to move it between the drawer and the desk.") +
      '" style="--aw:' + a.w + ";--ah:" + a.h + '">' + SPR.art(id === "mints" ? "mints-" + ui.mints : o.art, SC) + (id === "watch" ? '<canvas class="hands" width="' + a.w + '" height="' + a.h + '" aria-hidden="true"></canvas>' : "") +
      (id === "keycap" ? SPR.art("keycap-down", SC, "k-down") : "") + (id === "usb" ? SPR.art("usb-on", SC, "u-on") : "") + (id === "gum" ? SPR.art("gum", SC, "g-stick") : "") + "</span>";
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
      "</div>" + usedInHTML(g) + '<button class="sl-back icon-btn" data-act="card-back" aria-label="Back in the drawer">' + SPR.draw("tobox", 2) + '<span class="ib-tip" aria-hidden="true">Back in the drawer</span></button></div>';
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
    for (let k = 8; k >= 2; k--) if (a.h * k <= vh - 120 && a.w * k <= Math.min(vw * 0.8, 1100)) { sc = k; break; }
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
      const which = ui.dwOpen || ui.dwLast, fr = which && $("#dw-" + which), dr2 = rectOf(desk);
      const cx = fr ? rectOf(fr).left - dr2.left + fr.offsetWidth / 2 : window.innerWidth / 2;
      big.style.left = Math.round(clamp(cx - gm.w / 2, 8, window.innerWidth - gm.w - 8)) + "px";
      big.style.setProperty("--front-h", DW_FRONT * gm.sc + "px");
      big.style.setProperty("--ps", gm.sc);
      big.style.setProperty("--fl-x", 14 * gm.sc + "px"); big.style.setProperty("--fl-y", 14 * gm.sc + "px");
      big.style.setProperty("--fl-w", (182 + gm.extra) * gm.sc + "px"); big.style.setProperty("--fl-h", DW_FLOOR.h * gm.sc + "px");
      $$(".pobj", $("#dw-things")).forEach(placePobj);
    };
    if (DWIMG.complete) apply(); else DWIMG.onload = apply;
    const open = !!ui.dwOpen;
    big.classList.toggle("sliding", !!animate);
    big.classList.toggle("open", open);
    big.dataset.dw = ui.dwOpen || "";
    $$(".dw-floor", big).forEach((f) => { const on = open && f.classList.contains("dw-floor-" + ui.dwOpen); f.hidden = !on; f.inert = !on; });
    pan.classList.toggle("sliding", !!animate);
    // closing: the drawer slides shut into the desk edge while the view stays put, then the view pans back up
    clearTimeout(layoutDrawer.panTimer);
    const panTo = open ? Math.max(0, stage.offsetHeight + gm.h + 84 - window.innerHeight) + "px" : "0px";
    if (!open && animate && !reduced() && parseFloat(pan.style.getPropertyValue("--pan")) > 0) layoutDrawer.panTimer = setTimeout(() => pan.style.setProperty("--pan", "0px"), 270);
    else pan.style.setProperty("--pan", panTo);
  }
  function setDrawer(id) {
    const was = ui.dwOpen;
    if (was === id) return;
    // switching drawers: the open one slides shut first, then the other slides out
    clearTimeout(setDrawer.next);
    if (was && id && !reduced() && !isPhone()) { setDrawer(null); setDrawer.next = setTimeout(() => setDrawer(id), 262); return; }
    ui.dwOpen = id; hideTag();
    if (id) { ui.dwLast = id; markHandled(); say(id === "skills" ? "drawer" : "personal"); }
    FX.play("dwslide");
    layoutDrawer(true);
    // the view pans, so anything pinned to the old position goes
    setTimeout(hideTag, 20); setTimeout(hideTag, reduced() ? 0 : 300);
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
    const ov = $("#sk-lift"), card = ov && $(".sk-lift-card", ov);
    if (card && !ov.hidden && ui.liftCard != null) {
      const g = state.skills[ui.liftCard], p = frontCase();
      $$(".sl-chips .sk", card).forEach((k) => { const sk = k.dataset.s; k.classList.toggle("hot", ui.hot === sk); k.setAttribute("aria-pressed", String(ui.hot === sk)); k.classList.toggle("used", !!(p && uses(p.stack, sk))); });
      const old = $(".sl-note, .sl-used", card);
      if (old) { const t = document.createElement("div"); t.innerHTML = usedInHTML(g); old.replaceWith(t.firstElementChild); }
    }
  }

  // ----- Thea's things: notes, the watch, the bottle and the sketchbook -----
  const noteTurn = {};
  function showNote(el, line) {
    const id = el.dataset.p, lines = (line || noteOf(id)).split("|").map((x) => x.trim()).filter(Boolean);
    if (!lines.length || isPhone()) return;
    noteTurn[id] = ((noteTurn[id] == null ? -1 : noteTurn[id]) + 1) % lines.length;
    theaSpeak(lines[noteTurn[id]]);
  }
  // Thea says a line in her speech bubble: typed out a few letters at a time with a small talking blip,
  // her mouth opening and closing in the booth window and her shoulders bobbing a pixel as she talks
  function theaSpeak(said, holdMs, away) {
    if (!said || isPhone()) return;
    let b = $("#thea-say");
    if (!b) {
      b = document.createElement("div"); b.id = "thea-say"; b.className = "thea-say"; b.setAttribute("role", "status");
      b.innerHTML = '<span class="ts-face" aria-hidden="true">' + SPR.applicant(state.profile.applicant || "thea", 1, "") + '</span><p class="ts-text"></p>';
      fixedRoot.appendChild(b);
    }
    const tx = $(".ts-text", b), win = $(".window");
    clearInterval(theaSpeak.typer); clearTimeout(theaSpeak.hide);
    const done = () => { if (win) win.classList.remove("talking", "mouth-open", "bob"); if (holdMs) theaSpeak.hide = setTimeout(() => { b.hidden = true; }, holdMs); };
    if (reduced()) { tx.textContent = said; done(); }
    else {
      let i = 0, beat = 0;
      tx.textContent = ""; tx.style.minWidth = Math.min(380, said.length * 8) + "px";
      if (win) win.classList.add("talking");
      theaSpeak.typer = setInterval(() => {
        i = Math.min(said.length, i + 2); tx.textContent = said.slice(0, i);
        if (i % 4 === 0 && /\w/.test(said[i - 1] || "")) FX.play("talk");
        // the mouth opens on letters and shuts on spaces and stops; a bob every few beats
        beat++;
        if (win) { win.classList.toggle("mouth-open", /\w/.test(said[i - 1] || "") && beat % 2 === 0); if (beat % 4 === 0) win.classList.toggle("bob"); }
        if (i >= said.length) { clearInterval(theaSpeak.typer); tx.style.minWidth = ""; done(); }
      }, 34);
    }
    // "away": the view is about to leave the booth, so she speaks from her own corner with her face beside the line
    const ww = $(".window-wrap"), wr = ww ? rectOf(ww) : null, inView = !away && !ui.wall && wr && wr.bottom > 40 && wr.top >= -4;
    b.classList.toggle("own", !inView);
    b.hidden = false;
    if (inView) { b.style.left = Math.round(wr.right + 14) + "px"; b.style.top = Math.round(wr.top + 26) + "px"; }
    else { b.style.left = "16px"; b.style.top = "16px"; }
    b.classList.remove("pop"); void b.offsetWidth; b.classList.add("pop");
  }
  function hideNote() { const b = $("#thea-say"); if (b) b.hidden = true; const n = $("#pnote"); if (n) n.hidden = true; }
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
    if (id === "keycap") return; // pressed on pointer down and key down, see keyPress
    if (id === "mints") {
      if (ui.mints === 0) { showNote(el, "Out of mints."); FX.play("tin"); return; }
      ui.mints -= 1; FX.play("tin");
      const img = $(".art", el); img.src = ART["mints-" + ui.mints].src;
      showNote(el);
      return;
    }
    showNote(el);
    if (id === "usb") {
      const url = ((state.profile.links || []).find((l) => /github\.com/i.test(l.url || "")) || {}).url || "https://github.com/delete-th";
      FX.play("usbclick");
      const go = () => { el.classList.remove("lit"); window.open(safeUrl(url), "_blank", "noopener"); };
      if (reduced()) { el.classList.add("lit"); setTimeout(go, 250); return; }
      [0, 100, 200, 300, 400, 500].forEach((ms, k) => setTimeout(() => el.classList.toggle("lit", k % 2 === 0), ms));
      setTimeout(go, 620);
      return;
    }
    if (id === "gum") {
      FX.play("rustle");
      if (reduced()) return;
      el.classList.remove("slide"); void el.offsetWidth; el.classList.add("slide");
      setTimeout(() => el.classList.remove("slide"), 360);
      return;
    }
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
  function keyPress(el, down) {
    if (!el) return;
    if (down) { if (!el.classList.contains("pressed")) FX.play("keyclack"); el.classList.add("pressed"); }
    else el.classList.remove("pressed");
  }
  const pobjFloor = () => $('#dw-big.open[data-dw="personal"] .dw-floor-personal');
  function carryScale(overDrawer) { return overDrawer ? dwGeom().sc : SC; }
  function carryStart(d, ev) {
    const el = d.el, r = rectOf(el), s0 = parseFloat(getComputedStyle(el).getPropertyValue("--sprite-scale")) || SC;
    d.carry = { grab: [(ev.clientX - r.left) / s0, (ev.clientY - r.top) / s0], s: s0 };
    hideNote();
    el.classList.add("carried");
    el.style.setProperty("--sprite-scale", s0);
    fixedRoot.appendChild(el);
    carryMove(d, ev);
  }
  function carryMove(d, ev) {
    const el = d.el, fl = pobjFloor(), over = !!(fl && inside(rectOf(fl), ev.clientX, ev.clientY)), s = carryScale(over);
    if (s !== d.carry.s) { d.carry.s = s; el.style.setProperty("--sprite-scale", s); }
    // the watch lies sideways in the drawer and upright on the desk
    if (el.dataset.p === "watch") el.classList.toggle("rot", over);
    el.style.left = Math.round(ev.clientX - d.carry.grab[0] * s) + "px";
    el.style.top = Math.round(ev.clientY - d.carry.grab[1] * s) + "px";
  }
  function carryDrop(d, ev) {
    const el = d.el, fl = pobjFloor(), r = rectOf(el);
    el.classList.remove("carried"); el.style.removeProperty("--sprite-scale");
    if (fl && inside(rectOf(fl), ev.clientX, ev.clientY)) {
      const hr = rectOf(fl), sc = dwGeom().sc;
      pobjHome(el);
      (ui.pobjAt = ui.pobjAt || {})[el.dataset.p] = [(r.left - hr.left) / sc, (r.top - hr.top) / sc];
      placePobj(el); FX.play("tap"); return;
    }
    // only the visible slice of each closed front counts (the fronts are cropped to fit the desk edge)
    const fronts = $$(".dw:not(.pulled)").map((w) => { const q = rectOf($(".dw-front", w)), cr = parseFloat(getComputedStyle(w).getPropertyValue("--crop")) || 0; return { left: q.left + cr, right: q.right - cr, top: q.top, bottom: q.bottom }; });
    const overFront = fronts.some((q) => ev.clientX > q.left && ev.clientX < q.right && ev.clientY > q.top && ev.clientY < q.bottom);
    const dkr = rectOf($("#desk")), stripTop = dkr.top + usable().bottom;
    const underFronts = !pobjFloor() && (ev.clientY > stripTop || fronts.some((q) => r.bottom > q.top + 8 && r.top < q.bottom && r.right > q.left && r.left < q.right));
    if (overFront || underFronts) {
      if (ui.pobjAt) delete ui.pobjAt[el.dataset.p];
      pobjHome(el); FX.play("dwslide"); return;
    }
    const dk = rectOf($("#desk"));
    pobjToDesk(el, r.left - dk.left, r.top - dk.top);
    FX.play("tap");
  }
  function pobjToDesk(el, x, y) {
    const desk = $("#desk");
    el.classList.remove("rot"); el.classList.add("sticker", "on-desk");
    el.dataset.sticker = el.dataset.p;
    desk.appendChild(el);
    moveTo(el, x, Math.min(y, usable().bottom - el.offsetHeight)); raise(el); drawHands();
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
    const id = el.dataset.p, o = POBJ[id];
    if (isPhone()) return;
    const gm = dwGeom(), at = (ui.pobjAt || {})[id];
    if (at) {
      const fw = (DW_FLOOR.w + gm.extra) * gm.sc, fh = DW_FLOOR.h * gm.sc;
      el.style.left = clamp(Math.round(at[0] * gm.sc), 0, Math.max(0, fw - el.offsetWidth)) + "px";
      el.style.top = clamp(Math.round(at[1] * gm.sc), 0, Math.max(0, fh - el.offsetHeight)) + "px";
      return;
    }
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
    const side = !!$("#intro") && !isPhone() && !!ui.ppVis;
    bar.classList.toggle("side", side);
    if (side) {
      const d = rectOf(dock), v = ui.ppVis, w = bar.offsetWidth, h = bar.offsetHeight;
      const left = Math.min(window.innerWidth - w - 16, v.right + 24), mid = (v.top + v.bottom) / 2;
      bar.style.left = Math.round(left - d.left) + "px";
      bar.style.bottom = Math.round(d.bottom - clamp(mid + h / 2, h + 8, window.innerHeight - 80)) + "px";
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
    $("#stamp-status").textContent = (kind === "approved" ? "Approved" : "Denied") + " stamp pressed on the " + (key === "visa" ? "visa" : key === "id" ? "ID card" : key === "diploma" ? "diploma" : "entry record") + ".";
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
    const itr = $("#intro"); if (itr) itr.classList.add("stamped");
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
  // The light comes on and a sheet rises out of the slot two art pixels at a time while the printer sounds.
  // Then it tears at the slot, slides off to the right as the view pans to Records, and the printer goes dark.
  function printRecord() {
    if (ui.printing) return;
    // in the Records room the printer up there prints it; on the desk, the desk printer does and the view pans over
    const inRecords = !isPhone() && ui.room === 1, pr = inRecords ? $(".rec-printer") : $("#printer"), paper = pr && $(".pr-paper", pr);
    say("record");
    if (isPhone() || reduced() || !pr || !paper) { FX.play("print"); landRecord(false); if (isPhone()) scrollToRecord("auto"); else goRoom(1); return; }
    ui.printing = true;
    // the sheet rises 18 art pixels, or less when the printer sits near the top of the screen
    const ART_PX = 4, step = 2, tick = 80, room = rectOf(pr).top + 28 - 4, steps = clamp(Math.floor(room / (step * ART_PX)), 4, 9);
    paper.className = "pr-paper"; paper.style.setProperty("--rise", "0px");
    pr.classList.add("on");
    FX.play("print");
    for (let k = 1; k <= steps; k++) setTimeout(() => { paper.style.setProperty("--rise", k * step * ART_PX + "px"); }, k * tick);
    const torn = steps * tick + 160;
    setTimeout(() => { paper.classList.add("tear"); FX.play("lift"); }, torn);
    setTimeout(() => {
      pr.classList.remove("on");
      if (!inRecords) { paper.classList.add("off"); return; }
      const rc = receiptEl(), pp = rectOf(paper), rr = rc && !rc.hidden ? rectOf(rc) : null;
      // fall to the record's top centre
      const fall = rr ? Math.max(40, rr.top + 24 - pp.top) : 240;
      paper.style.setProperty("--fall", Math.round(fall) + "px");
      paper.classList.add("drop");
      if (rc) rc.classList.add("cleared");
    }, torn + tick);
    if (!inRecords) setTimeout(() => goRoom(1, true), torn + tick + 60);
    setTimeout(() => {
      if (inRecords) { paper.style.visibility = "hidden"; const rc = receiptEl(); if (rc) rc.classList.remove("cleared"); }
      landRecord(true, inRecords);
      setTimeout(() => { updateBar(); const r = receiptEl(); if (r) r.focus({ preventScroll: true }); }, 380);
    }, torn + (inRecords ? tick + 200 : 700));
    setTimeout(() => { paper.className = "pr-paper"; paper.style.visibility = ""; paper.style.setProperty("--rise", "0px"); ui.printing = false; }, torn + 900);
  }
  function scrollToRecord(how) {
    const r = $("#record"), rc = receiptEl();
    if (!r) return;
    let top = docTop(r);
    const box = rc && !rc.hidden ? $(".stamp-box", rc) : null;
    if (box) top = Math.max(top, docTop(box) + box.offsetHeight - (trayTopOpen() - 16) + 8);
    window.scrollTo({ top: top, behavior: how === "smooth" && !reduced() ? "smooth" : "auto" });
  }
  function landRecord(animate, fromAbove) {
    const r = receiptEl(), empty = $("#record-empty");
    ui.printed = true;
    if (empty) empty.remove();
    if (!r) return;
    r.hidden = false;
    $$('.record-intro [data-act="print"]', $("#record")).forEach((b) => { b.textContent = "Print it again"; });
    renderMarks("record");
    r.classList.remove("landing", "feeding-down");
    if (animate && !reduced()) { void r.offsetWidth; r.classList.add(fromAbove ? "feeding-down" : "landing"); FX.play("settle"); }
    updateBar(); updatePill();
  }
  function setTear(v) { ui.torn = v; const r = receiptEl(); if (r) r.style.setProperty("--tear", v); }
  // once torn, the slip lies loose in the whole Records room (on a phone it stays in the column)
  function slipHome() { return isPhone() ? $("#record-area") : $("#record"); }
  // Tearing off the slip: it comes away, slides to the middle of the screen and becomes the contact screen.
  function tearOff() {
    if (ui.slipTorn) return;
    const slip = $("#slip"), r = receiptEl(), area = $("#record-area");
    ui.slipTorn = true; FX.play("tear");
    r.classList.add("torn"); $("#perf").remove();
    slip.classList.add("loose");
    slip.dataset.drag = ""; slip.tabIndex = 0;
    slip.setAttribute("role", "button"); slip.setAttribute("aria-label", "Contact slip. Press Enter to open the contact screen.");
    const home = slipHome() || area, rr = rectOf(r);
    home.appendChild(slip);
    if (!isPhone()) { const hr = rectOf(home); moveTo(slip, rr.right - hr.left + home.scrollLeft + 28, Math.max(0, rr.bottom - hr.top + home.scrollTop - slip.offsetHeight - 10)); }
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
  // buttons on the computer's screen beep: Send chirps, closing the browser is a lower blip
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest && ev.target.closest(".cm-screen button, .cm-screen a");
    if (!b) return;
    FX.play(b.id === "cm-send" || b.classList.contains("cm-send") ? "chirp" : b.matches(".br-x, [data-act=br-close]") ? "boop" : "beep");
  }, true);
  function fitContact(w, h) {
    const c = $("#cm-content");
    c.style.transform = ""; c.style.width = w + "px"; c.style.height = "";
    const k = Math.min(1, h / c.scrollHeight);
    // shrink to fit the height, with the width widened by the same amount so it still fills the screen exactly
    if (k < 1) { c.style.width = w / k + "px"; c.style.transform = "scale(" + k + ")"; c.style.height = h / k + "px"; }
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

  // ----- the walk-in: the visitor calls "Next applicant.", Thea walks up behind the glass, holds up her passport and slides it into the tray -----
  // The booth scene is 111x71 art pixels: glass x 10 to 100, y 5 to 55; the counter's top edge at y 56; the tray recess under the glass.
  // Layers, back to front: sky and skyline, Thea, the glass reflections, the frame and counter, the tray.
  // Thea is drawn at two thirds of the scene's scale (scene 9x / her 6x, 6x / 4x, or 3x / 2x), so she reads as a step back from the glass.
  let walk = null;
  function walkIn() {
    let seen = false;
    try { seen = sessionStorage.getItem("cvp-walkin") === "1"; } catch (err) { /* storage can be blocked */ }
    if (seen || !$("#intro")) return;
    try { sessionStorage.setItem("cvp-walkin", "1"); } catch (err) { /* storage can be blocked */ }
    // reduced motion: straight to the passport on the desk
    if (reduced()) return;
    const sayEl = $("#say"); if (sayEl) sayEl.textContent = "Click the passport to open it.";
    const a = ART["booth-scene"], fit = Math.floor(Math.min((window.innerWidth - 32) / a.w, (window.innerHeight - 96) / a.h));
    const S = Math.max(3, Math.min(9, fit - (fit % 3))), T = (S / 3) * 2, P = (v) => Math.round(v * S) + "px";
    const el = document.createElement("div");
    el.className = "walkin"; el.id = "walkin";
    el.innerHTML = '<div class="wk-stage sky-' + dayPhase() + '" style="width:' + P(a.w) + ";height:" + P(a.h) + '">' +
      SPR.art("booth-scene", S, "wk-scene", "Inside the booth, looking out through the window") +
      '<img class="wk-thea" alt="" aria-hidden="true" draggable="false" hidden>' +
      SPR.art("booth-glare", S, "wk-glare") + SPR.art("booth-front", S, "wk-front") +
      '<span class="wk-tray" style="left:' + P(42) + ";top:" + P(56) + '">' + SPR.art("tray-open", S, "wk-t-open") + SPR.art("tray-passport", S, "wk-t-pass") + SPR.art("tray-closed", S, "wk-t-closed") + "</span></div>" +
      '<p class="wk-call" aria-live="polite" hidden>Next applicant.</p>' +
      '<button class="btn-quiet wk-skip" data-act="walkin-skip">Skip intro</button>';
    fixedRoot.appendChild(el); el.style.setProperty("--wk-s", S);
    const img = $(".wk-thea", el), tray = $(".wk-tray", el), call = $(".wk-call", el);
    // her hair top sits about 8% of the glass height under its top edge; the held passport (her art rows 50 to 66)
    // then ends a little over 2 scene pixels above the counter's top edge
    // she stands low enough that the bottom edge of every frame (the walk frames end at her art row 64, the hold frame at 65)
    // is hidden behind the counter top (scene row 56)
    const top = Math.round(56 * S - 63 * T), cx = 56 * S;
    const show = (name, x) => {
      const sp = ART[name]; img.src = sp.src; img.width = sp.w * T; img.height = sp.h * T;
      img.style.left = Math.round(x) + "px"; img.style.top = top + "px"; img.hidden = false;
    };
    // centred on the glass: the middle of her figure (art x 27) over the middle of the glass
    const X = cx - 27 * T;
    const trayState = (st) => { tray.dataset.st = st; };
    trayState("open");
    walk = { el: el, timers: [] };
    const at = (ms, fn) => walk.timers.push(setTimeout(fn, ms));
    // 1. the empty booth; 2. the visitor calls her in, from their side of the counter
    at(800, () => { call.hidden = false; call.classList.add("up"); FX.play("chime"); });
    at(2000, () => { call.classList.remove("up"); call.classList.add("away"); });
    at(2300, () => { call.hidden = true; });
    // 3. she walks in from the left, two frames 160ms apart, over about 1.8s
    const t0 = 2000, dur = 1800, x0 = 10 * S - 57 * T;
    for (let t = 0; t <= dur; t += 80) at(t0 + t, () => { show(Math.floor(t / 160) % 2 ? "thea-walk-1" : "thea-walk-0", x0 + (X - x0) * Math.min(1, t / dur)); if (t % 320 === 0) FX.play("step"); });
    // 4. turn, 5. hold up the passport, 6. push it through under the glass
    at(t0 + dur + 80, () => show("thea-turn", X));
    at(t0 + dur + 480, () => { show("thea-hold", X); FX.play("rustle"); });
    at(t0 + dur + 1380, () => show("thea-push", X));
    at(t0 + dur + 1630, () => { trayState("pass"); FX.play("tap"); });
    at(t0 + dur + 2130, () => { trayState("closed"); tray.classList.add("shut"); FX.play("clunk"); });
    // 7. the camera tilts down to the desk, where the closed passport lands
    at(t0 + dur + 2450, () => { el.classList.add("tilt"); const pp = $("#passport"); if (pp) { pp.classList.remove("drop-in"); void pp.offsetWidth; pp.classList.add("drop-in"); } });
    at(t0 + dur + 2950, () => walkDone(true));
    document.addEventListener("keydown", walkKey, true);
    document.addEventListener("pointerdown", walkPoint, true);
  }
  function walkKey(ev) { if (!walk) return; ev.preventDefault(); ev.stopPropagation(); walkDone(); }
  function walkPoint(ev) {
    if (!walk) return;
    ev.preventDefault(); ev.stopPropagation();
    // the click that ends the walk-in does nothing else
    const eat = (e) => { e.stopPropagation(); e.preventDefault(); document.removeEventListener("click", eat, true); };
    document.addEventListener("click", eat, true); setTimeout(() => document.removeEventListener("click", eat, true), 400);
    walkDone();
  }
  function walkDone(natural) {
    if (!walk) return;
    walk.timers.forEach(clearTimeout);
    walk.el.remove(); walk = null;
    document.removeEventListener("keydown", walkKey, true);
    document.removeEventListener("pointerdown", walkPoint, true);
    const pp = $("#passport"); if (pp) { if (!natural) pp.classList.remove("drop-in"); pp.focus({ preventScroll: true }); }
  }

  // ----- the whiteboard on the wall above the desk -----
  // The board sprite is 106x84 art pixels: writing surface x 7 to 96, y 12 to 69; the marker tray along y 71 to 79.
  // The board shows only the switch, the title, the example line, six numbered steps and one step note;
  // the magnets, markers and eraser are small things at 2x.
  const WB = () => state.whiteboard || { modes: [] };
  const TOOL = 2;
  const wbModeOf = () => WB().modes.find((x) => x.id === ui.wbMode) || WB().modes[0];
  const caseByName = (n) => { const i = state.projects.findIndex((x) => x.name.toLowerCase().startsWith(String(n || "").toLowerCase())); return i < 0 ? null : "case-" + i; };
  // a hand-drawn circle: two loose strokes that do not quite meet
  const ringSVG = '<svg class="wb-ring" viewBox="0 0 40 40" aria-hidden="true"><path d="M21 4 C31 4 37 11 36 21 C35 31 27 36 19 36 C10 35 4 28 4 19 C5 10 12 5 23 6"/></svg>';
  function wallHTML() {
    const w = WB();
    return '<div class="wall-pan"><div class="wb" id="wb">' + SPR.art("whiteboard", 1, "wb-art", "") +
      '<div class="wb-surface"><div class="wb-mags" role="group" aria-label="Switch the board">' +
      w.modes.map((md, i) => '<button class="wb-mag" data-act="wb-mode" data-m="' + md.id + '" aria-pressed="false">' + SPR.art(i ? "magnet-red" : "magnet-green", TOOL, "wb-mag-art") + "<span>" + esc(md.label) + "</span></button>").join("") +
      '</div><p class="wb-title wb-i" id="wb-title"></p><p class="wb-eg wb-i" id="wb-eg"></p>' +
      '<div class="wb-steps" id="wb-steps" role="group" aria-label="Steps"></div></div>' +
      '<div class="wb-pin" id="wb-pin" role="note" aria-live="polite" hidden></div>' +
      '<span class="wb-tray" aria-hidden="true">' + SPR.art("marker-black", TOOL, "wb-mk wb-mk-1") + SPR.art("marker-blue", TOOL, "wb-mk wb-mk-2") + SPR.art("marker-red", TOOL, "wb-mk wb-mk-3") + "</span>" +
      '<button class="wb-eraser" data-act="wb-erase" aria-label="Eraser: rub out the board. Drag it across the board, or press Enter.">' + SPR.art("eraser", TOOL, "wb-er-art") + "</button>" +
      "</div></div>" +
      '<span class="wall-strip" aria-hidden="true" style="background-image: url(' + ART["wall-strip-fill"].src + ')"></span>';
  }
  function wallEl() {
    let w = $("#wall");
    if (w) return w;
    w = document.createElement("div");
    w.id = "wall"; w.className = "wall"; w.setAttribute("role", "region"); w.setAttribute("aria-label", "Whiteboard");
    w.inert = true;
    w.innerHTML = wallHTML();
    fixedRoot.prepend(w);
    ui.wbMode = ui.wbMode || (WB().modes[0] || {}).id;
    sizeWall(); wbDraw(false, true);
    return w;
  }
  // the board at about three quarters of the wall's width (at most about 920px), at a whole-number scale,
  // centred over the desk-edge strip; on a short screen it grows to keep the writing at its size
  function sizeWall() {
    const w = $("#wall"); if (!w) return;
    const a = ART.whiteboard, ss = window.innerHeight < 760 ? 2 : 3, strip = isPhone() ? 0 : 42 * ss;
    const byW = isPhone() ? (window.innerWidth - 24) / a.w : Math.min(window.innerWidth * 0.8, 1000) / a.w;
    const k = clamp(Math.floor(Math.min(byW, (window.innerHeight - strip - (isPhone() ? 120 : 16)) / a.h)), 3, 12);
    const wb = $("#wb", w), img = $(".wb-art", wb);
    w.style.setProperty("--k", k); w.style.setProperty("--ss", ss);
    img.width = a.w * k; img.height = a.h * k;
    wb.style.width = a.w * k + "px"; wb.style.height = a.h * k + "px";
    wb.style.left = Math.round((window.innerWidth - a.w * k) / 2) + "px";
    wb.style.top = Math.max(8, Math.round((window.innerHeight - strip - (isPhone() ? 90 : 0) - a.h * k) / 2)) + "px";
  }
  function openWall(fromCase) {
    if (ui.wall || ui.view !== "desk" || $("#intro") || editing) return;
    const from = typeof fromCase === "string" ? fromCase : null;
    if (from !== (ui.wbFrom || null) || from) {
      ui.wbFrom = from;
      if (from) { const pr = state.projects[caseIndex(from)]; ui.wbMode = boardFor(pr) || ui.wbMode; ui.wbFromMode = ui.wbMode; }
      if ($("#wall") && ui.wbShown) wbDraw(false);
    }
    if (ui.dwOpen) setDrawer(null);
    const go = () => {
      const w = wallEl();
      ui.wall = true; hideTag(); hideNote(); sizeWall();
      w.inert = false; void w.offsetWidth;
      document.documentElement.classList.add("on-wall");
      const site = $(".site"); if (site) site.inert = true;
      FX.play("dwslide"); updatePill();
      setTimeout(() => {
        if (!ui.wbShown) { ui.wbShown = true; wbDraw(true); }
        const m = $(".wb-step.sel") || $(".wb-step"); if (m) m.focus({ preventScroll: true });
      }, reduced() ? 0 : 1000);
    };
    if (ui.room !== 0 && !isPhone()) { goRoom(0, true); setTimeout(go, reduced() ? 0 : 470); } else go();
  }
  function closeWall() {
    if (!ui.wall) return;
    ui.wall = false;
    document.documentElement.classList.remove("on-wall");
    const site = $(".site"); if (site) site.inert = false;
    const w = $("#wall"); if (w) w.inert = true;
    FX.play("dwslide"); updatePill();
    setTimeout(() => { const b = $(".desk-marker:not([hidden])") || $(".peek-btn"); if (b && !isPhone() && !ui.wbBackTo) b.focus({ preventScroll: true }); }, reduced() ? 0 : 620);
  }
  // write the current mode on the board: each piece appears in turn, about 80ms apart, like it is being written
  function wbDraw(animate, quiet) {
    const md = wbModeOf(); if (!md) return;
    $$(".wb-mag").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.m === md.id)));
    $("#wb-title").textContent = md.title;
    $("#wb-eg").textContent = "e.g. " + wbCaseName(md);
    $("#wb-steps").innerHTML = md.steps.map((st, i) => '<button class="wb-step wb-i" data-act="wb-step" data-i="' + i + '" aria-pressed="false"><span class="wb-num">' + ringSVG + "<b>" + (i + 1) + '</b></span><span class="wb-name">' + esc(st.t) + "</span></button>").join("");
    // step 1 is chosen when the board is first written, so the note is never empty
    wbSelect(0, true);
    const items = [$("#wb-title"), $("#wb-eg")].concat($$("#wb-steps .wb-i"));
    const pin = $("#wb-pin");
    if (!animate || reduced()) { items.forEach((x) => x.classList.add("on")); if (pin) pin.classList.add("on"); return; }
    items.forEach((x) => x.classList.remove("on")); if (pin) pin.classList.remove("on");
    items.forEach((x, n) => setTimeout(() => { x.classList.add("on"); if (n % 2 === 0) FX.play("marker"); }, 60 + n * 80));
    setTimeout(() => { if (pin) { pin.classList.add("on"); FX.play("peel"); } }, 60 + items.length * 80 + 120);
  }
  // which board a project belongs on: "lead" in its role opens the team lead board, any other role the solo board
  function boardFor(p) { const r = String((p && p.role) || "").trim(); return !r ? null : /lead/i.test(r) ? "lead" : "solo"; }
  const wbFromCase = (md) => (ui.wbFrom && ui.wbFromMode === md.id ? ui.wbFrom : null);
  const wbCaseName = (md) => { const c = wbFromCase(md); return c ? shortName(state.projects[caseIndex(c)]) : md.case; };
  // drawing order: title, example, then the steps
  function wbRank(x) { return x.id === "wb-title" ? 0 : x.id === "wb-eg" ? 1 : 2 + +(x.dataset.i || 0); }
  function wbMode(id) {
    if (id === ui.wbMode && ui.wbShown) return;
    ui.wbMode = id;
    wbWipe(() => wbDraw(true));
  }
  // the eraser sweeps across the board in two-frame strokes, and whatever it passes is gone
  function wbWipe(then) {
    const wb = $("#wb"); if (!wb) return;
    const pin = $("#wb-pin");
    if (reduced()) { $$(".wb-i", wb).forEach((x) => x.classList.remove("on")); then && then(); return; }
    const k = TOOL, sr = rectOf($(".wb-surface", wb)), wr = rectOf(wb);
    const er = document.createElement("img"); er.className = "wb-wiper"; er.alt = ""; er.setAttribute("aria-hidden", "true");
    wb.appendChild(er);
    if (pin) pin.classList.remove("on");
    const steps = 12, rows = [0.2, 0.45, 0.75];
    FX.play("wipe");
    let n = 0;
    const tick = () => {
      const row = rows[Math.floor(n / steps)], j = n % steps, ltr = Math.floor(n / steps) % 2 === 0, f = ltr ? j / (steps - 1) : 1 - j / (steps - 1);
      const sp = ART[n % 2 ? "eraser-wipe-r" : "eraser-wipe-l"];
      er.src = sp.src; er.width = sp.w * k; er.height = sp.h * k;
      const x = sr.left - wr.left + f * (sr.width - sp.w * k), y = sr.top - wr.top + row * sr.height - (sp.h * k) / 2;
      er.style.left = Math.round(x) + "px"; er.style.top = Math.round(y) + "px";
      const ex = wr.left + x + (sp.w * k) / 2;
      $$(".wb-i.on", wb).forEach((it) => { const r = rectOf(it), cx = r.left + r.width / 2, cy = r.top + r.height / 2; if (Math.abs(cy - (wr.top + y + (sp.h * k) / 2)) < sr.height * 0.2 && (ltr ? cx < ex : cx > ex)) it.classList.remove("on"); });
      n++;
      if (n < steps * rows.length) setTimeout(tick, 35);
      else { $$(".wb-i", wb).forEach((x2) => x2.classList.remove("on")); er.remove(); setTimeout(() => then && then(), 120); }
    };
    tick();
  }
  // choosing a step: its name in blue marker, underlined, and its note pinned to the board's top-right corner;
  // choosing it again (or Esc) takes the note down
  function wbSelect(i, quiet) {
    const md = wbModeOf(), pin = $("#wb-pin"); if (!md || !pin) return;
    if (i != null && i === ui.wbSel && !quiet && !pin.hidden) i = null;
    ui.wbSel = i;
    $$(".wb-step").forEach((b) => { const on = i != null && +b.dataset.i === i; b.classList.toggle("sel", on); b.setAttribute("aria-pressed", String(on)); });
    if (i == null) { pin.hidden = true; if (!quiet) FX.play("peel"); return; }
    const st = md.steps[i], fromCase = wbFromCase(md), id = fromCase || caseByName(md.case);
    pin.innerHTML = '<b class="wbp-h">' + (i + 1) + ". " + esc(st.t) + '</b><p class="wbp-n">' + esc(st.n) + "</p>" +
      (st.x ? '<p class="wbp-x"><b>' + esc(st.x.label) + "</b> " + esc(st.x.text) + "</p>" : "") +
      (id ? (fromCase ? '<button class="wbp-case" data-act="wb-back" data-id="' + id + '">Back to the ' + esc(wbCaseName(md)) + " file ↓</button>"
        : '<button class="wbp-case" data-act="wb-case" data-id="' + id + '">Open the ' + esc(md.case) + " file ↓</button>") : "");
    pin.hidden = false;
    if (!quiet) { FX.play("peel"); pin.classList.remove("swap"); void pin.offsetWidth; pin.classList.add("swap", "on"); }
  }
  // the step note stands in for the old pop-up card (Esc and closing the wall take it down)
  function wbCard(i) { if (i == null) wbSelect(null, true); }
  // picking up the eraser: rub out whatever it passes over; the board writes itself back a moment after it is put down
  let rub = null;
  document.addEventListener("pointerdown", (ev) => {
    const b = ev.target.closest && ev.target.closest(".wb-eraser");
    if (!b || !ui.wall || ev.button !== 0) return;
    ev.preventDefault();
    const k = TOOL, er = document.createElement("img");
    er.className = "wb-held"; er.alt = ""; er.setAttribute("aria-hidden", "true");
    fixedRoot.appendChild(er);
    rub = { er: er, k: k, x: ev.clientX, moved: false, f: 0, id: ev.pointerId, b: b };
    b.classList.add("lifted");
    rubMove(ev);
  });
  function rubMove(ev) {
    const s = ART[rub.f % 2 ? "eraser-wipe-r" : "eraser-wipe-l"], w = s.w * rub.k, h = s.h * rub.k;
    rub.er.src = s.src; rub.er.width = w; rub.er.height = h;
    rub.er.style.left = Math.round(ev.clientX - w / 2) + "px"; rub.er.style.top = Math.round(ev.clientY - h / 2) + "px";
    const r = { left: ev.clientX - w / 2, right: ev.clientX + w / 2, top: ev.clientY - h / 2, bottom: ev.clientY + h / 2 };
    $$("#wb .wb-i.on").forEach((it) => { const q = rectOf(it); if (q.left < r.right && r.left < q.right && q.top < r.bottom && r.top < q.bottom) { it.classList.remove("on"); it.classList.add("rubbed"); } });
  }
  document.addEventListener("pointermove", (ev) => {
    if (!rub || ev.pointerId !== rub.id) return;
    if (Math.abs(ev.clientX - rub.x) > 6) { rub.f++; rub.x = ev.clientX; rub.moved = true; FX.play("wipe-soft"); }
    rubMove(ev);
  });
  document.addEventListener("pointerup", (ev) => {
    if (!rub || ev.pointerId !== rub.id) return;
    const r = rub; rub = null;
    r.er.remove(); r.b.classList.remove("lifted");
    if (!r.moved) return;
    swallowNextClick();
    setTimeout(() => {
      const back = $$("#wb .wb-i.rubbed").sort((x, y) => wbRank(x) - wbRank(y));
      back.forEach((x, n) => setTimeout(() => { x.classList.remove("rubbed"); x.classList.add("on"); if (n % 2 === 0) FX.play("marker"); }, n * 60));
    }, 900);
  });
  function swallowNextClick() {
    const eat = (e) => { e.stopPropagation(); e.preventDefault(); document.removeEventListener("click", eat, true); };
    document.addEventListener("click", eat, true); setTimeout(() => document.removeEventListener("click", eat, true), 300);
  }

  // ----- the blue marker on the desk: putting it back in the board's tray takes you up to the board -----
  let markerDrag = null, markerDragged = false;
  function markerSlot() { return rectOf($(".pk-blue")); }
  function markerHome(btn, fromDrag) {
    if (ui.markerBack || !btn) { openWall(); return; }
    const r = rectOf(btn), t = markerSlot();
    const done = () => {
      ui.markerBack = true; document.documentElement.classList.add("marker-back");
      btn.hidden = true; btn.style.translate = ""; btn.classList.remove("sliding", "held");
      FX.play("usbclick");
      setTimeout(() => openWall(), reduced() ? 0 : 180);
    };
    if (reduced()) { done(); return; }
    const dx = t.left - r.left + (fromDrag ? fromDrag[0] : 0), dy = t.top - r.top + (fromDrag ? fromDrag[1] : 0);
    btn.classList.add("sliding");
    btn.style.translate = Math.round(dx) + "px " + Math.round(dy) + "px";
    setTimeout(done, 260);
  }
  document.addEventListener("pointerdown", (ev) => {
    const b = ev.target.closest && ev.target.closest(".desk-marker");
    if (!b || ev.button !== 0 || ui.markerBack) return;
    markerDrag = { b: b, x: ev.clientX, y: ev.clientY, id: ev.pointerId, moved: false };
  });
  document.addEventListener("pointermove", (ev) => {
    const d = markerDrag; if (!d || ev.pointerId !== d.id) return;
    const dx = ev.clientX - d.x, dy = ev.clientY - d.y;
    if (!d.moved && Math.hypot(dx, dy) < 5) return;
    if (!d.moved) { d.moved = true; d.b.classList.add("held"); hideTag(); }
    d.b.style.translate = Math.round(dx) + "px " + Math.round(dy) + "px";
  });
  document.addEventListener("pointerup", (ev) => {
    const d = markerDrag; if (!d || ev.pointerId !== d.id) return;
    markerDrag = null;
    if (!d.moved) return;
    markerDragged = true; setTimeout(() => { markerDragged = false; }, 300);
    const r = rectOf(d.b), t = markerSlot(), pk = rectOf($(".peek-btn")), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const near = Math.hypot(cx - (t.left + t.width / 2), cy - (t.top + t.height / 2)) < 60 + t.width / 2 || (cx > pk.left && cx < pk.right && cy > pk.top && cy < pk.bottom);
    if (near) { const tr = (d.b.style.translate || "0px 0px").split(" ").map(parseFloat); d.b.style.translate = ""; markerHome(d.b, [0, 0]); void tr; return; }
    // not near the tray: it rolls back to where it was lying
    d.b.classList.remove("held"); d.b.classList.add("sliding"); d.b.style.translate = "";
    setTimeout(() => d.b.classList.remove("sliding"), 260);
  });

  // ----- pill nav -----
  const AREAS = [["desk", "Desk"], ["record", "Records"]];
  function currentArea() {
    if (ui.view !== "desk" || !$("#scene") || ui.wall) return 0;
    if (!isPhone()) return ui.room === 1 ? 1 : 0;
    return rectOf($("#record")).top < window.innerHeight * 0.55 ? 1 : 0;
  }
  // The camera pans sideways between the rooms; with reduced motion they swap with a quick fade.
  function goRoom(i, quiet) {
    i = clamp(i, 0, 1);
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
    if (ui.wall) { closeWall(); if (id !== "desk") setTimeout(() => goArea(i), reduced() ? 0 : 640); return; }
    if (id === "desk") { goRoom(0); return; }
    // walking over to the Records room prints nothing; only the printer and the Summary link print
    if (!ui.forced) { ui.forced = true; ui.boothForced = true; applyScene(); }
    goRoom(1);
  }
  // print the record if nothing is printed yet (from the desk, where the printer is), otherwise just go to it
  function printAndShow() {
    if (ui.wall) { closeWall(); setTimeout(printAndShow, reduced() ? 0 : 640); return; }
    if (!ui.forced) { ui.forced = true; ui.boothForced = true; applyScene(); }
    if (ui.printed) { goRoom(1); return; }
    if (ui.room !== 0 && !isPhone()) goRoom(0, true);
    printRecord();
  }
  function updatePill() {
    const n = $("#area-name"); if (n) n.textContent = ui.wall ? "Whiteboard" : AREAS[currentArea()][1];
    const pl = $("#pill"); if (pl) pl.classList.toggle("up", !!ui.wall);
  }

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

  // ----- the intercom: Thea, the officer, asks the visitor a few questions; each answer takes them somewhere useful -----
  // Every line lives in data.json under "intercom". Answers are kept for this visit only.
  const ic = { open: false, node: null, tour: -1, said: false, visitedRecords: false, declared: false, timer: null, spotEl: null };
  const icNode = (id) => (state.intercom || []).find((n) => n.id === id);
  function icEl() {
    let el = $("#icq");
    if (el) return el;
    el = document.createElement("div");
    el.id = "icq"; el.className = "icq"; el.hidden = true;
    el.setAttribute("role", "dialog"); el.setAttribute("aria-label", "Intercom"); el.setAttribute("aria-describedby", "icq-q");
    el.innerHTML = '<p class="icq-q" id="icq-q" aria-live="polite"></p><div class="icq-chips" id="icq-chips" role="group" aria-label="Answers"></div>' +
      '<button class="icq-x" data-act="ic-close" aria-label="Close the intercom">' + SPR.draw("xmark", 2) + "</button>";
    fixedRoot.appendChild(el);
    return el;
  }
  // the scrap comes out of the booth window, at its lower right
  function icPlace() {
    const el = $("#icq"), w = $(".window-wrap") || $("#booth");
    if (!el || !w) return;
    const r = rectOf(w), vw = window.innerWidth;
    if (isPhone()) { el.style.left = "12px"; el.style.right = "12px"; el.style.top = Math.max(12, Math.min(window.innerHeight - el.offsetHeight - 90, r.bottom - 24)) + "px"; return; }
    el.style.right = "auto";
    // beside the intercom box, its pointer aimed back at it
    const icb = rectOf($("#intercom") || w);
    el.style.left = Math.round(Math.min(vw - el.offsetWidth - 24, icb.right + 14)) + "px";
    el.style.top = Math.round(Math.max(12, icb.top - 6)) + "px";
  }
  function icShow(text, chips) {
    const el = icEl();
    clearTimeout(ic.timer);
    $("#icq-q", el).textContent = text;
    $("#icq-chips", el).innerHTML = (chips || []).map((c, i) => '<button class="icq-chip" data-act="ic-pick" data-i="' + i + '"><span class="icq-n" aria-hidden="true">' + (i + 1) + "</span>" + esc(c) + "</button>").join("");
    // a one-frame paper swap
    el.classList.remove("swap"); void el.offsetWidth; el.classList.add("swap");
    if (el.hidden) { el.hidden = false; el.classList.add("pop"); setTimeout(() => el.classList.remove("pop"), 160); }
    icPlace();
    const b = $(".ic-btn"); if (b) b.setAttribute("aria-expanded", "true");
    const first = $(".icq-chip", el) || $(".icq-x", el);
    if (first) first.focus({ preventScroll: true });
  }
  function icAsk(id) {
    const n = icNode(id); if (!n) { icClose(); return; }
    if (ic.tour >= 0) { const tb = $("#thea-say"); if (tb) tb.hidden = true; }
    ic.node = n; ic.tour = -1; spot(null);
    icShow(n.q || "", n.a.map((a) => a.t));
  }
  function icOpen() {
    if (ui.view !== "desk" || $("#intro") || editing) return;
    ic.open = true;
    if (ui.room === 1 || ui.printed) ic.visitedRecords = true;
    // the visitor's questions for Thea
    icAsk("ask");
  }
  function icClose(keepSpot) {
    if (!ic.open && !$("#icq")) return;
    if (ic.tour >= 0) { const tb = $("#thea-say"); if (tb) tb.hidden = true; }
    ic.open = false; ic.tour = -1; clearTimeout(ic.timer);
    if (!keepSpot) spot(null);
    const el = $("#icq"); if (el) el.hidden = true;
    const b = $(".ic-btn"); if (b) { b.setAttribute("aria-expanded", "false"); if (el && el.contains(document.activeElement)) b.focus({ preventScroll: true }); }
  }
  function icPick(i) {
    if (ic.tour >= 0) { if (i === 0) icTour(ic.tour + 1); else icClose(); return; }
    const n = ic.node, a = n && n.a[i];
    if (!a) return;
    ic.said = true; FX.play("tap");
    if (n.id === "declare") ic.declared = true;
    if (a.next) { icAsk(a.next); return; }
    // Thea answers in her speech bubble; a plain answer leaves the questions open for another one
    if (!a.go) { if (a.say) theaSpeak(a.say, 7000); const c = $$(".icq-chip")[i]; if (c) c.focus({ preventScroll: true }); return; }
    if (a.go === "tour") { if (a.say) theaSpeak(a.say); setTimeout(() => { if (ic.open) icTour(0); }, reduced() ? 0 : 900); return; }
    if (a.go === "close") { icClose(); return; }
    icClose(true);
    icGo(a.go);
    if (a.say) setTimeout(() => theaSpeak(a.say, 3600, a.go !== "files"), 30);
  }
  function icGo(go) {
    const back = (fn) => { if (ui.wall) { closeWall(); setTimeout(fn, reduced() ? 0 : 640); } else fn(); };
    if (go === "wall") { openWall(); return; }
    if (go === "record") { back(() => { ic.visitedRecords = true; goArea(1); }); return; }
    if (go === "print") { back(() => { ic.visitedRecords = true; printAndShow(); }); return; }
    if (go === "files") {
      back(() => {
        if (ui.room !== 0 && !isPhone()) goRoom(0, true);
        setTimeout(() => {
          spot($("#filebox"), $("#filebox-front"));
          ic.timer = setTimeout(() => { spot($("#dw-skills .dw-front") || $(".dw-front")); ic.timer = setTimeout(() => spot(null), 2200); }, 2200);
          const tab = $(".p-case.filed .folder-tab"); if (tab) tab.focus({ preventScroll: true });
        }, reduced() ? 0 : 480);
      });
      return;
    }
    if (go === "contact") {
      back(() => {
        ic.visitedRecords = true; printAndShow();
        // once the record is printed and the room is in view, lift the slip so it can be torn off
        let tries = 0;
        const wait = setInterval(() => {
          tries++;
          const sl = $("#slip");
          if ((ui.printed && (ui.room === 1 || isPhone()) && sl) || tries > 60) {
            clearInterval(wait);
            if (!sl) return;
            setTimeout(() => {
            sl.scrollIntoView({ block: "center", behavior: behavior() });
            sl.classList.add("lifted"); FX.play("lift");
            setTimeout(() => sl.classList.remove("lifted"), 2400);
            const t = $("#perf") || sl; t.focus({ preventScroll: true });
            }, reduced() ? 0 : 600);
          }
        }, 250);
      });
    }
  }
  // the tour: one thing at a time is spotlit, with a line from Thea
  function tourTarget(at) {
    if (at === "passport") return [$('.booth-links [data-act="passport"]')];
    if (at === "files") return [$("#filebox"), $("#filebox-front")];
    if (at === "drawers") return $$(".dw .dw-front");
    if (at === "up") return [ui.markerBack ? $(".peek-btn") : $(".desk-marker")];
    if (at === "printer") return [$("#printer")];
    if (at === "stamps") return [$("#stampdock")];
    return [];
  }
  function icTour(i) {
    const n = icNode("tour"); if (!n) { icClose(); return; }
    if (i >= n.steps.length) { ic.tour = -1; spot(null); const tb = $("#thea-say"); if (tb) tb.hidden = true; icAsk("ask"); return; }
    const go = () => {
      ic.tour = i; ic.said = true;
      const st = n.steps[i];
      spot.apply(null, tourTarget(st.at));
      icShow("", [n.next || "Next", n.skip || "Skip tour"]);
      theaSpeak(st.say);
      ic.tour = i;
    };
    if (ui.wall) { closeWall(); setTimeout(go, reduced() ? 0 : 640); }
    else if (ui.room !== 0 && !isPhone()) { goRoom(0, true); setTimeout(go, reduced() ? 0 : 480); }
    else go();
  }
  // the spotlight: the rest of the screen dims one step; it never takes a click
  function spot() {
    const els = [].slice.call(arguments).filter((e) => e && !e.hidden && e.offsetParent !== null);
    let sp = $("#spot");
    if (!els.length) { if (sp) sp.hidden = true; ic.spotEls = []; return; }
    if (!sp) { sp = document.createElement("div"); sp.id = "spot"; sp.className = "spot"; sp.setAttribute("aria-hidden", "true"); fixedRoot.appendChild(sp); }
    ic.spotEls = els;
    // a drawer front only counts where it shows (the fronts are cropped to fit the desk edge)
    const rs = els.map((e) => { const r = rectOf(e), w = e.closest(".dw"), cr = e.classList.contains("dw-front") && w ? parseFloat(getComputedStyle(w).getPropertyValue("--crop")) || 0 : 0; return { left: r.left + cr, right: r.right - cr, top: r.top, bottom: r.bottom }; }), pad = 10;
    const l = Math.min.apply(null, rs.map((r) => r.left)) - pad, t = Math.min.apply(null, rs.map((r) => r.top)) - pad;
    const r = Math.max.apply(null, rs.map((q) => q.right)) + pad, b = Math.max.apply(null, rs.map((q) => q.bottom)) + pad;
    if (isPhone()) els[0].scrollIntoView({ block: "center" });
    sp.style.left = Math.round(l) + "px"; sp.style.top = Math.round(t) + "px"; sp.style.width = Math.round(r - l) + "px"; sp.style.height = Math.round(b - t) + "px";
    sp.hidden = false;
  }
  // a click on the spotlit thing moves the tour on (after it does its own job); a click anywhere else outside the scrap closes it
  document.addEventListener("pointerdown", (ev) => {
    if (!ic.open || !$("#icq") || $("#icq").hidden) return;
    const t = ev.target;
    if (t.closest && (t.closest("#icq") || t.closest(".ic-btn"))) return;
    if (ic.tour >= 0 && ic.spotEls && ic.spotEls.some((e) => e.contains(t))) { const next = ic.tour + 1; setTimeout(() => { if (ic.open) icTour(next); }, 60); return; }
    icClose(ic.tour < 0);
  }, true);
  document.addEventListener("keydown", (ev) => {
    if (!ic.open || !$("#icq") || $("#icq").hidden) return;
    if (ev.key === "Escape") { ev.preventDefault(); ev.stopImmediatePropagation(); icClose(); return; }
    if (/^[1-9]$/.test(ev.key) && !(ev.target.matches && ev.target.matches("input, textarea, [contenteditable]"))) {
      const b = $$(".icq-chip")[+ev.key - 1];
      if (b) { ev.preventDefault(); ev.stopImmediatePropagation(); icPick(+ev.key - 1); }
    }
  }, true);
  window.addEventListener("resize", () => { if (ic.open) { icPlace(); if (ic.spotEls && ic.spotEls.length) spot.apply(null, ic.spotEls); } });

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
      (editing ? "" : '<button class="btn-quiet" data-act="view" data-v="desk">Desk view</button><button class="btn-quiet" data-act="passport">Inspect passport</button>') +
      '<span class="owner" id="owner">' + ownerBar() + "</span></nav></header>" +
      '<section class="hero">' + (ui.admitted === "approved" && !editing ? '<span class="ink green entry">Approved<small>' + today + "</small></span>" : "") +
      f("profile.greeting", "Greeting", "", "h1").replace("<h1", '<h1 tabindex="-1" id="hello"') + f("profile.tagline", "One-line tagline", "tagline " + blk(), "p") +
      f("profile.summary", "A short summary", "summary " + blk(), "p") +
      (editing ? '<div style="margin-top:20px">' + row("Full name", f("profile.name", "Full name")) + row("Nationality", f("profile.nationality", "Nationality")) +
        row("Based in", f("profile.basedIn", "Where you live")) + row("Occupation", f("profile.occupation", "Shown on the passport and ID card")) +
        row("Seeking", f("profile.seeking", "Roles you want, for the entry record")) + row("Booth eyebrow", f("profile.eyebrow", "Three words over your name")) +
        row("Open to", f("profile.openTo", "Index card on the pinboard")) + row("Currently", f("profile.currently", "Sticky note on the pinboard (left empty, it stays hidden)")) + row("Departure board", f("profile.board", "Phrases, separated by commas")) + "</div>" : "") + "</section>" +
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
        (state.effects || []).map((e, i) => row(esc({ watch: "Watch", sketchbook: "Sketchbook", bottle: "Bottle", usb: "USB stick", gum: "Gum", mints: "Mint tin", keycap: "Keycap" }[e.id] || e.id), f("effects." + i + ".note", "Leave empty to stay hidden"))).join("")) : "") +
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
    renderMarks("record"); renderMarks("id"); renderMarks("diploma");
    if (ui.slipTorn && !isPhone()) { const sl = $("#slip"), home = slipHome(); if (sl && home && sl.parentElement !== home) home.appendChild(sl); if (sl && ui.slipPos) setPos(sl, ui.slipPos[0], ui.slipPos[1]); }
    layoutDrawer(false);
    $$(".pobj").forEach(placePobj); drawHands(); fitPinboard();
    applyScene(true);
    paperIds().forEach((id) => { const el = paperEl(id); if (el && pst(id).open) placeOpen(el); });
    updatePill(); updateBar();
    $$(".room").forEach((r, k) => { r.inert = !isPhone() && k !== ui.room; });
    const dip = paperEl("diploma"); if (dip) dip.style.setProperty("--dzoom", isPhone() ? Math.min(1, (window.innerWidth * 0.86) / 480).toFixed(3) : 1);
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
  // the walk-in plays once per visit; this icon on the passport screen plays it again
  const replayBtn = () => (reduced() ? "" : '<button class="replay-btn" data-act="replay-intro" aria-label="Replay intro">' + SPR.draw("replay", 3) + '<span class="tip" aria-hidden="true">Replay intro</span></button>');
  function renderIntro() {
    const p = state.profile, e = state.education;
    const parts = p.name.trim().split(/\s+/), surname = parts.length > 1 ? parts.pop() : "", given = parts.join(" ");
    ui.introStep = 0; ui.introDone = false; ui.passPage = 0;
    // the passport canvas is 104x128 art pixels; the open page sits at (15, 2) on it
    const S = passScale(), px = (v) => v * S + "px", X = (v) => px(15 + v), Y = (v) => px(2 + v);
    const pv = p.passport || {}, base = pv.base || p.basedIn;
    const row = (lab, val) => '<div class="pp-row"><dt>' + lab + "</dt><dd>" + esc(val) + "</dd></div>";
    if (drawnPass()) { renderDrawnPassport(); return; }
    const L = passLayout(S);
    introRoot.innerHTML =
      '<div class="intro" id="intro" role="dialog" aria-label="Passport" style="--canvas-top:' + L.canvas + "px;--words-top:" + L.words + 'px"><div class="intro-inner"><p class="intro-say" id="say" aria-live="polite">Next applicant. Click the passport to open it.</p>' +
      '<div class="passport" id="passport" data-frame="0" data-stamp-root tabindex="0" aria-label="Passport. Press Enter to open it. Once open, press A to stamp the visa approved or D to stamp it denied." style="--pp:' + S + ";width:" + px(104) + ";height:" + px(128) + '">' +
      '<span class="pp-frames" id="pp-frames" aria-hidden="true" data-act="intro-next" style="background-image:url(' + ART["passport-seq-sheet"].src + ")" + '"></span>' +
      '<div class="pp-spread" id="pp-spread">' +
      '<div class="pp-visa visa stampable" data-stamp="visa" style="left:' + X(0) + ";top:" + Y(0) + ";width:" + px(74) + ";height:" + px(52) + '">' +
      '<div class="stamp-box ghost' + (ui.inked.visa ? " inked" : "") + '" aria-hidden="true" style="left:' + px(14) + ";top:" + px(9) + ";width:" + px(46) + ";height:" + px(39) + '"></div>' +
      '<p class="pp-visa-title" style="left:' + px(14) + ";top:" + px(48) + ";width:" + px(46) + ";height:" + px(5) + '">Entry visa</p><div class="marks" data-marks="visa"></div></div>' +
      '<div class="pp-photo" style="left:' + X(43) + ";top:" + Y(68) + ";width:" + px(22) + ";height:" + px(28) + '">' + SPR.applicant("thea", Math.ceil(28 * S / 59), portraitAlt) + "</div>" +
      '<div class="pp-data" style="left:' + X(4) + ";top:" + Y(63) + ";width:" + px(37) + ";height:" + px(35) + '"><p class="pp-name">' + esc(surname + (given ? ", " + given : "")) + "</p>" +
      '<dl class="pp-rows">' + row("NAT", pv.nat || p.nationality) + row("OCC", pv.occ || p.occupation) + row("BASE", base) + row("GRAD", pv.grad || e.graduated) + "</dl></div>" + 
      '<p class="pp-code" aria-hidden="true" style="left:' + X(4) + ";top:" + Y(101) + ";width:" + px(66) + ";height:" + px(8) + '">' + mrz("P " + p.nationality.slice(0, 3) + " " + surname + "  " + given, 30) + "</p></div></div>" +
      '<div class="intro-actions"><button class="btn-quiet" data-act="intro-skip">Skip to the booth</button>' + replayBtn() + "</div></div></div>";
    renderMarks("visa");
    placePassport(0);
    document.documentElement.classList.add("locked");
    const g = $("#pills"); if (g) g.classList.add("solo");
    $("#passport").focus({ preventScroll: true });
    updateBar();
  }
  // the passport scale: 6x where it fits above the open tray, otherwise a step down (on short screens the tray moves beside it)
  // 4x where the open page clears the tray (beside it on short screens), else 3x
  const drawnPass = () => (state.profile.passportStyle || "sprite") === "drawn" && !isPhone();
  // The drawn passport follows the sprite sequence: upright, turned sideways (spine along the top), then opened upward.
  // Canvas 80x116 art pixels; the spine runs along y 58. Data page below it (x 2-78, y 58-112), visa page above (y 4-58).
  // Frames: 0 upright, 1 and 2 turning, 3 sideways, 4 cover lifting, 5 edge-on, 6 visa page unfolding, 7 open.
  const DP_BOX = [[13, 20, 67, 96], [8, 22, 72, 94], [5, 28, 75, 90], [2, 58, 78, 112], [2, 58, 78, 112], [2, 56, 78, 112], [2, 18, 78, 112], [2, 4, 78, 112]];
  const DP_HOLD = [0, 80, 80, 250, 90, 90, 90, 90];
  function drawnScale() { return clamp(Math.floor((window.innerHeight - 72 - 16 - 64 - 16) / 108), 4, 6); }
  function renderDrawnPassport() {
    const p = state.profile, e = state.education, S = drawnScale(), pv = p.passport || {};
    const parts = p.name.trim().split(/\s+/), surname = parts.length > 1 ? parts.pop() : "", given = parts.join(" ");
    const row = (lab, val) => '<div class="pp-row"><dt>' + lab + "</dt><dd>" + esc(val) + "</dd></div>";
    ui.introStep = 0; ui.introDone = false; ui.passPage = 0;
    introRoot.innerHTML =
      '<div class="intro dp-intro" id="intro" role="dialog" aria-label="Passport"><div class="intro-inner"><p class="intro-say" id="say" aria-live="polite">Next applicant. Click the passport to open it.</p>' +
      '<div class="passport dp" id="passport" data-frame="0" data-stamp-root tabindex="0" aria-label="Passport. Press Enter to open it. Once open, press A to stamp the visa approved or D to stamp it denied." style="--pp:' + S + ";width:" + 80 * S + "px;height:" + 116 * S + 'px">' +
      '<div class="dp-page dp-data"><div class="dp-in"><div class="dp-photo">' + SPR.applicant("thea", S >= 6 ? 2 : 1, portraitAlt) + "</div>" +
      '<div class="dp-id"><p class="pp-name">' + esc(surname + (given ? ", " + given : "")) + '</p><dl class="pp-rows">' +
      row("NAT", pv.nat || p.nationality) + row("OCC", pv.occ || p.occupation) + row("BASE", pv.base || p.basedIn) + row("GRAD", pv.grad || e.graduated) + "</dl></div>" +
      '<p class="dp-mrz" aria-hidden="true">' + mrz("P " + p.nationality.slice(0, 3) + " " + surname + "  " + given, 36) + "</p></div></div>" +
      '<div class="dp-page dp-visa"><div class="dp-in visa stampable" data-stamp="visa"><p class="dp-vhead"><b>Entry visa</b><span>' + esc(p.name) + " · " + today + "</span></p>" +
      '<div class="stamp-box' + (ui.inked.visa ? " inked" : "") + '">Stamp here</div><div class="marks" data-marks="visa"></div></div></div>' +
      '<span class="dp-spine" aria-hidden="true"></span>' +
      '<div class="dp-cover" data-act="intro-next" aria-hidden="true"><div class="dp-face"><span class="dp-emb">' + SPR.draw("emblem", Math.max(2, S - 2)) + '</span><b>Passport</b><span class="dp-name">' + esc(p.name) + "</span></div><i></i><i></i><i></i><i></i></div></div>" +
      '<div class="intro-actions"><button class="btn-quiet" data-act="intro-skip">Skip to the booth</button>' + replayBtn() + "</div></div></div>";
    renderMarks("visa");
    placePassport(0);
    document.documentElement.classList.add("locked");
    const g = $("#pills"); if (g) g.classList.add("solo");
    $("#passport").focus({ preventScroll: true });
    updateBar();
  }
  function passScale() { return isPhone() ? 3 : clamp(Math.floor((window.innerHeight - 300) / 113), 4, 6); }
  // the visible part of each frame on the 104x128 canvas, so the book itself is what gets centred
  const PP_BOX = [[25, 50, 80, 124], [11, 43, 94, 128], [8, 46, 97, 128], [15, 60, 89, 115], [15, 60, 89, 115], [15, 60, 89, 115], [15, 28, 89, 115], [15, 2, 89, 115]];
  function placePassport(f) {
    const pp = $("#passport"), it = $("#intro");
    if (!pp || !it || isPhone()) return;
    const S = +pp.style.getPropertyValue("--pp") || 4, bx = (pp.classList.contains("dp") ? DP_BOX : PP_BOX)[f || 0], vw = window.innerWidth, vh = window.innerHeight;
    const W = (bx[2] - bx[0]) * S, H = (bx[3] - bx[1]) * S, above = (f || 0) === 0 ? 108 : 64, avail = vh - 72 - 16;
    const top = Math.max(8, (avail - above - H) / 2) + above, left = (vw - (W + (ui.introStep >= 1 ? 164 : 0))) / 2;
    pp.style.left = Math.round(left - bx[0] * S) + "px"; pp.style.top = Math.round(top - bx[1] * S) + "px";
    it.style.setProperty("--act-top", Math.round(top - 64) + "px");
    it.style.setProperty("--say-top", Math.round(top - above) + "px");
    it.style.setProperty("--vis-cx", Math.round(left + W / 2) + "px");
    ui.ppVis = { left: left, top: top, right: left + W, bottom: top + H };
    placeTray();
  }
  // where the canvas goes: the closed book (art rows 50-124) centred with its words above it, but never so low
  // that the open page (rows 2-115) would reach the open tray
  function passLayout(S) {
    const vh = window.innerHeight, trayTop = vh - 72 - ($("#stampbar") ? $("#stampbar").offsetHeight : 160);
    const group = 24 + 20 + 44 + 20 + 74 * S, top0 = Math.max(8, (vh - 72 - group) / 2);
    let canvas = top0 + 108 - 50 * S;
    const maxCanvas = trayTop - 16 - 115 * S;
    canvas = Math.min(canvas, maxCanvas);
    return { ok: canvas + 2 * S >= 4, canvas: Math.round(canvas), words: Math.round(canvas + 50 * S - 108) };
  }
  function trayClear() { const bar = $("#stampbar"); return (bar ? bar.offsetHeight : 210) + 80; }
  // the turn (frames 1-3) then the opening (4-7), in hard steps; closing plays it backwards
  const PP_HOLD = [0, 80, 80, 250, 90, 90, 90, 90];
  function setFrame(f) {
    const pp = $("#passport"), fr = $("#pp-frames"); if (!pp) return;
    pp.dataset.frame = f;
    if (fr) fr.style.backgroundPosition = -104 * f * (+pp.style.getPropertyValue("--pp") || 4) + "px 0";
    placePassport(f);
  }
  function playPassport(dir) {
    const pp = $("#passport"); if (!pp) return;
    const dp = pp.classList.contains("dp"), last = 7, hold = dp ? DP_HOLD : PP_HOLD;
    const to = dir > 0 ? last : 0;
    pp.classList.remove("open");
    if (reduced()) { setFrame(to); pp.classList.toggle("open", to === last); return; }
    let f = +pp.dataset.frame;
    FX.play("dwslide");
    const tick = () => {
      f += dir; setFrame(f);
      if (dir > 0 && f === 4) FX.play("flip");
      if (f === to) { pp.classList.toggle("open", to === last); return; }
      setTimeout(tick, hold[f]);
    };
    setTimeout(tick, dir > 0 ? 0 : hold[f]);
  }
  function introNext() {
    if (ui.introStep !== 0) return;
    const it = $("#intro"); if (it) it.classList.add("opened");
    playPassport(1);
    ui.introStep = 1;
    $("#say").textContent = "";

    FX.play("rustle");
    setTimeout(() => { updateBar(); const b = slotBtn("approved"); if (b) b.focus({ preventScroll: true }); setTimeout(keepBoxClear, reduced() ? 0 : 220); }, reduced() ? 0 : 500);
  }
  function inspectPassport() {
    hideTag(); hideNote();
    renderIntro();
    const it = $("#intro"), pp = $("#passport");
    if (!it || !pp) return;
    // already open on the data and visa pages
    it.classList.add("opened", "inspect"); ui.introStep = 1; ui.inspecting = true;
    const say = $("#say"); if (say) say.textContent = "";
    setFrame(7); pp.classList.add("open");
    const back = $('[data-act="intro-skip"]', it); if (back) back.textContent = "Back to the booth";
    updateBar();
    if (!reduced() && !isPhone()) {
      const site = $(".site") || app; site.classList.remove("pushed"); void site.offsetWidth;
      it.classList.add("from-left"); site.classList.add("pushed");
      FX.play("dwslide");
      // the stamp tray is fixed to the screen, so it waits until the passport has arrived
      const bar = $("#stampbar"); if (bar) bar.style.visibility = "hidden";
      setTimeout(() => { it.classList.remove("from-left"); if (bar) bar.style.visibility = ""; }, 460);
    }
    setTimeout(() => { const b = slotBtn("approved"); if (b) b.focus({ preventScroll: true }); else pp.focus({ preventScroll: true }); }, reduced() ? 0 : 470);
  }
  function closeIntro() {
    const el = $("#intro");
    if (!el || el.classList.contains("leaving")) return;
    if (held) springBack(true);
    // back from inspecting: pan right to the booth again
    if (ui.inspecting && !reduced() && !isPhone()) { el.classList.add("to-left"); ($(".site") || app).classList.remove("pushed"); FX.play("dwslide"); const bar = $("#stampbar"); if (bar) { bar.style.visibility = "hidden"; setTimeout(() => { bar.style.visibility = ""; }, 470); } }
    ui.inspecting = false;
    el.classList.add("leaving");
    document.documentElement.classList.remove("locked");
    ui.introDone = true;
    setTimeout(() => { introRoot.innerHTML = ""; ($(".site") || app).classList.remove("pushed"); updateBar(); revealNav(); const h = $("#hello"); if (h) h.focus({ preventScroll: true }); firstVisit(); }, reduced() ? 0 : 460);
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
      const dk = $("#desk"); if (dk) dk.classList.remove("slow-unpack");
      $$(".arriving").forEach((e) => e.classList.remove("arriving"));
      setTimeout(() => { if (!isPhone() && $("#desk")) { relayout(); placeStickers(); } }, reduced() ? 0 : 700);
    };
    if (reduced()) { firstRun = { timers: [] }; finish(); return; }
    firstRun = { timers: [] };
    const at = (ms, fn) => firstRun.timers.push(setTimeout(fn, ms));
    document.addEventListener("pointerdown", finish, true); document.addEventListener("keydown", finish, true);
    $$("#filebox, #filebox-front, .dw").forEach((e) => e.classList.add("arriving", "hold"));
    at(60, () => { ui.boothForced = true; applyScene(); });
    at(520, () => { if (ui.lampOn) FX.play("lamp"); });
    const desk = $("#desk"); if (desk) desk.classList.add("slow-unpack");
    at(1150, () => { const e = $("#envelope"); if (e) { ui.firstFlap = true; e.classList.add("open"); FX.play("flip"); } });
    at(1700, () => { ui.forced = true; ui.stagger = 240; applyScene(); ui.stagger = 0; });
    at(3300, () => { $$(".arriving").forEach((e) => e.classList.remove("hold")); FX.play("dwslide"); });
    at(3900, () => { $$(".arriving").forEach((e) => e.classList.remove("arriving")); if (desk) desk.classList.remove("slow-unpack"); firstRun.timers = []; finish(); });
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
  function tagTarget(el) { return el && el.closest && (el.closest(".peek-btn") || el.closest(".desk-marker") || el.closest(".spk") || el.closest(".pbi") || el.closest(".dw-front") || el.closest(".p-case.filed .folder-tab") || (!isPhone() && el.closest("#desk .p-diploma:not(.held)"))); }
  function showTag(el, now) {
    clearTimeout(tagTimer);
    const go = () => {
      let t = $("#tag");
      if (!t) { t = document.createElement("div"); t.id = "tag"; t.className = "tag"; t.setAttribute("role", "tooltip"); fixedRoot.appendChild(t); }
      tagFor = el;
      const r = rectOf(el), strip = el.classList.contains("folder-tab");
      if (el.classList.contains("p-diploma")) {
        t.innerHTML = '<b class="tg-name">Coursework</b><span class="tg-sub">' + esc(state.education.coursework) + "</span>";
        t.className = "tag side pop"; t.hidden = false;
        const right = r.right + 14 + t.offsetWidth < window.innerWidth;
        t.classList.toggle("flip", !right);
        t.style.left = Math.round(right ? r.right + 14 : r.left - 14 - t.offsetWidth) + "px";
        t.style.top = Math.round(clamp(r.top + 24, 8, window.innerHeight - t.offsetHeight - 8)) + "px";
      } else if (el.classList.contains("spk") || el.classList.contains("aclock")) {
        t.innerHTML = '<span class="tg-word">' + esc(el.dataset.tag) + "</span>";
        const side = el.classList.contains("aclock");
        t.className = "tag " + (side ? "side" : "above") + " pop"; t.hidden = false;
        if (side) { t.style.left = Math.round(r.right + 14) + "px"; t.style.top = Math.round(r.top + r.height / 2 - t.offsetHeight / 2) + "px"; }
        else { t.style.left = Math.round(clamp(r.left + r.width / 2 - t.offsetWidth / 2, 8, window.innerWidth - t.offsetWidth - 8)) + "px"; t.style.top = Math.round(r.top - t.offsetHeight - 10) + "px"; }
      } else if (el.classList.contains("pbi")) {
        t.innerHTML = '<span class="tg-sub">' + esc(el.dataset.tag) + "</span>";
        t.className = "tag below pop"; t.hidden = false;
        const below = r.bottom + 12 + t.offsetHeight < window.innerHeight - 8;
        t.classList.toggle("flip", !below);
        t.style.left = Math.round(clamp(r.left + r.width / 2 - t.offsetWidth / 2, 8, window.innerWidth - t.offsetWidth - 8)) + "px";
        t.style.top = Math.round(below ? r.bottom + 12 : r.top - 12 - t.offsetHeight) + "px";
      } else if (strip) {
        const pr = state.projects[caseIndex(el.dataset.id)], box = rectOf($("#filebox"));
        t.innerHTML = '<b class="tg-name">' + esc(pr.name) + '</b><span class="tg-sub">' + esc([pr.role, pr.dates].filter(Boolean).join(", ")) + "</span>";
        t.className = "tag side pop"; t.hidden = false;
        t.style.left = Math.round(box.right + 14) + "px";
        t.style.top = Math.round(clamp(r.top + r.height / 2 - t.offsetHeight / 2, 8, window.innerHeight - t.offsetHeight - 8)) + "px";
      } else if (el.closest(".peek-btn, .desk-marker")) {
        // the board peek and the marker: the word just under them
        t.innerHTML = '<span class="tg-word">' + esc(el.dataset.tag) + "</span>";
        t.className = "tag pop"; t.hidden = false;
        t.style.left = Math.round(clamp(r.left + r.width / 2 - t.offsetWidth / 2, 8, window.innerWidth - t.offsetWidth - 8)) + "px";
        t.style.top = Math.round(r.bottom + 10) + "px";
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
  window.addEventListener("scroll", hideTag, { passive: true, capture: true });
  window.addEventListener("blur", hideTag);
  document.addEventListener("pointerover", (ev) => { if (ev.pointerType === "touch") return; const t = tagTarget(ev.target); if (t && t !== tagFor) showTag(t); });
  document.addEventListener("pointerout", (ev) => { const t = tagTarget(ev.target); if (t && !t.contains(ev.relatedTarget) && ev.pointerType !== "touch") hideTag(); });
  // only keyboard focus shows a tag: a click also focuses, and that tag would outlive the click
  document.addEventListener("focusin", (ev) => { const t = tagTarget(ev.target); if (t && t.matches(":focus-visible")) showTag(t, true); });
  document.addEventListener("focusout", (ev) => { if (tagTarget(ev.target)) hideTag(); });
  // touch: the first tap shows the name, the second opens; a tap anywhere else hides it
  document.addEventListener("pointerdown", (ev) => {
    if (ev.pointerType !== "touch") { hideTag(); return; }
    const t = tagTarget(ev.target);
    if (!t) { hideTag(); return; }
    if (tagFor !== t) { showTag(t, true); swallowClick = true; }
  }, true);

  // ----- actions -----
  function touched() { dirty = true; note = ""; }
  const ACTIONS = {
    "intro-next": introNext,
    "intro-skip": closeIntro,
    passport: inspectPassport,
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
      if (ic.open) { icClose(); return; }
      FX.play("chime");
      setTimeout(() => icOpen(), reduced() ? 0 : 380);
    },
    "ic-pick"(b) { icPick(+b.dataset.i); },
    "ic-close"() { icClose(); },
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
    view(b) {
      const go = () => { ui.view = b.dataset.v; render(); window.scrollTo(0, 0); const h = $("#hello"); if (h) h.focus({ preventScroll: true }); };
      // Simplify: the desk is scanned (a shutter click, a light bar sweeping down) and the scan becomes the simple page
      if (b.dataset.v !== "list" || reduced() || $(".scan")) { go(); return; }
      FX.play("scan");
      const sc = document.createElement("div");
      sc.className = "scan"; sc.setAttribute("aria-hidden", "true");
      sc.innerHTML = '<span class="scan-flash"></span><span class="scan-bar"></span><span class="scan-done"></span>';
      fixedRoot.appendChild(sc);
      setTimeout(go, 680);
      setTimeout(() => sc.classList.add("out"), 720);
      setTimeout(() => sc.remove(), 1000);
    },
    area(b) { goArea(AREAS.findIndex((a) => a[0] === b.dataset.to)); },
    summary() { printAndShow(); },
    step(b) { if (!ui.wall) goArea(clamp(currentArea() + +b.dataset.dir, 0, AREAS.length - 1)); },
    wall() { openWall(); },
    "wall-down"() { closeWall(); },
    "wb-mode"(b) { wbMode(b.dataset.m); },
    "wb-step"(b) { wbSelect(+b.dataset.i); },
    "wb-card-close"() { wbCard(null); },
    "wb-case"(b) { const id = b.dataset.id; closeWall(); setTimeout(() => { goRoom(0, true); openCase(id); const el = paperEl(id); if (el) el.focus({ preventScroll: true }); }, reduced() ? 0 : 640); },
    "wb-erase"() { wbWipe(() => wbDraw(true)); },
    "walkin-skip"() { walkDone(); },
    "marker-back"(b) { if (markerDragged) { markerDragged = false; return; } markerHome(b); },
    "cf-board"(b) { ui.wbSel = 0; openWall(b.dataset.id); },
    // back down to the case file the board was opened from; it lifts for a moment so the eye finds it
    "wb-back"(b) {
      const id = b.dataset.id;
      closeWall();
      setTimeout(() => {
        if (ui.room !== 0 && !isPhone()) goRoom(0, true);
        if (!pst(id).open) openCase(id);
        const el = paperEl(id); if (!el) return;
        el.classList.add("nudge"); setTimeout(() => el.classList.remove("nudge"), 120);
        el.focus({ preventScroll: true });
      }, reduced() ? 0 : 640);
    },
    // the walk-in plays once per visit; this forgets that it has played and starts the visit over
    "replay-intro"() { try { sessionStorage.removeItem("cvp-walkin"); } catch (err) { /* storage can be blocked */ } location.reload(); },
    "open-booth"() { ui.boothForced = true; applyScene(); $("#hello").focus({ preventScroll: true }); },
    "open-file"() {
      ui.forced = true; ui.boothForced = true; applyScene();
      const first = paperEl("id"); if (first) first.focus({ preventScroll: true });
    },
    snooze(b) { snooze(b); },
    sound(b) {
      const on = FX.toggle();
      b.setAttribute("aria-pressed", String(on)); b.classList.toggle("on", on); b.dataset.tag = on ? "Music on" : "Music off";
      if (tagFor === b) showTag(b, true);
      b.classList.remove("press"); void b.offsetWidth; b.classList.add("press"); setTimeout(() => b.classList.remove("press"), 80);
      if (on) FX.play("spkon");
    },
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
  let noteWait = null;
  document.addEventListener("pointerover", (ev) => {
    const po = ev.target.closest && ev.target.closest(".pobj");
    if (!po || drag) return;
    clearTimeout(noteWait);
    noteWait = setTimeout(() => { if (po.matches(":hover") && !drag) showNote(po); }, 450);
  });
  document.addEventListener("keyup", (ev) => { if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches && ev.target.matches('.pobj[data-p="keycap"]')) keyPress(ev.target, false); });
  document.addEventListener("pointerdown", (ev) => { const k = ev.target.closest && ev.target.closest('.pobj[data-p="keycap"]'); if (k && ev.button === 0) keyPress(k, true); });
  const keyUp = () => $$('.pobj[data-p="keycap"].pressed').forEach((k) => keyPress(k, false));
  document.addEventListener("pointerup", keyUp); document.addEventListener("pointercancel", keyUp);
  document.addEventListener("pointerout", (ev) => { const po = ev.target.closest && ev.target.closest(".pobj"); if (po && !po.contains(ev.relatedTarget)) { clearTimeout(noteWait); hideNote(); } });
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
      peel(sheetDrag.sheet, Math.round(sheetDrag.p * 8) / 8);
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
      if (perfMoved) {
        const was = ui.torn;
        setTear(clamp(perfDrag.start + (dx / perfDrag.w) * 1.2, 0, 1));
        // a short rip for each stretch of perforation that gives way
        if (Math.floor(ui.torn * 8) > Math.floor(was * 8)) FX.play("rip");
        if (ui.torn >= 0.85) { perfDrag = null; tearOff(); }
      }
      return;
    }
    if (!drag || ev.pointerId !== drag.id) return;
    const dx = ev.clientX - drag.sx, dy = ev.clientY - drag.sy;
    if (!drag.moved) {
      if (Math.hypot(dx, dy) < 5) return;
      drag.moved = true;
      hideTag();
      if (drag.el.classList.contains("pobj") && !isPhone()) carryStart(drag, ev);
      if (drag.el.classList.contains("filed")) { const id = drag.el.dataset.id; pst(id).inBox = false; drag.el.classList.remove("filed"); }
      drag.el.classList.remove("moving", "nudge"); drag.el.classList.add("held");
      try { drag.el.setPointerCapture(ev.pointerId); } catch (err) { /* capture is optional */ }
      FX.play(drag.el.classList.contains("sticker") ? "tap" : "lift");
      if (drag.el.dataset.p === "watch") say("watch");
      if (drag.el.classList.contains("paper")) markHandled();
    }
    if (drag.carry) { carryMove(drag, ev); return; }
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
    if (d.carry) { carryDrop(d, ev); return; }
    if (d.el.classList.contains("pobj")) {
      const home = $('#dw-big.open[data-dw="personal"] .dw-floor-personal');
      if (home && inside(rectOf(home), ev.clientX, ev.clientY)) {
        // put down inside the drawer: it stays where it was let go
        const r = rectOf(d.el), hr = rectOf(home), sc = dwGeom().sc;
        pobjHome(d.el);
        (ui.pobjAt = ui.pobjAt || {})[d.el.dataset.p] = [(r.left - hr.left) / sc, (r.top - hr.top) / sc];
        placePobj(d.el); FX.play("tap"); return;
      }
      // carried out of the drawer: it lands on the desk where it was let go
      if (d.inDrawer) { const r = rectOf(d.el), dk = rectOf($("#desk")); pobjToDesk(d.el, r.left - dk.left, r.top - dk.top); }
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
    if ((ev.key === "Enter" || ev.key === " ") && ev.target.id === "passport" && ui.introStep === 0) { ev.preventDefault(); introNext(); return; }
    const po = ev.target.closest && ev.target.closest(".pobj");
    const freeKey = ui.view === "desk" && !editing && !held && !ui.contactOpen && !$("#intro") &&
      !(ev.target.closest && ev.target.closest("input, textarea, select, [contenteditable], .f, [data-drag], .pobj, .passport, .cm-device, .pager, .sk-lift"));
    if (ui.wall && (ev.key === "ArrowDown" || ev.key === "Escape")) { ev.preventDefault(); if (ev.key === "Escape" && $("#wb-pin") && !$("#wb-pin").hidden) wbSelect(null); else closeWall(); return; }
    if (ev.key === "ArrowUp" && freeKey && !ui.wall && !ui.dwOpen && !$(".p-case.open")) { ev.preventDefault(); openWall(); return; }
    if (ui.wall && (ev.key === "ArrowLeft" || ev.key === "ArrowRight") && freeKey) return;
    if ((ev.key === "ArrowLeft" || ev.key === "ArrowRight") && !isPhone() && ui.view === "desk" && !editing && !held && !ui.contactOpen && !$("#intro") &&
      !(ev.target.closest && ev.target.closest("input, textarea, select, [contenteditable], .f, [data-drag], .pobj, .passport, .cm-device, .pager, .sk-lift"))) {
      ev.preventDefault(); goRoom(ui.room + (ev.key === "ArrowRight" ? 1 : -1)); return;
    }
    if (po && po.dataset.p === "keycap" && (ev.key === "Enter" || ev.key === " ")) { ev.preventDefault(); if (!ev.repeat) keyPress(po, true); return; }
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
    if (Math.abs(dy) > 70 && Math.abs(dx) < 50) { if (dy > 0 && !ui.wall) openWall(); else if (dy < 0 && ui.wall) closeWall(); return; }
    if (!ui.wall && Math.abs(dx) > 60 && Math.abs(dy) < 50) goRoom(ui.room + (dx < 0 ? 1 : -1));
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
  window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { onResize(); sizeWall(); }, 120); });
  // the desk can also change height without a window resize (the booth settles once its fonts load): lay it out again then
  setInterval(() => { const d = $("#desk"); if (d && !isPhone() && ui.layoutH && d.clientHeight !== ui.layoutH && !held && !document.hidden) onResize(); }, 400);
  narrow.addEventListener("change", () => { if (ui.view === "desk" && !editing) render(); });


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
  walkIn();

  (async function () {
    if (!window.claude || !window.claude.use) return;
    const got = await Promise.all([window.claude.use("artifact"), window.claude.use("user")]);
    artifact = got[0];
    if (!artifact) return;
    canEdit = got[1] ? await got[1].canEdit() : true;
    if (canEdit) setOwner();
  })();
})();
