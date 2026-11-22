// Laying out the desk: the scroll scene, the papers' places and the furniture.
import { rt } from "./core.js";
import { $, $$, BX, FX, clamp, isPhone, rectOf, reduced, ui } from "./core.js";
import { ORDER, caseIndex, paperEl, paperIds, pst } from "./papers.js";
import { fitPinboard } from "./booth.js";
import { placeOpen } from "./handling.js";
import { layoutDrawer } from "./drawers.js";
import { drawHands, placePobj } from "./things.js";
import { placeTray, updateBar } from "./stamps.js";
import { checkLamp, setLampVisible } from "./lamp.js";
import { say } from "./intercom.js";
import { placePassport } from "./intro.js";

// ----- scroll scene: the booth builds, then the file unpacks -----
export const B_SHUT = 160, B_COUNTER = 120, B_LAMP = 70, B_BOARD = 70, BOOT = B_SHUT + B_COUNTER + B_LAMP + B_BOARD, UNIT = 110, DWELL = 320;
export const stageH = () => Math.max(window.innerHeight, 600);
export const unpackEnd = () => BOOT + ORDER().length * UNIT;
export const docTop = (el) => rectOf(el).top + window.scrollY;
export const FLOOR = 28;
export function sizeScene() {
  const sc = $("#scene"), stage = $("#stage");
  if (!sc) return;
  sc.style.height = "";
  if (isPhone()) { stage.style.height = ""; return; }
  stage.style.height = window.innerHeight - FLOOR + "px";
}
export const deskScroll = (top, how) => { if (isPhone()) window.scrollTo({ top: top, behavior: how || "auto" }); };
export function sceneNow() {
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
export function applyScene(force) {
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
  if (s.board !== prev.board) { if (s.board) rt.board.start(); else rt.board.blank(); }
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
export const LANE = 170, MID_X = 300, TOP = 50, BOTTOM = 68, SLOT = 22;
export const usable = () => { const d = $("#desk"); return { w: d.clientWidth, h: d.clientHeight, top: TOP, bottom: d.clientHeight - BOTTOM - 6 }; };
// the file box sits in the bottom-left corner; each folder has its own slot in it
export function boxRect() { const b = $("#filebox"); return { x: b.offsetLeft, y: b.offsetTop, w: b.offsetWidth, h: b.offsetHeight }; }
// inside the tray (art pixels 6..47 across, 3..33 down at 3x): one 12px row per folder, its tab on top
export function slotPos(i) { const b = boxRect(); return [b.x + 7 * BX, b.y + (5 + 7 * i) * BX]; }
// a folder in the box is reached by its tab; out on the desk, by the folder itself
export function filedFocus(el, filed) {
  el.tabIndex = filed ? -1 : 0;
  const t = $(".folder-tab", el);
  if (t) { t.tabIndex = filed ? 0 : -1; if (filed) t.removeAttribute("aria-hidden"); else t.setAttribute("aria-hidden", "true"); }
}
export function placeFurniture() {
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
export function computeFit() {
  const dk = $("#desk"); if (dk) dk.classList.toggle("short", !isPhone() && window.innerHeight < 760);
  if (isPhone()) { ui.fit = 1; return; }
  const u = usable(), avail = u.bottom - u.top, el = (id) => paperEl(id);
  const mids = ["id", "diploma", "honours"].map(el), midH = Math.max.apply(null, mids.map((e, k) => e.offsetHeight + [8, 16, 0][k]));
  const left = boxRect().w + 30, minW = mids[0].offsetWidth - 54 + mids[1].offsetWidth - 36 + mids[2].offsetWidth;
  ui.fit = clamp(Math.min(avail / midH, (u.w - LANE - left) / minW), 0.75, 1);
  $("#desk").style.setProperty("--fit", ui.fit.toFixed(3));
}
export const EDGE = 24, GAP = 16;
export function colPlan() {
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
export function landing(id, el) {
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
export function envCenter() { const e = $("#envelope"); return [e.offsetLeft + e.offsetWidth / 2, e.offsetTop + e.offsetHeight / 2]; }
export function setPos(el, x, y) { el.style.left = x + "px"; el.style.top = y + "px"; }
export function still(el, fn) { el.classList.remove("moving"); el.style.transition = "none"; fn(); void el.offsetWidth; el.style.transition = ""; }
export function unpack(id, instant, order) {
  const el = paperEl(id), st = pst(id);
  if (!el || st.away) return;
  if (st.x == null) { const p = landing(id, el); st.x = p[0]; st.y = p[1]; }
  if (isPhone()) { el.classList.remove("packed"); return; }
  const go = () => { el.classList.remove("packed"); setPos(el, st.x, st.y); el.style.zIndex = st.inBox ? 20 + caseIndex(id) : 10 + (order || 0); };
  if (instant) still(el, go); else { el.classList.add("moving"); go(); FX.play("rustle"); }
}
export function pack(id, instant) {
  const el = paperEl(id), st = pst(id);
  if (!el || st.away || isPhone()) return;
  const c = envCenter(), go = () => { el.classList.add("packed"); setPos(el, Math.round(c[0] - el.offsetWidth / 2), Math.round(c[1] - el.offsetHeight / 2)); };
  if (instant) still(el, go); else { el.classList.add("moving"); go(); }
}
// the note pad sits on the desk's right side, under the mug; the sent note sticks to the desk edge
export function placeNotepad() {
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
export function placeStickers() {
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
export function placePlant() {
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
export function relayout() {
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
export function onResize() {
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
