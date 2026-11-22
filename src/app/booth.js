// The booth across the top, the entry record and the fixed controls (stamp bar, pill nav).
import { rt } from "./core.js";
import { $, ART, BX, FX, PX, SC, SPR, esc, fixedRoot, reduced, safeUrl, shortName, today, ui } from "./core.js";
import { paperHTML, paperIds, portraitAlt } from "./papers.js";
import { bigDrawerHTML, drawerHTML, layoutDrawer } from "./drawers.js";
import { slow } from "./things.js";
import { toggleLamp } from "./lamp.js";
import { hideTag, showTag, tagFor } from "./ambient.js";

// ----- booth -----
export const hasRadio = () => rt.state.assistant.some((a) => a.line) || rt.state.projects.some((p) => p.aside);
export function ownerBar() {
  if (!rt.canEdit) return "";
  if (!rt.editing) return '<button class="btn-quiet" data-act="edit">Amend papers</button>';
  return '<button class="btn-main" data-act="save"' + (rt.dirty && !rt.busy ? "" : " disabled") + ">" + (rt.busy ? "Filing…" : "File changes") + "</button>" +
    '<button class="btn-quiet" data-act="discard"' + (rt.busy ? " disabled" : "") + ">Discard</button>" + (rt.note ? '<span class="note" role="status">' + esc(rt.note) + "</span>" : "");
}
export function setOwner() { const o = $("#owner"); if (o) o.innerHTML = ownerBar(); }
export function deniedLine() { return "Entry denied. Unconvinced? Investigate the applicant at the desk."; }
export function boothHTML() {
  const p = rt.state.profile, qs = rt.state.interview.map((q, i) => [q, i]).filter((x) => x[0].q && x[0].a);
  return '<header class="booth" id="booth"><div class="window-wrap"><div class="window"><span class="skyline" id="skyline" data-phase="' + dayPhase() + '">' + SPR.scene(PX, dayPhase()) + "</span>" +
    SPR.applicant(p.applicant || "thea", 2, portraitAlt + ", standing at the booth window", "applicant") + '<span class="blink" id="blink" aria-hidden="true"><i></i><i></i></span><span class="mouth" id="mouth" aria-hidden="true"><i></i></span><span class="ledge" aria-hidden="true"></span>' +
    '<div class="shutter" id="shutter"><span>Booth closed.</span><button class="btn-quiet" data-act="open-booth">Open the shutter</button></div></div>' +
    '<div class="board" id="board" aria-hidden="true"></div><p class="sr-only">Departure board: ' + esc(p.board.join(", ")) + "</p></div>" +
    '<div class="booth-main">' + (p.eyebrow ? '<p class="eyebrow">' + esc(p.eyebrow) + "</p>" : "") +
    '<h1 class="bname" id="hello" tabindex="-1">' + esc(p.name) + '</h1><p class="tagline">' + esc(p.tagline) + "</p>" +
    '<p class="denied-note" id="denied-note"' + (ui.admitted === "denied" ? "" : " hidden") + ">" + esc(deniedLine()) + "</p>" +
    (qs.length ? '<div class="ask">' + qs.map((x) => '<button class="btn-quiet" data-act="ask" data-q="' + x[1] + '">' + esc(x[0].q) + "</button>").join("") + "</div>" +
      '<p class="bubble" id="bubble" aria-live="polite"' + (ui.asked == null ? " hidden" : "") + ">" + (ui.asked == null ? "" : esc(rt.state.interview[ui.asked].a)) + "</p>" : "") +
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
export function alarmHTML() {
  return '<button class="aclock" id="aclock" data-act="snooze" aria-label="Alarm clock, snooze" data-tag="5 more minutes">' + SPR.art("alarm-clock", 3, "ac-up") + SPR.art("alarm-clock-snooze", 3, "ac-down") +
    '<canvas class="ac-led" width="58" height="32" aria-hidden="true"></canvas><span class="sr-only ac-time" id="ac-time"></span></button>';
}
// segments of a 5x9 digit: a top, b upper right, c lower right, d bottom, e lower left, f upper left, g middle
export const SEG = { a: [[1, 0], [2, 0], [3, 0]], b: [[4, 1], [4, 2], [4, 3]], c: [[4, 5], [4, 6], [4, 7]], d: [[1, 8], [2, 8], [3, 8]], e: [[0, 5], [0, 6], [0, 7]], f: [[0, 1], [0, 2], [0, 3]], g: [[1, 4], [2, 4], [3, 4]] };
export const DIGIT = ["abcdef", "bc", "abged", "abgcd", "fgbc", "afgcd", "afgedc", "abc", "abcdefg", "abcdfg"];
export const LED_ON = "#e8a33a", LED_OFF = "#2f3a2b";
export let acColon = true, acMinute = "";
export function drawAlarm() {
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
export function alarmTick() {
  acColon = !acColon; drawAlarm();
  // the colon blinks once a second, slower while the watch has slowed time
  setTimeout(alarmTick, slow ? 1500 : 500);
}
export function snooze(el) {
  el.classList.add("down"); FX.play("snooze");
  setTimeout(() => el.classList.remove("down"), 150);
  showTag(el, true); clearTimeout(snooze.t); snooze.t = setTimeout(() => { if (tagFor === el) hideTag(); }, 3000);
}
// the portable speaker is the sound switch: light off when the site is quiet, amber light on when it makes sounds
export function speakerHTML() {
  const on = FX.soundOn;
  return '<button class="spk' + (on ? " on" : "") + '" data-act="sound" aria-pressed="' + on + '" aria-label="Sound and music" data-tag="' + (on ? "Music on" : "Music off") + '">' +
    SPR.art("speaker-off", 2, "spk-off") + SPR.art("speaker-on", 2, "spk-on") + '<span class="spk-light" aria-hidden="true"></span></button>';
}
// The pinboard: the prize voucher, an index card with the roles Thea is open to, and an optional "Currently" note.
// (The awards themselves live on the Commendations paper.)
export function pinboardHTML() {
  const p = rt.state.profile, src = ART["pinboard-large"] ? ART["pinboard-large"].src : "";
  const prize = rt.state.awards.map((a) => String(a.note || "").match(/prize was an? (.+?)\.?$/i)).filter(Boolean)[0];
  const prizeAward = rt.state.awards.find((a) => /prize was/i.test(a.note || ""));
  const ticket = prize ? '<span class="pbi pbi-ticket" tabindex="0" data-tag="' + esc("Won with " + prizeAward.result + " at " + prizeAward.event + " " + prizeAward.year + ".") + '"><span class="tack tack-ink" aria-hidden="true"></span><span class="pbi-tk">' + esc(prize[1].replace(/^./, (c) => c.toUpperCase())) + "</span></span>" : "";
  const card = p.openTo ? '<span class="pbi pbi-card" tabindex="0" data-tag="' + esc(p.seeking || "") + '"><span class="tack tack-red" aria-hidden="true"></span><b>Open to:</b> ' + esc(p.openTo) + "</span>" : "";
  const now = String(p.currently || "").trim();
  const cur = now ? '<span class="pbi pbi-note" tabindex="0" data-tag="' + esc("Updated by Thea.") + '"><span class="tack tack-green" aria-hidden="true"></span><b>Currently</b> ' + esc(now) + "</span>" : "";
  return '<div class="pinboard" role="group" aria-label="Pinboard" style="border-image-source: url(' + src + ')">' + card + ticket + cur + "</div>";
}
// the visitor's local hour sets the sky: dawn, day, dusk or night
export function dayPhase(d) {
  const h = (d || new Date()).getHours();
  return h >= 5 && h < 9 ? "dawn" : h >= 9 && h < 17 ? "day" : h >= 17 && h < 19 ? "dusk" : "night";
}
export function checkSky() {
  const sk = $("#skyline");
  if (!sk) return;
  const ph = dayPhase();
  if (sk.dataset.phase === ph) return;
  sk.dataset.phase = ph;
  sk.classList.add("fade");
  setTimeout(() => { sk.innerHTML = SPR.scene(PX, ph); sk.classList.remove("fade"); }, reduced() ? 0 : 300);
  if (!ui.lampTouched && (ph === "dusk" || ph === "night") !== ui.lampOn) toggleLamp(true);
}
export function fitPinboard() {
  const b = $("#booth");
  if (!b) return;
  const w = window.innerWidth, h = window.innerHeight;
  const big = false;
  b.classList.toggle("pb3", big); b.classList.toggle("pb2", !big);
}
export function deskHTML() {
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
export function deskBelowHTML() {
  return bigDrawerHTML();
}
// ----- entry record -----
export function recordHTML() {
  const p = rt.state.profile, e = rt.state.education, feat = rt.state.projects.filter((x) => x.featured);
  const slip = '<div class="slip' + (ui.slipTorn ? " loose" : "") + '" id="slip" tabindex="' + (ui.slipTorn ? 0 : -1) + '"' + (ui.slipTorn ? ' data-drag role="button" aria-label="Contact slip. Press Enter to open the contact screen."' : "") +
    '><p class="s-title">Contact slip</p><span class="email">' + esc(p.email) + '</span><div class="row"><button class="btn-quiet" data-act="copy">Copy address</button>' +
    p.links.map((l) => (safeUrl(l.url) ? '<a href="' + esc(safeUrl(l.url)) + '" target="_blank" rel="noopener">' + esc(l.label) + "</a>" : "")).join("") + "</div></div>";
  const receipt = '<article class="receipt' + (ui.slipTorn ? " torn" : "") + '" id="receipt" data-stamp-root tabindex="0"' + (ui.printed ? "" : " hidden") + ' aria-label="Entry record. Press A to stamp it approved or D to stamp it denied.">' +
    '<div class="rec stampable" data-stamp="record"><p class="r-title">Entry record</p><p>Desk 04 · ' + today + "</p>" +
    "<dl><dt>Name</dt><dd>" + esc(p.name) + "</dd><dt>Seeking</dt><dd>" + esc(p.seeking) + "</dd><dt>Based in</dt><dd>" + esc(p.basedIn) + "</dd><dt>Education</dt><dd>" +
    esc(e.degree) + ", " + esc(e.graduated) + '</dd></dl><p class="r-h">Strengths</p><ul>' + rt.state.strengths.filter(Boolean).map((s) => "<li>" + esc(s) + "</li>").join("") +
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
export const FACE = SPR.STAMP_FACE;
// panels in art pixels: resting and pressed; the pressed sprite stands on the same bottom-centre
export const STAMPS = {
  approved: { rest: [4, 38, 32, 10], press: [5, 36, 31, 8], fs: [17, 17] },
  denied: { rest: [4, 38, 32, 10], press: [5, 34, 30, 8], fs: [20, 20] },
};
export const ST = 2;
export function stampArt(kind) {
  const k = STAMPS[kind], a = ART["stamp-" + kind], b = ART["stamp-" + kind + "-pressed"], word = kind === "approved" ? "APPROVED" : "DENIED";
  const layer = (cls, art, name, pnl, fs, dx, dy) => '<span class="' + cls + '" style="left:' + dx + "px;top:" + dy + 'px">' + SPR.art(name, ST) +
    '<span class="word" style="left:' + pnl[0] * ST + "px;top:" + pnl[1] * ST + "px;width:" + pnl[2] * ST + "px;height:" + pnl[3] * ST + "px;font-size:" + fs + 'px">' + word + "</span></span>";
  return '<span class="stamp-art" style="width:' + a.w * ST + "px;height:" + a.h * ST + 'px">' + layer("st-rest", a, "stamp-" + kind, k.rest, k.fs[0], 0, 0) +
    layer("st-press", b, "stamp-" + kind + "-pressed", k.press, k.fs[1], Math.floor((a.w - b.w) * ST / 2), (a.h - b.h) * ST) + "</span>";
}
export const stampArtOld = (kind) => '<span class="stamp-art">' + SPR.stamp(kind, 2) + '<span class="word" style="left:' + FACE.x * 2 + "px;top:" + FACE.y * 2 + "px;width:" + FACE.w * 2 + "px;height:" + FACE.h * 2 + 'px">' +
  (kind === "approved" ? "APPROVED" : "DENIED") + "</span></span>";
export function renderFixed() {
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

// what this part sets up when the page starts (run in the original order by start.js)
export function start() {
  setTimeout(alarmTick, 0);
  setInterval(checkSky, 60000);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { fitPinboard(); layoutDrawer(false); });
}
