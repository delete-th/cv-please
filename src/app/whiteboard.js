// The whiteboard on the wall above the desk, and the blue marker that leads to it.
import { rt } from "./core.js";
import { $, $$, ART, FX, SPR, clamp, esc, fixedRoot, isPhone, rectOf, reduced, shortName, ui } from "./core.js";
import { caseIndex } from "./papers.js";
import { setDrawer } from "./drawers.js";
import { hideNote } from "./things.js";
import { goRoom, updatePill } from "./nav.js";
import { hideTag } from "./ambient.js";

// ----- the whiteboard on the wall above the desk -----
// The board sprite is 106x84 art pixels: writing surface x 7 to 96, y 12 to 69; the marker tray along y 71 to 79.
// The board shows only the switch, the title, the example line, six numbered steps and one step note;
// the magnets, markers and eraser are small things at 2x.
export const WB = () => rt.state.whiteboard || { modes: [] };
export const TOOL = 2;
export const wbModeOf = () => WB().modes.find((x) => x.id === ui.wbMode) || WB().modes[0];
export const caseByName = (n) => { const i = rt.state.projects.findIndex((x) => x.name.toLowerCase().startsWith(String(n || "").toLowerCase())); return i < 0 ? null : "case-" + i; };
// a hand-drawn circle: two loose strokes that do not quite meet
export const ringSVG = '<svg class="wb-ring" viewBox="0 0 40 40" aria-hidden="true"><path d="M21 4 C31 4 37 11 36 21 C35 31 27 36 19 36 C10 35 4 28 4 19 C5 10 12 5 23 6"/></svg>';
export function wallHTML() {
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
export function wallEl() {
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
export function sizeWall() {
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
export function openWall(fromCase) {
  if (ui.wall || ui.view !== "desk" || $("#intro") || rt.editing) return;
  const from = typeof fromCase === "string" ? fromCase : null;
  if (from !== (ui.wbFrom || null) || from) {
    ui.wbFrom = from;
    if (from) { const pr = rt.state.projects[caseIndex(from)]; ui.wbMode = boardFor(pr) || ui.wbMode; ui.wbFromMode = ui.wbMode; }
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
export function closeWall() {
  if (!ui.wall) return;
  ui.wall = false;
  document.documentElement.classList.remove("on-wall");
  const site = $(".site"); if (site) site.inert = false;
  const w = $("#wall"); if (w) w.inert = true;
  FX.play("dwslide"); updatePill();
  setTimeout(() => { const b = $(".desk-marker:not([hidden])") || $(".peek-btn"); if (b && !isPhone() && !ui.wbBackTo) b.focus({ preventScroll: true }); }, reduced() ? 0 : 620);
}
// write the current mode on the board: each piece appears in turn, about 80ms apart, like it is being written
export function wbDraw(animate, quiet) {
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
export function boardFor(p) { const r = String((p && p.role) || "").trim(); return !r ? null : /lead/i.test(r) ? "lead" : "solo"; }
export const wbFromCase = (md) => (ui.wbFrom && ui.wbFromMode === md.id ? ui.wbFrom : null);
export const wbCaseName = (md) => { const c = wbFromCase(md); return c ? shortName(rt.state.projects[caseIndex(c)]) : md.case; };
// drawing order: title, example, then the steps
export function wbRank(x) { return x.id === "wb-title" ? 0 : x.id === "wb-eg" ? 1 : 2 + +(x.dataset.i || 0); }
export function wbMode(id) {
  if (id === ui.wbMode && ui.wbShown) return;
  ui.wbMode = id;
  wbWipe(() => wbDraw(true));
}
// the eraser sweeps across the board in two-frame strokes, and whatever it passes is gone
export function wbWipe(then) {
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
export function wbSelect(i, quiet) {
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
export function wbCard(i) { if (i == null) wbSelect(null, true); }
// picking up the eraser: rub out whatever it passes over; the board writes itself back a moment after it is put down
export let rub = null;
export function rubMove(ev) {
  const s = ART[rub.f % 2 ? "eraser-wipe-r" : "eraser-wipe-l"], w = s.w * rub.k, h = s.h * rub.k;
  rub.er.src = s.src; rub.er.width = w; rub.er.height = h;
  rub.er.style.left = Math.round(ev.clientX - w / 2) + "px"; rub.er.style.top = Math.round(ev.clientY - h / 2) + "px";
  const r = { left: ev.clientX - w / 2, right: ev.clientX + w / 2, top: ev.clientY - h / 2, bottom: ev.clientY + h / 2 };
  $$("#wb .wb-i.on").forEach((it) => { const q = rectOf(it); if (q.left < r.right && r.left < q.right && q.top < r.bottom && r.top < q.bottom) { it.classList.remove("on"); it.classList.add("rubbed"); } });
}
export function swallowNextClick() {
  const eat = (e) => { e.stopPropagation(); e.preventDefault(); document.removeEventListener("click", eat, true); };
  document.addEventListener("click", eat, true); setTimeout(() => document.removeEventListener("click", eat, true), 300);
}
export let markerDrag = null;
export function markerSlot() { return rectOf($(".pk-blue")); }
export function markerHome(btn, fromDrag) {
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

// what this part sets up when the page starts (run in the original order by start.js)
export function start() {
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
    rt.markerDragged = true; setTimeout(() => { rt.markerDragged = false; }, 300);
    const r = rectOf(d.b), t = markerSlot(), pk = rectOf($(".peek-btn")), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    const near = Math.hypot(cx - (t.left + t.width / 2), cy - (t.top + t.height / 2)) < 60 + t.width / 2 || (cx > pk.left && cx < pk.right && cy > pk.top && cy < pk.bottom);
    if (near) { const tr = (d.b.style.translate || "0px 0px").split(" ").map(parseFloat); d.b.style.translate = ""; markerHome(d.b, [0, 0]); void tr; return; }
    // not near the tray: it rolls back to where it was lying
    d.b.classList.remove("held"); d.b.classList.add("sliding"); d.b.style.translate = "";
    setTimeout(() => d.b.classList.remove("sliding"), 260);
  });
}
