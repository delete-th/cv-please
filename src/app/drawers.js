// The two desk drawers, Skills and Personal.
import { rt } from "./core.js";
import { $, $$, ART, FX, SC, SPR, clamp, esc, fixedRoot, isPhone, rectOf, reduced, shortName, ui } from "./core.js";
import { frontCase, skillsHTML, uses } from "./papers.js";
import { BOTTOM } from "./scene.js";
import { markHandled } from "./handling.js";
import { hideNote, placePobj } from "./things.js";
import { say } from "./intercom.js";
import { hideTag } from "./ambient.js";

// ----- the two desk drawers, Skills and Personal: one drawer sprite, only the front shows until it opens -----
export const DW_FRONT = 16, DW_FLOOR = { x: 14, y: 14, w: 182, h: 122 };
// Thea's things in the Personal drawer, at their spots on the drawer floor (art pixels)
export const POBJ = {
  bottle: { art: "cola-bottle", x: 20, y: 19, label: "Glass bottle", hint: "Press Enter to nudge it." },
  watch: { art: "watch", x: 40, y: 66, rot: true, label: "Watch, showing your local time", hint: "Press Enter to slow time down." },
  sketchbook: { art: "sketchbook-closed", x: 147, y: 23, label: "Sketchbook", hint: "Press Enter to open it." },
  usb: { art: "usb", x: 18, y: 110, label: "USB stick with a tape label", hint: "Press Enter to plug it in and open Thea's GitHub in a new tab." },
  gum: { art: "gum", x: 76, y: 114, label: "Pack of stick gum", hint: "Press Enter to slide a stick out." },
  mints: { art: "mints-3", x: 162, y: 88, label: "Tin of mints", hint: "Press Enter to take a mint." },
  keycap: { art: "keycap-up", x: 127, y: 108, label: "Keycap fidget toy", hint: "Press Space or Enter to click it." },
};
export const noteOf = (id) => ((rt.state.effects || []).find((e) => e.id === id) || {}).note || "";
export function pobjHTML(id) {
  const o = POBJ[id], a = ART[o.art];
  return '<span class="pobj p-' + id + (o.rot ? " rot" : "") + '" data-p="' + id + '" data-drag role="button" tabindex="0" aria-label="' + esc(o.label + ". " + o.hint + " Press M to move it between the drawer and the desk.") +
    '" style="--aw:' + a.w + ";--ah:" + a.h + '">' + SPR.art(id === "mints" ? "mints-" + ui.mints : o.art, SC) + (id === "watch" ? '<canvas class="hands" width="' + a.w + '" height="' + a.h + '" aria-hidden="true"></canvas>' : "") +
    (id === "keycap" ? SPR.art("keycap-down", SC, "k-down") : "") + (id === "usb" ? SPR.art("usb-on", SC, "u-on") : "") + (id === "gum" ? SPR.art("gum", SC, "g-stick") : "") + "</span>";
}
export const TABC = ['#8fa7b8', '#b9a2c4', '#8fb39a', '#d9b26a', '#c98b7a', '#a7b78a', '#9a9a8c'];
export const FS = 4;
// closed fronts on the desk edge are drawn at 4x so the plate fits its label
export const floorHTML = (id) => '<div class="dw-floor dw-floor-' + id + '" id="' + (id === "skills" ? "drawer-box" : "dw-things") + '">' +
  (id === "skills" ? (isPhone() ? skillsHTML() : cardsHTML()) : Object.keys(POBJ).map(pobjHTML).join("")) + "</div>";
export function drawerHTML(id, label) {
  const a = ART.drawer, floorId = id === "skills" ? "drawer-box" : "dw-things";
  return '<div class="dw dw-' + id + '" id="dw-' + id + '" data-dw="' + id + '" style="--dw-w:' + a.w * FS + "px;--dw-h:" + a.h * FS + 'px">' + SPR.art("drawer", FS, "dw-art") +
    (isPhone() ? floorHTML(id) : "") +
    '<button class="dw-front" data-act="dw" data-dw="' + id + '" data-tag="' + label + '" aria-label="' + label + ' drawer" aria-expanded="false" aria-controls="' + floorId + '"></button></div>';
}
// the open drawer, pulled out toward the visitor: one big drawer whose floor shows the chosen drawer's contents
export function bigDrawerHTML() {
  if (isPhone()) return "";
  return '<div class="dw-big" id="dw-big" role="region" aria-label="Open drawer"><img class="dw-big-art" id="dw-big-art" alt="" aria-hidden="true">' + floorHTML("skills") + floorHTML("personal") +
    '<button class="dw-big-front" id="dw-big-front" data-act="dw-close" aria-label="Close the drawer"></button></div>';
}
// Skills as an index-card file: one card per group, standing back to front, tabs staggered
export function cardsHTML() {
  const p = frontCase();
  return '<div class="cardfile">' + rt.state.skills.map((g, i) => {
    const used = p && g.items.some((s) => uses(p.stack, s)), hot = ui.hot && g.items.includes(ui.hot);
    return '<div class="icard ic-' + ["left", "mid", "right"][i % 3] + (ui.liftCard === i ? " lifted" : "") + '" style="--i:' + i + '"><button class="ic-tab' + (used ? " used" : "") + (hot ? " hot" : "") +
      '" data-act="card" data-i="' + i + '" aria-expanded="' + (ui.liftCard === i) + '">' + esc(g.group) + "</button></div>";
  }).join("") + "</div>";
}
export function liftHTML(i) {
  const g = rt.state.skills[i], p = frontCase();
  return '<div class="sk-lift-card" role="dialog" aria-label="' + esc(g.group) + ' skills"><p class="sl-tab">' + esc(g.group) + '</p><div class="sl-chips">' +
    g.items.map((s) => '<button class="sk' + (ui.hot === s ? " hot" : "") + (p && uses(p.stack, s) ? " used" : "") + '" data-act="skill" data-s="' + esc(s) + '" aria-pressed="' + (ui.hot === s) + '">' + esc(s) + "</button>").join("") +
    "</div>" + usedInHTML(g) + '<button class="sl-back icon-btn" data-act="card-back" aria-label="Back in the drawer">' + SPR.draw("tobox", 2) + '<span class="ib-tip" aria-hidden="true">Back in the drawer</span></button></div>';
}
export function usedInHTML(g) {
  const sk = ui.hot && g.items.includes(ui.hot) ? ui.hot : null;
  if (!sk) return '<p class="sl-note">Pick a skill to see which case files used it.</p>';
  const files = rt.state.projects.map((x, i) => [x, i]).filter((x) => uses(x[0].stack, sk));
  return '<div class="sl-used"><span class="sl-used-lab">Used in:</span>' + (files.length ? files.map((x) => '<button class="sl-file" data-act="open-from-card" data-id="case-' + x[1] + '">' + esc(shortName(x[0])) + "</button>").join("") : "<span>no case file yet</span>") + "</div>";
}
// the card sits centred over the open drawer, with the room dimmed a little behind it
export function placeLift() {
  const ov = $("#sk-lift"), big = $("#dw-big");
  if (!ov || ov.hidden || !big) return;
  const r = rectOf(big), card = $(".sk-lift-card", ov), w = Math.min(980, r.width - 48, window.innerWidth - 32);
  card.style.width = w + "px";
  const h = card.offsetHeight, top = clamp(r.top + (Math.min(r.bottom, window.innerHeight - 84) - r.top - h) / 2, 40, window.innerHeight - 84 - h);
  card.style.left = Math.round(r.left + (r.width - w) / 2) + "px"; card.style.top = Math.round(top) + "px";
}
export function liftCard(i) {
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
export const DWIMG = new Image();
export const dwCache = {};
export function stretchedDrawer(cols) {
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
export function dwGeom() {
  const vw = window.innerWidth, vh = window.innerHeight, a = ART.drawer;
  let sc = 2;
  for (let k = 8; k >= 2; k--) if (a.h * k <= vh - 120 && a.w * k <= Math.min(vw * 0.8, 1100)) { sc = k; break; }
  const cols = Math.max(a.w, Math.floor(Math.min(vw * 0.75, 1100) / sc)), extra = cols - a.w;
  const mapX = (x) => (x < 80 ? x : x < 130 ? x + Math.floor(extra / 2) : x + extra);
  return { sc: sc, cols: cols, extra: extra, mapX: mapX, w: cols * sc, h: a.h * sc };
}
export function layoutDrawer(animate) {
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
export function setDrawer(id) {
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
export function closeDrawer(noFocus) {
  const id = ui.dwOpen;
  if (!id) return;
  if (ui.liftCard != null) liftCard(null);
  setDrawer(null);
  if (!noFocus) { const f = $("#dw-" + id + " .dw-front"); if (f) f.focus({ preventScroll: true }); }
}
export function refreshSkills() {
  const b = $("#drawer-box"); if (b) b.innerHTML = isPhone() ? skillsHTML() : cardsHTML();
  const ov = $("#sk-lift"), card = ov && $(".sk-lift-card", ov);
  if (card && !ov.hidden && ui.liftCard != null) {
    const g = rt.state.skills[ui.liftCard], p = frontCase();
    $$(".sl-chips .sk", card).forEach((k) => { const sk = k.dataset.s; k.classList.toggle("hot", ui.hot === sk); k.setAttribute("aria-pressed", String(ui.hot === sk)); k.classList.toggle("used", !!(p && uses(p.stack, sk))); });
    const old = $(".sl-note, .sl-used", card);
    if (old) { const t = document.createElement("div"); t.innerHTML = usedInHTML(g); old.replaceWith(t.firstElementChild); }
  }
}

// what this part sets up when the page starts (run in the original order by start.js)
export function start() {
  DWIMG.src = ART.drawer.src;
}
