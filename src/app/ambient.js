// Idle details (mug steam, blinking) and the name tags.
import { rt } from "./core.js";
import { $, FX, clamp, esc, fixedRoot, isPhone, rectOf, reduced, ui } from "./core.js";
import { caseIndex } from "./papers.js";
import { TOP, setPos, usable } from "./scene.js";
import { DW_FRONT, FS } from "./drawers.js";
import { slow } from "./things.js";
import { slotBtn, toggleTray } from "./stamps.js";
import { say } from "./intercom.js";

// ----- idle details: mug steam, a blink at the window; paused when hidden, off with reduced motion -----
export const pace = (a, b) => (a + Math.random() * (b - a)) * (slow ? 3 : 1);
export function steamLoop() {
  setTimeout(() => {
    const st = $(".steam");
    if (st && !document.hidden && !reduced()) {
      st.className = "steam f1";
      setTimeout(() => { st.className = "steam f2"; }, 320 * (slow ? 3 : 1));
      setTimeout(() => { st.className = "steam f1"; }, 640 * (slow ? 3 : 1));
      setTimeout(() => { st.className = "steam"; }, 960 * (slow ? 3 : 1));
    }
    steamLoop();
  }, pace(4000, 6000));
}
export function blinkLoop() {
  setTimeout(() => {
    const bl = $("#blink");
    if (bl && !document.hidden && !reduced()) { bl.classList.add("on"); setTimeout(() => bl.classList.remove("on"), 140 * (slow ? 3 : 1)); }
    blinkLoop();
  }, pace(6000, 10000));
}
// thirty quiet seconds: the booth assistant may say something, once
export let idleTimer = null;
export function poke() { clearTimeout(idleTimer); idleTimer = setTimeout(() => { if (ui.view === "desk" && !$("#intro")) say("idle"); }, 30000); }
// easter eggs: "hire" typed on the desk, five clicks on the mug, "sudo" in the message box
export let typed = "", mugClicks = 0, mugTimer = null;
export function hireEgg(ev) {
  if (ev.key.length !== 1 || ev.ctrlKey || ev.metaKey || ev.altKey) return;
  typed = (typed + ev.key.toLowerCase()).slice(-4);
  if (typed !== "hire") return;
  typed = "";
  toggleTray(true);
  const b = slotBtn("approved");
  if (b && !reduced()) { b.classList.add("eager"); setTimeout(() => b.classList.remove("eager"), 1200); }
}
export function mugEgg() {
  clearTimeout(mugTimer); mugTimer = setTimeout(() => { mugClicks = 0; }, 2500);
  if (++mugClicks < 5) return;
  mugClicks = 0;
  const mug = $('.sticker[data-sticker="mug"]'), desk = $("#desk");
  let n = $("#refill");
  if (!n) { n = document.createElement("p"); n.id = "refill"; n.className = "refill"; n.setAttribute("role", "status"); desk.appendChild(n); }
  n.textContent = "refill requested";
  n.hidden = false;
  setPos(n, clamp(mug.offsetLeft - 150, 8, desk.clientWidth - 160), clamp(mug.offsetTop - 30, TOP, usable().bottom - 50));
  FX.play("peel");
  setTimeout(() => { n.hidden = true; }, 3200);
}
export function sudoEgg(t) {
  if (!/sudo\s*$/i.test(t.value)) return;
  const r = $("#cm-sudo");
  if (!r) return;
  r.textContent = "Permission denied. This desk runs without root.";
  r.hidden = false;
  clearTimeout(sudoEgg.timer); sudoEgg.timer = setTimeout(() => { r.hidden = true; }, 3000);
}
// ----- name tags: objects first, names when pointed at -----
export let tagTimer = null, tagFor = null;
export function tagTarget(el) { return el && el.closest && (el.closest(".peek-btn") || el.closest(".desk-marker") || el.closest(".spk") || el.closest(".pbi") || el.closest(".dw-front") || el.closest(".p-case.filed .folder-tab") || (!isPhone() && el.closest("#desk .p-diploma:not(.held)"))); }
export function showTag(el, now) {
  clearTimeout(tagTimer);
  const go = () => {
    let t = $("#tag");
    if (!t) { t = document.createElement("div"); t.id = "tag"; t.className = "tag"; t.setAttribute("role", "tooltip"); fixedRoot.appendChild(t); }
    tagFor = el;
    const r = rectOf(el), strip = el.classList.contains("folder-tab");
    if (el.classList.contains("p-diploma")) {
      t.innerHTML = '<b class="tg-name">Coursework</b><span class="tg-sub">' + esc(rt.state.education.coursework) + "</span>";
      t.className = "tag side pop"; t.hidden = false;
      const right = r.right + 14 + t.offsetWidth < window.innerWidth;
      t.classList.toggle("flip", !right);
      t.style.left = Math.round(right ? r.right + 14 : r.left - 14 - t.offsetWidth) + "px";
      t.style.top = Math.round(clamp(r.top + 24, 8, window.innerHeight - t.offsetHeight - 8)) + "px";
    } else if (el.classList.contains("spk") || el.classList.contains("aclock")) {
      t.innerHTML = '<span class="tg-word">' + esc(el.dataset.tag) + "</span>";
      const side = el.classList.contains("aclock");
      t.className = "tag " + (side ? "side" : "above") + " pop"; t.hidden = false;
      if (side) { t.style.left = Math.round(r.right + 14) + "px"; t.style.top = Math.round(r.top + r.height / 2 - t.offsetHeight / 2) + "px"; }
      else { t.style.left = Math.round(clamp(r.left + r.width / 2 - t.offsetWidth / 2, 8, window.innerWidth - t.offsetWidth - 8)) + "px"; t.style.top = Math.round(r.top - t.offsetHeight - 10) + "px"; }
    } else if (el.classList.contains("pbi")) {
      t.innerHTML = '<span class="tg-sub">' + esc(el.dataset.tag) + "</span>";
      t.className = "tag below pop"; t.hidden = false;
      const below = r.bottom + 12 + t.offsetHeight < window.innerHeight - 8;
      t.classList.toggle("flip", !below);
      t.style.left = Math.round(clamp(r.left + r.width / 2 - t.offsetWidth / 2, 8, window.innerWidth - t.offsetWidth - 8)) + "px";
      t.style.top = Math.round(below ? r.bottom + 12 : r.top - 12 - t.offsetHeight) + "px";
    } else if (strip) {
      const pr = rt.state.projects[caseIndex(el.dataset.id)], box = rectOf($("#filebox"));
      t.innerHTML = '<b class="tg-name">' + esc(pr.name) + '</b><span class="tg-sub">' + esc([pr.role, pr.dates].filter(Boolean).join(", ")) + "</span>";
      t.className = "tag side pop"; t.hidden = false;
      t.style.left = Math.round(box.right + 14) + "px";
      t.style.top = Math.round(clamp(r.top + r.height / 2 - t.offsetHeight / 2, 8, window.innerHeight - t.offsetHeight - 8)) + "px";
    } else if (el.closest(".peek-btn, .desk-marker")) {
      // the board peek and the marker: the word just under them
      t.innerHTML = '<span class="tg-word">' + esc(el.dataset.tag) + "</span>";
      t.className = "tag pop"; t.hidden = false;
      t.style.left = Math.round(clamp(r.left + r.width / 2 - t.offsetWidth / 2, 8, window.innerWidth - t.offsetWidth - 8)) + "px";
      t.style.top = Math.round(r.bottom + 10) + "px";
    } else {
      t.innerHTML = '<span class="tg-word">' + esc(el.dataset.tag) + "</span>";
      t.className = "tag above pop"; t.hidden = false;
      const fr = rectOf(el.closest(".dw")), cx = fr.left + parseFloat(getComputedStyle(el.closest(".dw")).getPropertyValue("--crop")) + (fr.width - 2 * parseFloat(getComputedStyle(el.closest(".dw")).getPropertyValue("--crop"))) / 2;
      t.style.left = Math.round(clamp(cx - t.offsetWidth / 2, 8, window.innerWidth - t.offsetWidth - 8)) + "px";
      t.style.top = Math.round(r.bottom - DW_FRONT * FS - t.offsetHeight - 10) + "px";
    }
    setTimeout(() => t.classList.remove("pop"), 60);
  };
  if (now) go(); else tagTimer = setTimeout(go, 120);
}
export function hideTag() { clearTimeout(tagTimer); tagFor = null; const t = $("#tag"); if (t) t.hidden = true; }

// what this part sets up when the page starts (run in the original order by start.js)
export function start() {
  steamLoop();
  blinkLoop();
  ["pointerdown", "keydown", "wheel", "touchstart"].forEach((t) => document.addEventListener(t, poke, { passive: true, capture: true }));
  poke();
  window.addEventListener("scroll", hideTag, { passive: true, capture: true });
  window.addEventListener("blur", hideTag);
  document.addEventListener("pointerover", (ev) => { if (ev.pointerType === "touch") return; const t = tagTarget(ev.target); if (t && t !== tagFor) showTag(t); });
  document.addEventListener("pointerout", (ev) => { const t = tagTarget(ev.target); if (t && !t.contains(ev.relatedTarget) && ev.pointerType !== "touch") hideTag(); });
  // only keyboard focus shows a tag: a click also focuses, and that tag would outlive the click
  document.addEventListener("focusin", (ev) => { const t = tagTarget(ev.target); if (t && t.matches(":focus-visible")) showTag(t, true); });
  document.addEventListener("focusout", (ev) => { if (tagTarget(ev.target)) hideTag(); });
  // touch: the first tap shows the name, the second opens; a tap anywhere else hides it
  document.addEventListener("pointerdown", (ev) => {
    if (ev.pointerType !== "touch") { hideTag(); return; }
    const t = tagTarget(ev.target);
    if (!t) { hideTag(); return; }
    if (tagFor !== t) { showTag(t, true); rt.swallowClick = true; }
  }, true);
}
