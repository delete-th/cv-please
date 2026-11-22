// The radio's asides and the intercom: the visitor's questions and Thea's answers.
import { rt } from "./core.js";
import { $, $$, FX, SPR, behavior, esc, fixedRoot, isPhone, rectOf, reduced, ui } from "./core.js";
import { hasRadio } from "./booth.js";
import { theaSpeak } from "./things.js";
import { closeWall, openWall } from "./whiteboard.js";
import { goArea, goRoom, printAndShow } from "./nav.js";

// ----- the radio's asides (only lines Thea has written are ever shown) -----
export let asideTimer = null;
export function sayNow(trigger) {
  const line = (rt.state.assistant.find((a) => a.when === trigger) || {}).line, el = $("#aside");
  if (!line || !el) return false;
  el.textContent = line; el.hidden = false;
  clearTimeout(asideTimer);
  asideTimer = setTimeout(() => { el.hidden = true; }, 5000);
  return true;
}
export function say(trigger) {
  if (!ui.radioOn || !hasRadio() || ui.said.has(trigger)) return;
  const i = trigger.indexOf("case:") === 0 ? +trigger.slice(5) : -1;
  const line = i >= 0 ? rt.state.projects[i] && rt.state.projects[i].aside : (rt.state.assistant.find((a) => a.when === trigger) || {}).line;
  const el = $("#aside");
  if (!line || !el) return;
  ui.said.add(trigger);
  el.textContent = line; el.hidden = false;
  clearTimeout(asideTimer);
  asideTimer = setTimeout(() => { el.hidden = true; }, 5000);
}
// ----- the intercom: Thea, the officer, asks the visitor a few questions; each answer takes them somewhere useful -----
// Every line lives in data.json under "intercom". Answers are kept for this visit only.
export const ic = { open: false, node: null, tour: -1, said: false, visitedRecords: false, declared: false, timer: null, spotEl: null };
export const icNode = (id) => (rt.state.intercom || []).find((n) => n.id === id);
export function icEl() {
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
export function icPlace() {
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
export function icShow(text, chips) {
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
export function icAsk(id) {
  const n = icNode(id); if (!n) { icClose(); return; }
  if (ic.tour >= 0) { const tb = $("#thea-say"); if (tb) tb.hidden = true; }
  ic.node = n; ic.tour = -1; spot(null);
  icShow(n.q || "", n.a.map((a) => a.t));
}
export function icOpen() {
  if (ui.view !== "desk" || $("#intro") || rt.editing) return;
  ic.open = true;
  if (ui.room === 1 || ui.printed) ic.visitedRecords = true;
  // the visitor's questions for Thea
  icAsk("ask");
}
export function icClose(keepSpot) {
  if (!ic.open && !$("#icq")) return;
  if (ic.tour >= 0) { const tb = $("#thea-say"); if (tb) tb.hidden = true; }
  ic.open = false; ic.tour = -1; clearTimeout(ic.timer);
  if (!keepSpot) spot(null);
  const el = $("#icq"); if (el) el.hidden = true;
  const b = $(".ic-btn"); if (b) { b.setAttribute("aria-expanded", "false"); if (el && el.contains(document.activeElement)) b.focus({ preventScroll: true }); }
}
export function icPick(i) {
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
export function icGo(go) {
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
export function tourTarget(at) {
  if (at === "passport") return [$('.booth-links [data-act="passport"]')];
  if (at === "files") return [$("#filebox"), $("#filebox-front")];
  if (at === "drawers") return $$(".dw .dw-front");
  if (at === "up") return [ui.markerBack ? $(".peek-btn") : $(".desk-marker")];
  if (at === "printer") return [$("#printer")];
  if (at === "stamps") return [$("#stampdock")];
  return [];
}
export function icTour(i) {
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
export function spot() {
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

// what this part sets up when the page starts (run in the original order by start.js)
export function start() {
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
}
