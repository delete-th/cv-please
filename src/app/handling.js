// Picking up, carrying and putting down papers.
import { rt } from "./core.js";
import { $, $$, FX, clamp, esc, isPhone, rectOf, reduced, ui } from "./core.js";
import { caseIds, caseIndex, caseInner, folderInner, paginate, paperEl, paperIds, paperLabel, pst } from "./papers.js";
import { LANE, MID_X, TOP, boxRect, filedFocus, setPos, slotPos, still, usable } from "./scene.js";
import { refreshSkills } from "./drawers.js";
import { say } from "./intercom.js";
import { hideTag } from "./ambient.js";

// ----- handling papers -----
export function raise(el) {
  if (rt.topZ > 600) {
    // keep the pile's order but pull the numbers back down, so the lamp light and bar stay on top
    $$("#desk .paper, #desk .sticker").sort((a, b) => (+a.style.zIndex || 0) - (+b.style.zIndex || 0)).forEach((e, k) => { e.style.zIndex = 10 + k; });
    rt.topZ = 10 + $$("#desk .paper, #desk .sticker").length;
  }
  el.style.zIndex = ++rt.topZ;
  if (el.classList.contains("paper")) { ui.front = el.dataset.id; refreshSkills(); }
}
export function markHandled() { if (!ui.handled) { ui.handled = true; ui.maxOut = Math.max(ui.maxOut, (ui.scene && ui.scene.out) || 0); } }
// An open file takes the left side of the desk, over the box and the ID card, as tall as the desk allows.
// The diploma and commendations stay where they are and stay readable.
export function placeOpen(el) {
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
export function slideAside(open) {
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
export function slideBack() {
  if (paperIds().some((id) => pst(id).open)) return;
  ["id", "diploma", "honours"].forEach((id) => {
    const e = paperEl(id), st = pst(id);
    if (!e || !st.aside) return;
    st.x = st.aside[0]; st.y = st.aside[1]; st.aside = null;
    e.classList.add("moving"); setPos(e, st.x, st.y);
  });
}
export function openCase(id) {
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
export function closeCase(id, quiet) {
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
export function turn(part, swap) {
  if (reduced() || !part) { swap(); return; }
  part.classList.add("flip-out");
  setTimeout(() => { swap(); if (part.isConnected) part.classList.remove("flip-out"); }, 95);
}
// A sheet turning over inside the folder: the current page lifts from its right edge and turns over its
// left edge in four steps, with the next page already visible underneath. Going back reverses it.
export function startSheet(id, dir) {
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
export function peel(sheet, t) {
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
export function peelTo(sheet, target, done) {
  const from = sheet._t || 0, n = Math.max(1, Math.round(Math.abs(target - from) * 8));
  for (let k = 1; k <= n; k++) setTimeout(() => peel(sheet, from + (target - from) * k / n), k * 38);
  setTimeout(done, n * 38 + 30);
}
export function finishSheet(id, sheet, dir, complete) {
  const el = paperEl(id), st = pst(id), i = caseIndex(id), to = st.page + dir;
  const target = complete ? (dir > 0 ? 1 : 0) : (dir > 0 ? 0 : 1);
  peelTo(sheet, target, () => {
    if (complete) st.page = to;
    el.classList.remove("turning");
    el.innerHTML = caseInner(i);
    focusPageControl(el, dir);
  });
}
export function flipCase(id, dir) {
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
export function focusPageControl(el, dir) {
  const b = (dir > 0 ? $(".corner", el) : $(".pg-back", el)) || $(".corner", el) || $(".pg-back", el);
  if (b) b.focus({ preventScroll: true });
}
export function takeOut(id, instant) {
  const el = paperEl(id), st = pst(id), i = caseIndex(id);
  if (!st.inBox) return;
  st.inBox = false;
  el.classList.remove("filed"); filedFocus(el, false);
  const u = usable(), out = st.outPos || [boxRect().x + 8 + (i % 3) * 18, Math.max(u.top + 4, boxRect().y - 150 + (i % 3) * 14)];
  st.x = out[0]; st.y = out[1];
  if (instant) still(el, () => setPos(el, st.x, st.y)); else { el.classList.add("moving"); setPos(el, st.x, st.y); FX.play("lift"); }
  raise(el);
}
export function fileBack(id, quiet) {
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
export function putAllBack() {
  const out = caseIds().filter((id) => !pst(id).inBox || pst(id).open);
  if (!out.length) return;
  out.forEach((id, k) => setTimeout(() => fileBack(id, true), reduced() ? 0 : k * 40));
  FX.play("filebox");
}
export function putAway(id, prev) {
  if (caseIndex(id) >= 0) { fileBack(id); return; }
  const el = paperEl(id), st = pst(id);
  if (st.open) closeCase(id);
  st.away = true; st.prev = prev;
  el.classList.add("leaving"); FX.play("rustle");
  setTimeout(() => { el.classList.remove("leaving"); el.classList.add("away"); renderPutAway(); }, reduced() ? 0 : 210);
}
export function returnPaper(id) {
  const el = paperEl(id), st = pst(id), prev = st.prev || { x: MID_X, y: TOP };
  st.away = false; st.x = prev.x; st.y = prev.y;
  el.classList.remove("away", "packed");
  still(el, () => setPos(el, prev.x, -el.offsetHeight));
  el.classList.add("moving"); setPos(el, prev.x, prev.y);
  raise(el); renderPutAway(); FX.play("rustle");
  el.focus({ preventScroll: true });
}
export function renderPutAway() {
  const box = $("#putaway"), away = paperIds().filter((id) => pst(id).away);
  if (box) box.innerHTML = away.map((id) => '<button class="chip" data-act="return" data-id="' + id + '">' + esc(paperLabel(id)) + "</button>").join("");
  const hint = $("#counter-hint"); if (hint) hint.hidden = away.length > 0;
}
// Papers, stickers and the torn slip stay wholly inside whatever they sit on.
export function moveTo(el, x, y) {
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
