// The walk-in at the booth window.
import { $, ART, FX, SPR, fixedRoot, reduced } from "./core.js";
import { dayPhase } from "./booth.js";

// ----- the walk-in: the visitor calls "Next applicant.", Thea walks up behind the glass, holds up her passport and slides it into the tray -----
// The booth scene is 111x71 art pixels: glass x 10 to 100, y 5 to 55; the counter's top edge at y 56; the tray recess under the glass.
// Layers, back to front: sky and skyline, Thea, the glass reflections, the frame and counter, the tray.
// Thea is drawn at two thirds of the scene's scale (scene 9x / her 6x, 6x / 4x, or 3x / 2x), so she reads as a step back from the glass.
export let walk = null;
export function walkIn() {
  let seen = false;
  try { seen = sessionStorage.getItem("cvp-walkin") === "1"; } catch (err) { /* storage can be blocked */ }
  if (seen || !$("#intro")) return;
  try { sessionStorage.setItem("cvp-walkin", "1"); } catch (err) { /* storage can be blocked */ }
  // reduced motion: straight to the passport on the desk
  if (reduced()) return;
  const sayEl = $("#say"); if (sayEl) sayEl.textContent = "Click the passport to open it.";
  const a = ART["booth-scene"], fit = Math.floor(Math.min((window.innerWidth - 32) / a.w, (window.innerHeight - 96) / a.h));
  const S = Math.max(3, Math.min(9, fit - (fit % 3))), T = (S / 3) * 2, P = (v) => Math.round(v * S) + "px";
  const el = document.createElement("div");
  el.className = "walkin"; el.id = "walkin";
  el.innerHTML = '<div class="wk-stage sky-' + dayPhase() + '" style="width:' + P(a.w) + ";height:" + P(a.h) + '">' +
    SPR.art("booth-scene", S, "wk-scene", "Inside the booth, looking out through the window") +
    '<img class="wk-thea" alt="" aria-hidden="true" draggable="false" hidden>' +
    SPR.art("booth-glare", S, "wk-glare") + SPR.art("booth-front", S, "wk-front") +
    '<span class="wk-tray" style="left:' + P(42) + ";top:" + P(56) + '">' + SPR.art("tray-open", S, "wk-t-open") + SPR.art("tray-passport", S, "wk-t-pass") + SPR.art("tray-closed", S, "wk-t-closed") + "</span></div>" +
    '<p class="wk-call" aria-live="polite" hidden>Next applicant.</p>' +
    '<button class="btn-quiet wk-skip" data-act="walkin-skip">Skip intro</button>';
  fixedRoot.appendChild(el); el.style.setProperty("--wk-s", S);
  const img = $(".wk-thea", el), tray = $(".wk-tray", el), call = $(".wk-call", el);
  // her hair top sits about 8% of the glass height under its top edge; the held passport (her art rows 50 to 66)
  // then ends a little over 2 scene pixels above the counter's top edge
  // she stands low enough that the bottom edge of every frame (the walk frames end at her art row 64, the hold frame at 65)
  // is hidden behind the counter top (scene row 56)
  const top = Math.round(56 * S - 63 * T), cx = 56 * S;
  const show = (name, x) => {
    const sp = ART[name]; img.src = sp.src; img.width = sp.w * T; img.height = sp.h * T;
    img.style.left = Math.round(x) + "px"; img.style.top = top + "px"; img.hidden = false;
  };
  // centred on the glass: the middle of her figure (art x 27) over the middle of the glass
  const X = cx - 27 * T;
  const trayState = (st) => { tray.dataset.st = st; };
  trayState("open");
  walk = { el: el, timers: [] };
  const at = (ms, fn) => walk.timers.push(setTimeout(fn, ms));
  // 1. the empty booth; 2. the visitor calls her in, from their side of the counter
  at(800, () => { call.hidden = false; call.classList.add("up"); FX.play("chime"); });
  at(2000, () => { call.classList.remove("up"); call.classList.add("away"); });
  at(2300, () => { call.hidden = true; });
  // 3. she walks in from the left, two frames 160ms apart, over about 1.8s
  const t0 = 2000, dur = 1800, x0 = 10 * S - 57 * T;
  for (let t = 0; t <= dur; t += 80) at(t0 + t, () => { show(Math.floor(t / 160) % 2 ? "thea-walk-1" : "thea-walk-0", x0 + (X - x0) * Math.min(1, t / dur)); if (t % 320 === 0) FX.play("step"); });
  // 4. turn, 5. hold up the passport, 6. push it through under the glass
  at(t0 + dur + 80, () => show("thea-turn", X));
  at(t0 + dur + 480, () => { show("thea-hold", X); FX.play("rustle"); });
  at(t0 + dur + 1380, () => show("thea-push", X));
  at(t0 + dur + 1630, () => { trayState("pass"); FX.play("tap"); });
  at(t0 + dur + 2130, () => { trayState("closed"); tray.classList.add("shut"); FX.play("clunk"); });
  // 7. the camera tilts down to the desk, where the closed passport lands
  at(t0 + dur + 2450, () => { el.classList.add("tilt"); const pp = $("#passport"); if (pp) { pp.classList.remove("drop-in"); void pp.offsetWidth; pp.classList.add("drop-in"); } });
  at(t0 + dur + 2950, () => walkDone(true));
  document.addEventListener("keydown", walkKey, true);
  document.addEventListener("pointerdown", walkPoint, true);
}
export function walkKey(ev) { if (!walk) return; ev.preventDefault(); ev.stopPropagation(); walkDone(); }
export function walkPoint(ev) {
  if (!walk) return;
  ev.preventDefault(); ev.stopPropagation();
  // the click that ends the walk-in does nothing else
  const eat = (e) => { e.stopPropagation(); e.preventDefault(); document.removeEventListener("click", eat, true); };
  document.addEventListener("click", eat, true); setTimeout(() => document.removeEventListener("click", eat, true), 400);
  walkDone();
}
export function walkDone(natural) {
  if (!walk) return;
  walk.timers.forEach(clearTimeout);
  walk.el.remove(); walk = null;
  document.removeEventListener("keydown", walkKey, true);
  document.removeEventListener("pointerdown", walkPoint, true);
  const pp = $("#passport"); if (pp) { if (!natural) pp.classList.remove("drop-in"); pp.focus({ preventScroll: true }); }
}
