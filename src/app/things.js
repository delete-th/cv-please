// Thea's things in the drawer: notes, the watch, the bottle, the sketchbook, the alarm clock.
import { rt } from "./core.js";
import { $, $$, ART, FX, SC, SPR, clamp, esc, fixedRoot, inside, isPhone, rectOf, reduced, safeUrl, ui } from "./core.js";
import { usable } from "./scene.js";
import { moveTo, raise } from "./handling.js";
import { DW_FLOOR, POBJ, dwGeom, noteOf, setDrawer } from "./drawers.js";
import { say } from "./intercom.js";

// ----- Thea's things: notes, the watch, the bottle and the sketchbook -----
export const noteTurn = {};
export function showNote(el, line) {
  const id = el.dataset.p, lines = (line || noteOf(id)).split("|").map((x) => x.trim()).filter(Boolean);
  if (!lines.length || isPhone()) return;
  noteTurn[id] = ((noteTurn[id] == null ? -1 : noteTurn[id]) + 1) % lines.length;
  theaSpeak(lines[noteTurn[id]]);
}
// Thea says a line in her speech bubble: typed out a few letters at a time with a small talking blip,
// her mouth opening and closing in the booth window and her shoulders bobbing a pixel as she talks
export function theaSpeak(said, holdMs, away) {
  if (!said || isPhone()) return;
  let b = $("#thea-say");
  if (!b) {
    b = document.createElement("div"); b.id = "thea-say"; b.className = "thea-say"; b.setAttribute("role", "status");
    b.innerHTML = '<span class="ts-face" aria-hidden="true">' + SPR.applicant(rt.state.profile.applicant || "thea", 1, "") + '</span><p class="ts-text"></p>';
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
export function hideNote() { const b = $("#thea-say"); if (b) b.hidden = true; const n = $("#pnote"); if (n) n.hidden = true; }
// the hands are pixel lines on a canvas the size of the sprite, so they turn with it and stay on the art grid
export const WATCH = { cx: 16.5, cy: 50 };
export let slow = null;
export function shownTime() {
  const now = new Date();
  if (!slow) return now;
  return new Date(slow.from + Math.floor((Date.now() - slow.from) / 3000) * 1000);
}
export function drawHands() {
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
export let lastSec = -1;
// Slow time: about 12 seconds where the second hand ticks every 3 seconds, animations run at a third of their
// speed, the desk dims a little, the lamp pool warms a step and sounds drop in pitch. Then it eases back.
export function slowAnimations() { document.getAnimations().forEach((a) => { if (a.playbackRate !== 1 / 3) a.playbackRate = 1 / 3; }); }
export function setSlow(on) {
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
export function usePobj(el) {
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
    const url = ((rt.state.profile.links || []).find((l) => /github\.com/i.test(l.url || "")) || {}).url || "https://github.com/delete-th";
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
  if (id === "sketchbook") { say("sketchbook"); if ((rt.state.sketches || []).length) openSketchbook(); }
}
// move a thing between its drawer spot and the desk (dragging does the same with the pointer)
export function keyPress(el, down) {
  if (!el) return;
  if (down) { if (!el.classList.contains("pressed")) FX.play("keyclack"); el.classList.add("pressed"); }
  else el.classList.remove("pressed");
}
export const pobjFloor = () => $('#dw-big.open[data-dw="personal"] .dw-floor-personal');
export function carryScale(overDrawer) { return overDrawer ? dwGeom().sc : SC; }
export function carryStart(d, ev) {
  const el = d.el, r = rectOf(el), s0 = parseFloat(getComputedStyle(el).getPropertyValue("--sprite-scale")) || SC;
  d.carry = { grab: [(ev.clientX - r.left) / s0, (ev.clientY - r.top) / s0], s: s0 };
  hideNote();
  el.classList.add("carried");
  el.style.setProperty("--sprite-scale", s0);
  fixedRoot.appendChild(el);
  carryMove(d, ev);
}
export function carryMove(d, ev) {
  const el = d.el, fl = pobjFloor(), over = !!(fl && inside(rectOf(fl), ev.clientX, ev.clientY)), s = carryScale(over);
  if (s !== d.carry.s) { d.carry.s = s; el.style.setProperty("--sprite-scale", s); }
  // the watch lies sideways in the drawer and upright on the desk
  if (el.dataset.p === "watch") el.classList.toggle("rot", over);
  el.style.left = Math.round(ev.clientX - d.carry.grab[0] * s) + "px";
  el.style.top = Math.round(ev.clientY - d.carry.grab[1] * s) + "px";
}
export function carryDrop(d, ev) {
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
export function pobjToDesk(el, x, y) {
  const desk = $("#desk");
  el.classList.remove("rot"); el.classList.add("sticker", "on-desk");
  el.dataset.sticker = el.dataset.p;
  desk.appendChild(el);
  moveTo(el, x, Math.min(y, usable().bottom - el.offsetHeight)); raise(el); drawHands();
}
export function pobjHome(el) {
  const id = el.dataset.p, o = POBJ[id], fl = $("#dw-things");
  el.classList.remove("sticker", "on-desk", "held"); if (o.rot) el.classList.add("rot");
  delete el.dataset.sticker; delete ui.stickers[id];
  el.style.zIndex = "";
  fl.appendChild(el);
  placePobj(el); drawHands();
}
export function placePobj(el) {
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
export function movePobj(el) {
  if (isPhone()) return;
  if (el.classList.contains("on-desk")) { pobjHome(el); if (ui.dwOpen !== "personal") setDrawer("personal"); }
  else { const u = usable(); pobjToDesk(el, Math.round(u.w / 2 - 60), u.top + 40); }
  FX.play("tap"); el.focus({ preventScroll: true });
}
export function openSketchbook() {
  const list = rt.state.sketches || [];
  if (!list.length) return;
  let ov = $("#sketchbook-view");
  if (!ov) { ov = document.createElement("div"); ov.className = "sk-view"; ov.id = "sketchbook-view"; $("#desk").appendChild(ov); }
  const a = ART["sketchbook-open"], desk = $("#desk"), sc = Math.max(2, Math.min(8, Math.floor(Math.min((desk.clientWidth - 80) / a.w, (desk.clientHeight - 140) / a.h))));
  const page = (src, x0, x1) => src ? '<img class="sketch" src="' + esc(src) + '" alt="A sketch by Thea" style="left:' + (x0 * sc + 2) + "px;top:" + (3 * sc + 2) + "px;width:" + ((x1 - x0) * sc - 4) + "px;height:" + (53 * sc - 4) + 'px">' : "";
  ov.innerHTML = '<div class="sk-book" style="width:' + a.w * sc + "px;height:" + a.h * sc + 'px">' + SPR.art("sketchbook-open", sc) +
    page(list[rt.sketchSpread * 2], 5, 47) + page(list[rt.sketchSpread * 2 + 1], 53, 95) + "</div>" +
    '<div class="sk-nav"><button class="btn-quiet" data-act="sk-turn" data-dir="-1"' + (rt.sketchSpread ? "" : " disabled") + '>Turn back</button><button class="btn-quiet" data-act="sk-close">Close sketchbook</button><button class="btn-quiet" data-act="sk-turn" data-dir="1"' + ((rt.sketchSpread + 1) * 2 < list.length ? "" : " disabled") + ">Turn the page</button></div>";
  ov.hidden = false;
  const b = $(".sk-nav button:not([disabled])", ov); if (b) b.focus({ preventScroll: true });
}

// what this part sets up when the page starts (run in the original order by start.js)
export function start() {
  setInterval(() => {
    if (document.hidden || !$("canvas.hands")) return;
    const s = shownTime().getSeconds();
    if (s === lastSec) return;
    lastSec = s; drawHands();
    if (ui.dwOpen === "personal" || $("#desk > .pobj.p-watch")) FX.play("wtick");
  }, 250);
}
