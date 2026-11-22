// The rubber stamps and the stamp tray.
import { rt } from "./core.js";
import { $, $$, FX, behavior, clamp, fixedRoot, inside, isPhone, rectOf, reduced, ui, wait } from "./core.js";
import { FACE, deniedLine, fitPinboard, stampArt } from "./booth.js";
import { layoutDrawer } from "./drawers.js";
import { receiptEl } from "./printer.js";
import { say } from "./intercom.js";
import { closeIntro } from "./intro.js";

// ----- the stamps -----
// Stamps live in their slots on the bar. Drag one onto a paper and let go: it presses down, leaves ink exactly
// under its face, then slides back to its slot. Let go anywhere else and it just slides back.
export const onScreen = (el) => { if (!el || (!el.offsetParent && getComputedStyle(el).position !== "fixed")) return false; const r = rectOf(el); return r.bottom > 0 && r.top < window.innerHeight && r.right > 0 && r.left < window.innerWidth; };
export function stampables() { return $$(".stampable").filter((s) => onScreen(s) && $(".stamp-box", s) && !s.closest(".pp-leaf.turned")); }
export function stampableAt(x, y) { return stampables().find((s) => inside(rectOf(s), x, y)) || null; }
export function stampableShown() {
  if ($("#intro")) return ui.introStep >= 1 && !ui.introDone;
  if (ui.view !== "desk" || rt.editing || ui.contactOpen) return false;
  const r = receiptEl();
  if (!r || r.hidden || !ui.printed) return false;
  const b = rectOf(r), box = $(".stamp-box", r);
  if (!box) return false;
  // open only once the record's stamp box is clear of where the tray would sit
  const bb = rectOf(box);
  return b.bottom > 120 && bb.top >= 8 && bb.bottom <= trayTopOpen() - 16;
}
// the top edge of the tray when it is open, whether or not it is open now
export function trayTopOpen() { const g = $("#pills"), bar = $("#stampbar"); return g && bar ? rectOf(g).top - 8 - bar.offsetHeight : window.innerHeight; }
export function updateBar() {
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
export function placeTray() {
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
export function revealNav() {
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
export function keepBoxClear() {
  const bar = $("#stampbar"), intro = $("#intro");
  if (!bar || !bar.classList.contains("out")) return;
  const box = intro ? $("#intro .visa .stamp-box") : (ui.printed && receiptEl() && !receiptEl().hidden ? $(".stamp-box", receiptEl()) : null);
  if (!box || !onScreen(box)) return;
  const top = trayTopOpen(), b = rectOf(box), by = b.bottom - top + 24;
  if (!intro && !isPhone()) return;
  if (bar.classList.contains("side")) return;
  if (b.bottom > top - 16) (intro || window).scrollBy({ top: by, behavior: behavior() });
}
export function toggleTray(force) {
  const open = force != null ? force : !$("#stampbar").classList.contains("out");
  ui.barPinned = open; updateBar();
  if (open) { keepBoxClear(); const first = $("#stampbar .stamp-btn"); if (first) setTimeout(() => first.focus({ preventScroll: true }), reduced() ? 0 : 210); }
  else if (document.activeElement && document.activeElement.closest("#stampdock")) $("#stamp-handle").focus({ preventScroll: true });
}
export function markHTML(m) {
  return '<span class="mark ink ' + (m.kind === "approved" ? "green" : "red") + '" style="left:' + m.x + "px;top:" + m.y + "px;--tilt:" + m.rot + "deg;opacity:" + m.op +
    ";--mx:" + m.mx + "px;--my:" + m.my + 'px">' + (m.kind === "approved" ? "APPROVED" : "DENIED") + (m.really ? '<span class="really">...really?</span>' : "") + "</span>";
}
export function renderMarks(key) {
  $$('[data-marks="' + key + '"]').forEach((el) => {
    el.innerHTML = ui.marks[key].map(markHTML).join("");
    const box = $(".stamp-box", el.parentNode); if (box) box.classList.toggle("inked", ui.inked[key]);
  });
}
export function inkAt(s, x, y, kind) {
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
export let held = null;
export const slotBtn = (kind) => $('.stamp-btn[data-kind="' + kind + '"]');
export function heldFace() { return rectOf($(".word", held.el)); }
export function pickUp(kind, mode) {
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
export function placeHeld(x, y, animate) {
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
export function springBack(now) {
  if (!held) return;
  const h = held; held = null;
  $("#ink-preview").hidden = true;
  const art = rectOf($(".stamp-art", h.btn)), done = () => { h.el.remove(); h.btn.classList.remove("empty"); updateBar(); if (!now) FX.play("clack"); };
  if (now || reduced()) { done(); return; }
  h.el.classList.remove("lifted", "pressed"); h.el.classList.add("glide");
  h.el.style.left = art.left + "px"; h.el.style.top = art.top + "px";
  setTimeout(done, 210);
}
export function stampDown() {
  if (!held || held.busy) return;
  const h = held; h.busy = true;
  $("#ink-preview").hidden = true;
  const s = h.over || stampableAt(h.fx, h.fy), x = h.fx, y = h.fy;
  const finish = () => { if (s) inkAt(s, x, y, h.kind); else FX.play("tick"); };
  if (reduced()) { finish(); springBack(); return; }
  h.el.classList.remove("glide"); h.el.classList.add("pressed");
  setTimeout(() => { finish(); setTimeout(() => { h.el.classList.remove("pressed"); setTimeout(springBack, 70); }, 40); }, 90);
}
export async function stampOnto(root, kind) {
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
export function afterStamp(key, kind) {
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
