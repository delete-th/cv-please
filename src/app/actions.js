// What every button does, and the pointer, keyboard, swipe, scroll and resize handling.
import { rt } from "./core.js";
import { $, $$, DEMOS, FX, ORIGINAL, app, at, clamp, fixedRoot, inside, isPhone, narrow, rectOf, reduced, ui } from "./core.js";
import { caseIds, paperEl, paperIds, pst, stackHTML, uses } from "./papers.js";
import { setOwner, snooze } from "./booth.js";
import { TOP, applyScene, onResize, setPos, usable } from "./scene.js";
import { closeCase, fileBack, finishSheet, flipCase, markHandled, moveTo, openCase, peel, putAllBack, putAway, raise, returnPaper, startSheet, takeOut } from "./handling.js";
import { closeDrawer, dwGeom, liftCard, refreshSkills, setDrawer } from "./drawers.js";
import { carryDrop, carryMove, carryStart, hideNote, keyPress, movePobj, openSketchbook, placePobj, pobjHome, pobjToDesk, setSlow, showNote, slow, usePobj } from "./things.js";
import { held, pickUp, placeHeld, springBack, stampDown, stampOnto, stampableAt, stampables, toggleTray, updateBar } from "./stamps.js";
import { printRecord, setTear, tearAll, tearOff } from "./printer.js";
import { closeBrowser, closeContact, keyName, mailto, openBrowser, openContact, pressKey, typeAddress, typeSound } from "./contact.js";
import { checkLamp, toggleLamp } from "./lamp.js";
import { walkDone } from "./walkin.js";
import { closeWall, markerHome, openWall, sizeWall, wbCard, wbDraw, wbMode, wbSelect, wbWipe } from "./whiteboard.js";
import { AREAS, currentArea, goArea, goRoom, noteLink, noteSent, printAndShow, updatePill } from "./nav.js";
import { ic, icClose, icOpen, icPick, say } from "./intercom.js";
import { BLANK, render } from "./listview.js";
import { closeIntro, flipPass, inspectPassport, introNext, setLeaf } from "./intro.js";
import { hideTag, hireEgg, mugEgg, showTag, sudoEgg, tagFor } from "./ambient.js";
import { save } from "./save.js";

// ----- actions -----
export function touched() { rt.dirty = true; rt.note = ""; }
export const ACTIONS = {
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
    try { navigator.clipboard.writeText(rt.state.profile.email).then(done, () => { if (note) note.textContent = rt.state.profile.email; }); } catch (err) { if (note) note.textContent = rt.state.profile.email; }
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
  "marker-back"(b) { if (rt.markerDragged) { rt.markerDragged = false; return; } markerHome(b); },
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
  ask(b) { ui.asked = +b.dataset.q; const el = $("#bubble"); el.hidden = false; el.textContent = rt.state.interview[ui.asked].a; },
  "close-case"(b) { closeCase(b.dataset.id); },
  flip(b) { flipCase(b.dataset.id, 1); },
  return(b) { returnPaper(b.dataset.id); },
  dw(b) { if (drawerDrag && drawerDrag.moved) return; if (ui.dwOpen === b.dataset.dw) closeDrawer(); else setDrawer(b.dataset.dw); },
  "sk-turn"(b) { rt.sketchSpread = Math.max(0, rt.sketchSpread + +b.dataset.dir); FX.play("flip"); openSketchbook(); },
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
      el.classList.toggle("hot", !!ui.hot && uses(rt.state.projects[i].stack, ui.hot));
      const s = $(".stack-items", el); if (s) s.innerHTML = stackHTML(rt.state.projects[i]);
    });
    const again = $('#sk-lift .sk[data-s="' + CSS.escape(b.dataset.s) + '"]') || $('.sk[data-s="' + CSS.escape(b.dataset.s) + '"]'); if (again) again.focus({ preventScroll: true });
  },
  demo(b) { const box = b.parentNode.querySelector(".demo-box"); box.hidden = false; b.hidden = true; DEMOS[rt.state.projects[+b.dataset.i].demo](box); },
  tear() { if (perfMoved) return; tearAll(); },
  edit() { rt.editing = true; rt.note = ""; render(); window.scrollTo(0, 0); },
  discard() { rt.state = JSON.parse(ORIGINAL); rt.editing = false; rt.dirty = false; rt.note = ""; render(); },
  save: save,
  add(b) { at(b.dataset.p).push(JSON.parse(JSON.stringify(BLANK[b.dataset.t]))); touched(); render(); },
  del(b) { at(b.dataset.p).splice(+b.dataset.i, 1); touched(); render(); },
  copy(b) {
    const scope = b.closest(".slip") || b.closest(".row") || document;
    const pick = () => { const el = $(".email", scope); if (!el) return; const r = document.createRange(); r.selectNodeContents(el); const s = getSelection(); s.removeAllRanges(); s.addRange(r); b.textContent = "Address selected"; };
    try { navigator.clipboard.writeText(rt.state.profile.email).then(() => { b.textContent = "Copied"; }, pick); } catch (err) { pick(); }
  },
};
export let drag = null, pageDrag = null, sheetDrag = null, justDragged = false, drawerDrag = null, perfDrag = null, perfMoved = false;
export const NO_DRAG = "button, a, input, textarea, select, label, .demo-box, .f";
export let noteWait = null;
export const keyUp = () => $$('.pobj[data-p="keycap"].pressed').forEach((k) => keyPress(k, false));
export function endDrag(ev) {
  if (rt.pending && (!ev || ev.pointerId === rt.pending.id)) {
    // a tap on a stamp lifts it; the next tap on a paper stamps it there
    const p = rt.pending; rt.pending = null;
    if (ev && ev.type === "pointerup") pickUp(p.kind, "armed");
    return;
  }
  if (held && held.mode === "drag" && !held.busy) { if (held.over) stampDown(); else springBack(); return; }
  if (sheetDrag) {
    const d = sheetDrag; sheetDrag = null;
    if (!d.moved) return;
    rt.swallowClick = true;
    d.sheet.classList.remove("held-page");
    finishSheet(d.id, d.sheet, 1, d.p > 0.5);
    return;
  }
  if (pageDrag) {
    const d = pageDrag; pageDrag = null;
    if (!d.moved) return;
    rt.swallowClick = true;
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
export let swipe = null;
export let ticking = false;
export let rz = null;

// what this part sets up when the page starts (run in the original order by start.js)
export function start() {
  document.addEventListener("click", (ev) => {
    if (rt.swallowClick) { rt.swallowClick = false; ev.preventDefault(); ev.stopPropagation(); return; }
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
  document.addEventListener("pointerover", (ev) => {
    const po = ev.target.closest && ev.target.closest(".pobj");
    if (!po || drag) return;
    clearTimeout(noteWait);
    noteWait = setTimeout(() => { if (po.matches(":hover") && !drag) showNote(po); }, 450);
  });
  document.addEventListener("keyup", (ev) => { if ((ev.key === "Enter" || ev.key === " ") && ev.target.matches && ev.target.matches('.pobj[data-p="keycap"]')) keyPress(ev.target, false); });
  document.addEventListener("pointerdown", (ev) => { const k = ev.target.closest && ev.target.closest('.pobj[data-p="keycap"]'); if (k && ev.button === 0) keyPress(k, true); });
  document.addEventListener("pointerup", keyUp);
  document.addEventListener("pointercancel", keyUp);
  document.addEventListener("pointerout", (ev) => { const po = ev.target.closest && ev.target.closest(".pobj"); if (po && !po.contains(ev.relatedTarget)) { clearTimeout(noteWait); hideNote(); } });
  document.addEventListener("focusout", (ev) => { if (ev.target.closest && ev.target.closest(".pobj")) hideNote(); });
  document.addEventListener("focusin", (ev) => { if (ev.target.matches && ev.target.matches(".pobj")) showNote(ev.target); });
  document.addEventListener("focusin", (ev) => { if (ev.target.matches && ev.target.matches("#cm-subject, #cm-msg")) rt.lastField = ev.target; });
  document.addEventListener("input", (ev) => { if (ev.target.id === "vnote-text") noteLink(); if (ev.target.id === "cm-msg") sudoEgg(ev.target); });
  document.addEventListener("pointerdown", (ev) => {
    const key = ev.target.closest && ev.target.closest(".cm-key");
    if (key && ui.contactOpen) {
      ev.preventDefault();
      const f = rt.lastField && rt.lastField.isConnected ? rt.lastField : $("#cm-msg"), k = key.dataset.k;
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
      ev.preventDefault(); rt.swallowClick = true;
      const s = stampableAt(ev.clientX, ev.clientY);
      if (s && !sbtn) { placeHeld(ev.clientX, ev.clientY, true); held.over = s; setTimeout(stampDown, reduced() ? 0 : 160); }
      else { const k = held.kind; springBack(); if (sbtn && sbtn.dataset.kind !== k) setTimeout(() => { pickUp(sbtn.dataset.kind, "armed"); }, reduced() ? 0 : 220); }
      return;
    }
    if (sbtn) {
      ev.preventDefault();
      if (held) springBack(true);
      rt.pending = { kind: sbtn.dataset.kind, sx: ev.clientX, sy: ev.clientY, id: ev.pointerId };
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
    if (rt.pending && ev.pointerId === rt.pending.id) {
      if (Math.hypot(ev.clientX - rt.pending.sx, ev.clientY - rt.pending.sy) < 5) return;
      const p = rt.pending; rt.pending = null;
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
  document.addEventListener("pointerup", endDrag);
  document.addEventListener("pointercancel", endDrag);
  document.addEventListener("dragstart", (ev) => { if (ev.target.closest && ev.target.closest("[data-drag], .stamp-btn, [data-stamp-root]")) ev.preventDefault(); });
  document.addEventListener("keydown", (ev) => {
    if (!ui.contactOpen && !rt.editing && ui.view === "desk" && !$("#intro") && !(ev.target.matches && ev.target.matches("input, textarea, [contenteditable], .f"))) hireEgg(ev);
    if ((ev.key === "Enter" || ev.key === " ") && ev.target.id === "passport" && ui.introStep === 0) { ev.preventDefault(); introNext(); return; }
    const po = ev.target.closest && ev.target.closest(".pobj");
    const freeKey = ui.view === "desk" && !rt.editing && !held && !ui.contactOpen && !$("#intro") &&
      !(ev.target.closest && ev.target.closest("input, textarea, select, [contenteditable], .f, [data-drag], .pobj, .passport, .cm-device, .pager, .sk-lift"));
    if (ui.wall && (ev.key === "ArrowDown" || ev.key === "Escape")) { ev.preventDefault(); if (ev.key === "Escape" && $("#wb-pin") && !$("#wb-pin").hidden) wbSelect(null); else closeWall(); return; }
    if (ev.key === "ArrowUp" && freeKey && !ui.wall && !ui.dwOpen && !$(".p-case.open")) { ev.preventDefault(); openWall(); return; }
    if (ui.wall && (ev.key === "ArrowLeft" || ev.key === "ArrowRight") && freeKey) return;
    if ((ev.key === "ArrowLeft" || ev.key === "ArrowRight") && !isPhone() && ui.view === "desk" && !rt.editing && !held && !ui.contactOpen && !$("#intro") &&
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
    if ((ev.key === "s" || ev.key === "S") && !typing && !held && (ui.view === "desk" || $("#intro")) && !rt.editing) { ev.preventDefault(); toggleTray(); return; }
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
    if ((k === "a" || k === "d") && root && !rt.editing && !held && (root.id !== "passport" || root.classList.contains("open")) && (root.id !== "receipt" || ui.printed)) {
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
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      if (ui.view === "desk" && !rt.editing) { applyScene(); updatePill(); updateBar(); }
      if (held && !held.busy) placeHeld(held.fx, held.fy);
    });
  }, { passive: true });
  window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { onResize(); sizeWall(); }, 120); });
  // the desk can also change height without a window resize (the booth settles once its fonts load): lay it out again then
  setInterval(() => { const d = $("#desk"); if (d && !isPhone() && ui.layoutH && d.clientHeight !== ui.layoutH && !held && !document.hidden) onResize(); }, 400);
  narrow.addEventListener("change", () => { if (ui.view === "desk" && !rt.editing) render(); });
}
