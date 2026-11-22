// The desk lamp.
import { $, $$, FX, rectOf, ui } from "./core.js";

// ----- the lamp: base on the desk's top-right corner, shade over the counter strip only -----
export function setLampVisible(on) { const st = $("#stage"); if (st) st.classList.toggle("lamp-ready", on); }
export function toggleLamp(auto) { if (auto !== true) ui.lampTouched = true; ui.lampOn = !ui.lampOn; $("#stage").classList.toggle("lamp-off", !ui.lampOn); FX.play("lamp"); $("#lamp-switch").setAttribute("aria-pressed", String(ui.lampOn)); }
// Open or held papers pass over the lamp; when one overlaps it, the lamp fades back.
export function checkLamp() {
  const lamp = $("#lamp");
  if (!lamp) return;
  const r = rectOf(lamp);
  const over = $$("#desk .paper.open, #desk .paper.held").some((p) => { const b = rectOf(p); return b.left < r.right && r.left < b.right && b.top < r.bottom && r.top < b.bottom; });
  lamp.classList.toggle("faded", over);
}
