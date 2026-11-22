// The printer and the entry record it prints.
import { $, $$, FX, clamp, isPhone, rectOf, reduced, ui } from "./core.js";
import { docTop } from "./scene.js";
import { moveTo } from "./handling.js";
import { renderMarks, trayTopOpen, updateBar } from "./stamps.js";
import { openContact } from "./contact.js";
import { goRoom, updatePill } from "./nav.js";
import { say } from "./intercom.js";

// ----- the printer on the desk; the entry record lands in its own section below -----
export function receiptEl() { return $("#receipt"); }
// The light blinks and a stub feeds out of the slot line by line. Then it tears off at the slot, slides off
// the bottom of the desk, and the page scrolls down to the entry record section where the full record lands.
// The light comes on and a sheet rises out of the slot two art pixels at a time while the printer sounds.
// Then it tears at the slot, slides off to the right as the view pans to Records, and the printer goes dark.
export function printRecord() {
  if (ui.printing) return;
  // in the Records room the printer up there prints it; on the desk, the desk printer does and the view pans over
  const inRecords = !isPhone() && ui.room === 1, pr = inRecords ? $(".rec-printer") : $("#printer"), paper = pr && $(".pr-paper", pr);
  say("record");
  if (isPhone() || reduced() || !pr || !paper) { FX.play("print"); landRecord(false); if (isPhone()) scrollToRecord("auto"); else goRoom(1); return; }
  ui.printing = true;
  // the sheet rises 18 art pixels, or less when the printer sits near the top of the screen
  const ART_PX = 4, step = 2, tick = 80, room = rectOf(pr).top + 28 - 4, steps = clamp(Math.floor(room / (step * ART_PX)), 4, 9);
  paper.className = "pr-paper"; paper.style.setProperty("--rise", "0px");
  pr.classList.add("on");
  FX.play("print");
  for (let k = 1; k <= steps; k++) setTimeout(() => { paper.style.setProperty("--rise", k * step * ART_PX + "px"); }, k * tick);
  const torn = steps * tick + 160;
  setTimeout(() => { paper.classList.add("tear"); FX.play("lift"); }, torn);
  setTimeout(() => {
    pr.classList.remove("on");
    if (!inRecords) { paper.classList.add("off"); return; }
    const rc = receiptEl(), pp = rectOf(paper), rr = rc && !rc.hidden ? rectOf(rc) : null;
    // fall to the record's top centre
    const fall = rr ? Math.max(40, rr.top + 24 - pp.top) : 240;
    paper.style.setProperty("--fall", Math.round(fall) + "px");
    paper.classList.add("drop");
    if (rc) rc.classList.add("cleared");
  }, torn + tick);
  if (!inRecords) setTimeout(() => goRoom(1, true), torn + tick + 60);
  setTimeout(() => {
    if (inRecords) { paper.style.visibility = "hidden"; const rc = receiptEl(); if (rc) rc.classList.remove("cleared"); }
    landRecord(true, inRecords);
    setTimeout(() => { updateBar(); const r = receiptEl(); if (r) r.focus({ preventScroll: true }); }, 380);
  }, torn + (inRecords ? tick + 200 : 700));
  setTimeout(() => { paper.className = "pr-paper"; paper.style.visibility = ""; paper.style.setProperty("--rise", "0px"); ui.printing = false; }, torn + 900);
}
export function scrollToRecord(how) {
  const r = $("#record"), rc = receiptEl();
  if (!r) return;
  let top = docTop(r);
  const box = rc && !rc.hidden ? $(".stamp-box", rc) : null;
  if (box) top = Math.max(top, docTop(box) + box.offsetHeight - (trayTopOpen() - 16) + 8);
  window.scrollTo({ top: top, behavior: how === "smooth" && !reduced() ? "smooth" : "auto" });
}
export function landRecord(animate, fromAbove) {
  const r = receiptEl(), empty = $("#record-empty");
  ui.printed = true;
  if (empty) empty.remove();
  if (!r) return;
  r.hidden = false;
  $$('.record-intro [data-act="print"]', $("#record")).forEach((b) => { b.textContent = "Print it again"; });
  renderMarks("record");
  r.classList.remove("landing", "feeding-down");
  if (animate && !reduced()) { void r.offsetWidth; r.classList.add(fromAbove ? "feeding-down" : "landing"); FX.play("settle"); }
  updateBar(); updatePill();
}
export function setTear(v) { ui.torn = v; const r = receiptEl(); if (r) r.style.setProperty("--tear", v); }
// once torn, the slip lies loose in the whole Records room (on a phone it stays in the column)
export function slipHome() { return isPhone() ? $("#record-area") : $("#record"); }
// Tearing off the slip: it comes away, slides to the middle of the screen and becomes the contact screen.
export function tearOff() {
  if (ui.slipTorn) return;
  const slip = $("#slip"), r = receiptEl(), area = $("#record-area");
  ui.slipTorn = true; FX.play("tear");
  r.classList.add("torn"); $("#perf").remove();
  slip.classList.add("loose");
  slip.dataset.drag = ""; slip.tabIndex = 0;
  slip.setAttribute("role", "button"); slip.setAttribute("aria-label", "Contact slip. Press Enter to open the contact screen.");
  const home = slipHome() || area, rr = rectOf(r);
  home.appendChild(slip);
  if (!isPhone()) { const hr = rectOf(home); moveTo(slip, rr.right - hr.left + home.scrollLeft + 28, Math.max(0, rr.bottom - hr.top + home.scrollTop - slip.offsetHeight - 10)); }
  setTear(0);
  if (reduced()) { openContact(slip); return; }
  const sr = rectOf(slip), dx = window.innerWidth / 2 - (sr.left + sr.width / 2), dy = window.innerHeight / 2 - (sr.top + sr.height / 2);
  slip.style.transition = "transform 0.28s ease-out"; slip.style.transform = "translate(" + dx + "px," + dy + "px)";
  setTimeout(() => { openContact(slip); slip.style.transition = "none"; slip.style.transform = ""; void slip.offsetWidth; slip.style.transition = ""; }, 300);
}
export function tearAll() {
  if (reduced()) { tearOff(); return; }
  [0.35, 0.7, 1].forEach((v, i) => setTimeout(() => { setTear(v); if (v === 1) tearOff(); }, i * 60));
}
