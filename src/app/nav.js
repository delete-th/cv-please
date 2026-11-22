// The pill nav and moving between the rooms.
import { rt } from "./core.js";
import { $, $$, FX, behavior, clamp, isPhone, rectOf, reduced, ui } from "./core.js";
import { applyScene, deskScroll, docTop } from "./scene.js";
import { setDrawer } from "./drawers.js";
import { updateBar } from "./stamps.js";
import { printRecord, receiptEl } from "./printer.js";
import { closeWall } from "./whiteboard.js";

// ----- pill nav -----
export const AREAS = [["desk", "Desk"], ["record", "Records"]];
export function currentArea() {
  if (ui.view !== "desk" || !$("#scene") || ui.wall) return 0;
  if (!isPhone()) return ui.room === 1 ? 1 : 0;
  return rectOf($("#record")).top < window.innerHeight * 0.55 ? 1 : 0;
}
// The camera pans sideways between the rooms; with reduced motion they swap with a quick fade.
export function goRoom(i, quiet) {
  i = clamp(i, 0, 1);
  if (isPhone()) { deskScroll(i ? docTop($("#record")) : docTop($("#scene")), behavior()); return; }
  if (i === ui.room) return;
  const rooms = $("#rooms");
  if (i !== 0 && ui.dwOpen) setDrawer(null);
  ui.room = i;
  if (reduced()) { rooms.classList.remove("fading"); void rooms.offsetWidth; rooms.classList.add("fading"); }
  rooms.style.setProperty("--room", i);
  $$(".room").forEach((r, k) => { r.inert = k !== i; });
  updatePill();
  setTimeout(() => { updateBar(); if (!quiet) { const t = i ? (receiptEl() && !receiptEl().hidden ? receiptEl() : $("#record-h")) : $("#hello"); if (t) t.focus({ preventScroll: true }); } }, reduced() ? 0 : 460);
}
export function goArea(i) {
  const id = AREAS[i][0];
  if (ui.wall) { closeWall(); if (id !== "desk") setTimeout(() => goArea(i), reduced() ? 0 : 640); return; }
  if (id === "desk") { goRoom(0); return; }
  // walking over to the Records room prints nothing; only the printer and the Summary link print
  if (!ui.forced) { ui.forced = true; ui.boothForced = true; applyScene(); }
  goRoom(1);
}
// print the record if nothing is printed yet (from the desk, where the printer is), otherwise just go to it
export function printAndShow() {
  if (ui.wall) { closeWall(); setTimeout(printAndShow, reduced() ? 0 : 640); return; }
  if (!ui.forced) { ui.forced = true; ui.boothForced = true; applyScene(); }
  if (ui.printed) { goRoom(1); return; }
  if (ui.room !== 0 && !isPhone()) goRoom(0, true);
  printRecord();
}
export function updatePill() {
  const n = $("#area-name"); if (n) n.textContent = ui.wall ? "Whiteboard" : AREAS[currentArea()][1];
  const pl = $("#pill"); if (pl) pl.classList.toggle("up", !!ui.wall);
}
// the note goes out through the visitor's own mail app; nothing is stored or sent by the page
export function noteLink() {
  const t = $("#vnote-text"), a = $("#vn-send"), c = $("#vn-count");
  if (!t || !a) return;
  const text = t.value.slice(0, 280);
  c.textContent = text.length + " of 280";
  a.href = "mailto:" + rt.state.profile.email + "?subject=" + encodeURIComponent("A note from your desk") + "&body=" + encodeURIComponent(text);
  a.classList.toggle("off", !text.trim());
  a.setAttribute("aria-disabled", String(!text.trim()));
}
export function noteSent() {
  const t = $("#vnote-text"), f = $("#vnote"), sent = $("#vsent");
  if (!t || !t.value.trim()) return false;
  ui.noteSent = true; ui.noteText = t.value.trim();
  f.hidden = true; $("#notepad").hidden = true;
  $("#vs-text").textContent = ui.noteText.length > 60 ? ui.noteText.slice(0, 57) + "..." : ui.noteText;
  sent.hidden = false; FX.play("tap");
  return true;
}
