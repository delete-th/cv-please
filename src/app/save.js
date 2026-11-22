// Saving amended papers back to the Claude artifact.
import { rt } from "./core.js";
import { $, ORIGINAL, PX, SPR } from "./core.js";
import { renderFixed, setOwner } from "./booth.js";
import { walkIn } from "./walkin.js";
import { render } from "./listview.js";
import { renderIntro } from "./intro.js";

// ----- saving: the whole page, rebuilt from its own source and the current data -----
export function buildDoc() {
  const lt = "<", sc = "script", block = (id) => lt + sc + ' id="' + id + '">' + $("#" + id).textContent + lt + "/" + sc + ">\n";
  const json = JSON.stringify(rt.state, null, 1).replace(/</g, "\\u003c");
  return "<!doctype html><html><head><meta charset=utf8><meta name=viewport content=\"width=device-width,initial-scale=1,viewport-fit=cover\"><style>" +
    ":root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui,sans-serif}img{max-width:100%}[hidden]{display:none!important}" +
    "</style></head><body>" +
    "<title>CV Please</title>\n<meta name=\"claude:viewport-fit-sides\" content=\"cover\">\n" +
    '<link rel="stylesheet" href="' + $("#fonts").getAttribute("href") + '" id="fonts">\n' +
    "<style id=\"page-style\">" + $("#page-style").textContent + "</style>\n<div id=\"app\"></div>\n<div id=\"intro-root\"></div>\n<div id=\"fixed-root\"></div>\n" +
    lt + sc + " type=\"application/json\" id=\"cv-data\">" + json + lt + "/" + sc + ">\n" + block("art") + block("sprites") + block("sounds") + block("fx") + block("demos") + block("main") + "</body></html>";
}
export async function save() {
  if (!rt.artifact || rt.busy || !rt.dirty) return;
  rt.busy = true; rt.note = ""; setOwner();
  try {
    await rt.artifact.publish(buildDoc());
  } catch (err) {
    rt.busy = false;
    const code = err && err.code;
    if (code === "conflict") rt.note = "A newer version was saved first. Reloading it.";
    else if (["not_writer", "not_granted", "not_declared", "consent_required", "capability_disabled", "capability_removed"].includes(code)) {
      rt.canEdit = false; rt.editing = false; rt.state = JSON.parse(ORIGINAL); render(); return;
    }
    else if (code === "too_large") rt.note = "Too much text to save. Shorten something and try again.";
    else if (code === "rate_limited") rt.note = "Saving too often. Wait a moment, then file again.";
    else rt.note = "Could not save. Your edits are still here, so try again.";
    setOwner();
  }
}

// what this part sets up when the page starts (run in the original order by start.js)
export function start() {
  SPR.installTiles(PX);
  renderFixed();
  render();
  renderIntro();
  walkIn();
  (async function () {
    if (!window.claude || !window.claude.use) return;
    const got = await Promise.all([window.claude.use("artifact"), window.claude.use("user")]);
    rt.artifact = got[0];
    if (!rt.artifact) return;
    rt.canEdit = got[1] ? await got[1].canEdit() : true;
    if (rt.canEdit) setOwner();
  })();
}
