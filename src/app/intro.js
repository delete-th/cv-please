// The passport intro and the first visit.
import { rt } from "./core.js";
import { $, $$, ART, FX, PX, SPR, app, clamp, esc, introRoot, isPhone, reduced, today, ui } from "./core.js";
import { portraitAlt } from "./papers.js";
import { applyScene, placeStickers, relayout } from "./scene.js";
import { hideNote } from "./things.js";
import { held, keepBoxClear, placeTray, renderMarks, revealNav, slotBtn, springBack, updateBar } from "./stamps.js";
import { hideTag } from "./ambient.js";

// ----- intro: the passport, opened as a two-page spread -----
export const mrz = (s, n) => esc((String(s).toUpperCase().replace(/[^A-Z0-9]/g, "<") + "<".repeat(n)).slice(0, n));
// The passport is a small book. The right-hand leaf is hinged at the spine: its front is the visa,
// its back is the next left page (commendations), and turning it reveals the next right page (studies).
export const passCorner = (dir) => '<button class="corner ' + (dir > 0 ? "fwd" : "back") + '" data-act="flip-pass" aria-label="' + (dir > 0 ? "Turn the page" : "Turn back to the visa") + '">' + SPR.draw("corner", PX) + "</button>";
export function visaFront() {
  const p = rt.state.profile;
  return '<div class="visa-page visa stampable" data-stamp="visa"><h2>Entry visa</h2><dl class="visa-lines"><dt>Holder</dt><dd>' + esc(p.name) +
    "</dd><dt>Purpose</dt><dd>" + esc(p.seeking) + "</dd><dt>Issued</dt><dd>" + today + '</dd></dl><div class="stamp-box' + (ui.inked.visa ? " inked" : "") + '">Stamp box</div><div class="marks" data-marks="visa"></div></div>' + passCorner(1);
}
export function commendationsBack() {
  return '<div class="visa-page"><h2>Commendations</h2><div class="pp-stamps">' + rt.state.awards.filter((a) => a.result).map((a, i) =>
    '<span class="ink green" style="--tilt:' + [-4, 3, -2, 5][i % 4] + 'deg">' + esc(a.result) + "<small>" + esc(a.event + " " + a.year) + "</small></span>").join("") + "</div></div>" + passCorner(-1);
}
export function studiesUnder() {
  const e = rt.state.education;
  return '<div class="visa-page"><h2>Studies</h2><dl class="visa-lines"><dt>Degree</dt><dd>' + esc(e.degree) + "</dd><dt>School</dt><dd>" + esc(e.school) +
    "</dd><dt>Major</dt><dd>" + esc(e.major) + "</dd><dt>Graduated</dt><dd>" + esc(e.graduated) + "</dd><dt>Courses</dt><dd>" + esc(e.coursework) + "</dd></dl></div>";
}
// Turn the leaf around the spine in four stepped frames; on phones, squash it at the spine edge instead.
export function setLeaf(page, animate) {
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
export function flipPass() { setLeaf(ui.passPage ? 0 : 1, true); }
// the walk-in plays once per visit; this icon on the passport screen plays it again
export const replayBtn = () => (reduced() ? "" : '<button class="replay-btn" data-act="replay-intro" aria-label="Replay intro">' + SPR.draw("replay", 3) + '<span class="tip" aria-hidden="true">Replay intro</span></button>');
export function renderIntro() {
  const p = rt.state.profile, e = rt.state.education;
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
export const drawnPass = () => (rt.state.profile.passportStyle || "sprite") === "drawn" && !isPhone();
// The drawn passport follows the sprite sequence: upright, turned sideways (spine along the top), then opened upward.
// Canvas 80x116 art pixels; the spine runs along y 58. Data page below it (x 2-78, y 58-112), visa page above (y 4-58).
// Frames: 0 upright, 1 and 2 turning, 3 sideways, 4 cover lifting, 5 edge-on, 6 visa page unfolding, 7 open.
export const DP_BOX = [[13, 20, 67, 96], [8, 22, 72, 94], [5, 28, 75, 90], [2, 58, 78, 112], [2, 58, 78, 112], [2, 56, 78, 112], [2, 18, 78, 112], [2, 4, 78, 112]];
export const DP_HOLD = [0, 80, 80, 250, 90, 90, 90, 90];
export function drawnScale() { return clamp(Math.floor((window.innerHeight - 72 - 16 - 64 - 16) / 108), 4, 6); }
export function renderDrawnPassport() {
  const p = rt.state.profile, e = rt.state.education, S = drawnScale(), pv = p.passport || {};
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
export function passScale() { return isPhone() ? 3 : clamp(Math.floor((window.innerHeight - 300) / 113), 4, 6); }
// the visible part of each frame on the 104x128 canvas, so the book itself is what gets centred
export const PP_BOX = [[25, 50, 80, 124], [11, 43, 94, 128], [8, 46, 97, 128], [15, 60, 89, 115], [15, 60, 89, 115], [15, 60, 89, 115], [15, 28, 89, 115], [15, 2, 89, 115]];
export function placePassport(f) {
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
export function passLayout(S) {
  const vh = window.innerHeight, trayTop = vh - 72 - ($("#stampbar") ? $("#stampbar").offsetHeight : 160);
  const group = 24 + 20 + 44 + 20 + 74 * S, top0 = Math.max(8, (vh - 72 - group) / 2);
  let canvas = top0 + 108 - 50 * S;
  const maxCanvas = trayTop - 16 - 115 * S;
  canvas = Math.min(canvas, maxCanvas);
  return { ok: canvas + 2 * S >= 4, canvas: Math.round(canvas), words: Math.round(canvas + 50 * S - 108) };
}
export function trayClear() { const bar = $("#stampbar"); return (bar ? bar.offsetHeight : 210) + 80; }
// the turn (frames 1-3) then the opening (4-7), in hard steps; closing plays it backwards
export const PP_HOLD = [0, 80, 80, 250, 90, 90, 90, 90];
export function setFrame(f) {
  const pp = $("#passport"), fr = $("#pp-frames"); if (!pp) return;
  pp.dataset.frame = f;
  if (fr) fr.style.backgroundPosition = -104 * f * (+pp.style.getPropertyValue("--pp") || 4) + "px 0";
  placePassport(f);
}
export function playPassport(dir) {
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
export function introNext() {
  if (ui.introStep !== 0) return;
  const it = $("#intro"); if (it) it.classList.add("opened");
  playPassport(1);
  ui.introStep = 1;
  $("#say").textContent = "";

  FX.play("rustle");
  setTimeout(() => { updateBar(); const b = slotBtn("approved"); if (b) b.focus({ preventScroll: true }); setTimeout(keepBoxClear, reduced() ? 0 : 220); }, reduced() ? 0 : 500);
}
export function inspectPassport() {
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
export function closeIntro() {
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
export let firstRun = null;
export function firstVisit() {
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
