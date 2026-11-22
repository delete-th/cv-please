// The contact screen: the retro computer (or phone), its mail form and small browser.
import { rt } from "./core.js";
import { $, $$, ART, FX, SPR, app, esc, introRoot, isPhone, reduced, safeUrl, ui } from "./core.js";

export let contactReturn = null;
export function mailto() {
  const p = rt.state.profile, subj = $("#cm-subject"), msg = $("#cm-msg");
  return "mailto:" + p.email + "?subject=" + encodeURIComponent(subj ? subj.value : "Hello from your portfolio") + (msg && msg.value ? "&body=" + encodeURIComponent(msg.value) : "");
}
// shortcuts on the browser's start page: generic pixel icons, never the companies' logos
export function shortcuts(phone) {
  const p = rt.state.profile, links = p.links.filter((l) => safeUrl(l.url));
  const handle = (u) => u.replace(/\/+$/, "").split("/").pop();
  const site = (l) => /linkedin/i.test(l.url) ? { icon: "brief", label: p.name + " · LinkedIn" } : /github/i.test(l.url) ? { icon: "code", label: handle(l.url) + " · GitHub" } : { icon: "paper", label: l.label };
  const tile = (inner, attrs) => (attrs.href ? '<a class="br-tile" ' : '<button class="br-tile" ') + Object.keys(attrs).map((k) => k + '="' + esc(attrs[k]) + '"').join(" ") + ">" + inner + (attrs.href ? "</a>" : "</button>");
  const face = (icon, label) => '<span class="br-circle">' + SPR.draw(icon, 3) + '</span><span class="br-label">' + esc(label) + "</span>";
  return links.map((l) => { const x = site(l); return tile(face(x.icon, x.label), { href: safeUrl(l.url), target: "_blank", rel: "noopener", "data-address": safeUrl(l.url).replace(/^https?:\/\/(www\.)?/, "") }); }).join("") +
    (phone ? tile(face("mail", "Write to me"), { href: mailto(), id: "cm-send" }) : tile(face("mail", "Write to me"), { "data-act": "br-mail" })) +
    tile(face("stampicon", "This desk"), { "data-act": "cm-close" });
}
export function contactContent(phone) {
  const p = rt.state.profile;
  if (phone) return '<p class="cm-title" id="cm-title">Look me up</p><div class="br-tiles br-grid">' + shortcuts(true) + '</div><p class="cm-note" id="cm-note" aria-live="polite"></p>';
  return '<div class="cm-mail" id="cm-mail"><p class="cm-title" id="cm-title">New message</p>' +
    '<div class="cm-row"><span class="cm-lab">To:</span><span class="cm-val">' + esc(p.email) + '</span><button class="cm-btn" data-act="cm-copy">Copy address</button></div>' +
    '<label class="cm-row" for="cm-subject"><span class="cm-lab">Subject:</span><input id="cm-subject" class="cm-in" value="Hello from your portfolio" autocomplete="off"></label>' +
    '<p class="cm-sudo" id="cm-sudo" role="status" hidden></p><label class="cm-lab cm-block" for="cm-msg">Message:</label><textarea id="cm-msg" class="cm-in" rows="3"></textarea>' +
    '<div class="cm-row"><a class="cm-btn cm-send" id="cm-send" href="' + esc(mailto()) + '">Send</a><button class="cm-btn" data-act="cm-browser">Look me up</button><span class="cm-note" id="cm-note" aria-live="polite"></span></div></div>' +
    '<div class="cm-browser" id="cm-browser" hidden><div class="br-title"><span>Look me up</span><button class="br-x" data-act="br-close" aria-label="Close the browser">X</button></div>' +
    '<div class="br-nav"><button class="br-arrow" aria-label="Back" disabled>' + SPR.draw("left", 3) + '</button><button class="br-arrow" aria-label="Forward" disabled>' + SPR.draw("right", 3) + "</button>" +
    '<div class="br-addr"><span class="br-search">search:</span> <span id="br-url"></span></div></div><div class="br-load" id="br-load"><i></i></div>' +
    '<div class="br-tiles">' + shortcuts(false) + "</div></div>";
}
// keys drawn over the sprite's flat keyboard so they can go down: three rows and a space bar, in art pixels
export const KEYROWS = [["QWERTYUIOP", 6, 49], ["ASDFGHJKL", 7, 52], ["ZXCVBNM", 8, 55]];
export function keyboardHTML(s) {
  const k = (label, x, y, w, extra) => '<span class="cm-key' + (extra || "") + '" data-k="' + esc(label) + '" style="left:' + x * s + "px;top:" + y * s + "px;width:" + w * s + "px;height:" + 2 * s + "px;--ks:" + s + 'px"></span>';
  let out = "";
  KEYROWS.forEach((r) => { r[0].split("").forEach((ch, i) => { out += k(ch, r[1] + i * 4, r[2], 3); }); });
  out += k("Back", 46, 49, 6, " wide") + k("Enter", 44, 52, 8, " wide") + k("Enter", 44 + 0, 55, 0, " gone") + k(" ", 16, 58, 24, " wide");
  const kb = ART.computer.keys;
  return '<div class="cm-keys" aria-hidden="true" style="left:' + kb.x * s + "px;top:" + kb.y * s + "px;width:" + kb.w * s + "px;height:" + kb.h * s + 'px"></div>' +
    '<div class="cm-keyset" aria-hidden="true">' + out + "</div>";
}
export function pressKey(name) {
  if (reduced()) return;
  let el = $('.cm-key[data-k="' + (name === " " ? " " : name) + '"]');
  if (!el) { const all = $$(".cm-key:not(.wide):not(.gone)"); el = all[Math.floor(Math.random() * all.length)]; }
  if (!el) return;
  el.classList.add("down");
  setTimeout(() => el.classList.remove("down"), 80);
}
export function keyName(ev) { return ev.key === "Enter" ? "Enter" : ev.key === "Backspace" ? "Back" : ev.key === " " ? " " : ev.key.length === 1 ? ev.key.toUpperCase() : null; }
export function typeSound(name) { FX.play(name === " " || name === "Enter" || name === "Back" ? "keybig" : "key"); }
export function openContact(from) {
  const box = $("#contact"), dev = $("#cm-device"), phone = isPhone(), a = ART[phone ? "phone" : "computer"];
  if (!box || !a) return;
  contactReturn = from || document.activeElement;
  // the largest whole-number scale where the whole device fits with 24px to spare
  const s = Math.max(3, Math.min(14, Math.floor(Math.min((window.innerWidth - 48) / a.w, (window.innerHeight - 48) / a.h))));
  const sc = a.screen, cl = phone ? { x: 4, y: 19 } : a.close;
  dev.innerHTML = SPR.art(phone ? "phone" : "computer", s) + (phone ? "" : keyboardHTML(s)) +
    '<div class="cm-screen" style="left:' + sc.x * s + "px;top:" + sc.y * s + "px;width:" + sc.w * s + "px;height:" + sc.h * s + 'px"><div class="cm-content" id="cm-content">' + contactContent(phone) + "</div></div>" +
    (phone ? '<button class="cm-x" data-act="cm-close" aria-label="Close the contact screen" style="left:' + cl.x * s + "px;top:" + cl.y * s + 'px">X</button>'
      : '<button class="cm-power" data-act="cm-close" aria-label="Turn off computer (close)" style="left:' + (a.power.x * s + s - 16) + "px;top:" + (a.power.y * s + s - 16) + "px;--led:" + 2 * s + 'px"><span class="tip" aria-hidden="true">Power off</span></button>');
  dev.style.width = a.w * s + "px"; dev.style.height = a.h * s + "px";
  box.hidden = false; ui.contactOpen = true;
  app.inert = true; introRoot.inert = true;
  fitContact(sc.w * s, sc.h * s);
  void dev.offsetWidth; box.classList.add("open");
  FX.play("hum");
  const first = $("#cm-subject", dev) || $(".br-tile", dev);
  setTimeout(() => { if (first) first.focus({ preventScroll: true }); }, reduced() ? 0 : 200);
}
export function fitContact(w, h) {
  const c = $("#cm-content");
  c.style.transform = ""; c.style.width = w + "px"; c.style.height = "";
  const k = Math.min(1, h / c.scrollHeight);
  // shrink to fit the height, with the width widened by the same amount so it still fills the screen exactly
  if (k < 1) { c.style.width = w / k + "px"; c.style.transform = "scale(" + k + ")"; c.style.height = h / k + "px"; }
  else c.style.height = h + "px";
}
export function openBrowser() {
  const b = $("#cm-browser");
  if (!b) return;
  b.hidden = false; $("#cm-mail").hidden = true;
  $("#br-url").textContent = ""; $("#br-load").className = "br-load";
  const t = $(".br-tile", b); if (t) t.focus({ preventScroll: true });
}
export function closeBrowser() {
  const b = $("#cm-browser");
  if (!b || b.hidden) return false;
  b.hidden = true; $("#cm-mail").hidden = false;
  const back = $('[data-act="cm-browser"]'); if (back) back.focus({ preventScroll: true });
  return true;
}
// The site opens in a new tab straight from the click; the address bar types it out and loads alongside.
export let typing = null;
export function typeAddress(text) {
  const url = $("#br-url"), load = $("#br-load");
  if (!url) return;
  clearInterval(typing); url.textContent = ""; load.className = "br-load";
  if (reduced()) { url.textContent = text; load.className = "br-load done"; return; }
  let i = 0;
  typing = setInterval(() => {
    url.textContent = text.slice(0, ++i);
    const ch = text[i - 1]; FX.play("key"); pressKey(/[a-z]/i.test(ch) ? ch.toUpperCase() : null);
    if (i >= text.length) { clearInterval(typing); load.className = "br-load go"; setTimeout(() => { load.className = "br-load done"; }, 500); }
  }, 20);
}
// Power off: the button presses for a frame, the picture folds to a line and then a dot, the screen goes dark,
// and the computer slides away. Escape and a click outside close it the same way.
export function closeContact() {
  const box = $("#contact");
  if (!box || !ui.contactOpen || box.classList.contains("closing")) return;
  clearInterval(typing);
  const done = () => {
    ui.contactOpen = false;
    box.classList.remove("open", "closing", "off"); box.hidden = true;
    app.inert = false; introRoot.inert = false;
    const back = $("#slip.loose") || contactReturn;
    if (back) back.focus({ preventScroll: true });
  };
  if (reduced()) { done(); return; }
  const pw = $(".cm-power", box);
  box.classList.add("closing");
  if (pw) pw.classList.add("pressed");
  FX.play("poweroff");
  setTimeout(() => {
    if (pw) pw.classList.remove("pressed");
    box.classList.add("off");
    setTimeout(() => { box.classList.remove("open"); setTimeout(done, 360); }, 300);
  }, 60);
}

// what this part sets up when the page starts (run in the original order by start.js)
export function start() {
  // Content larger than the screen is scaled down, never the computer itself.
  // buttons on the computer's screen beep: Send chirps, closing the browser is a lower blip
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest && ev.target.closest(".cm-screen button, .cm-screen a");
    if (!b) return;
    FX.play(b.id === "cm-send" || b.classList.contains("cm-send") ? "chirp" : b.matches(".br-x, [data-act=br-close]") ? "boop" : "beep");
  }, true);
}
