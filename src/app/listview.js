// The plain list view (Simplify) and amend mode.
import { rt } from "./core.js";
import { $, $$, FX, PX, SPR, app, at, esc, isPhone, safeUrl, today, ui } from "./core.js";
import { paperEl, paperIds, pst } from "./papers.js";
import { boothHTML, deskBelowHTML, deskHTML, fitPinboard, ownerBar, recordHTML } from "./booth.js";
import { applyScene, computeFit, placeFurniture, placeStickers, setPos, sizeScene } from "./scene.js";
import { placeOpen, renderPutAway } from "./handling.js";
import { layoutDrawer } from "./drawers.js";
import { drawHands, placePobj } from "./things.js";
import { held, placeHeld, renderMarks, springBack, updateBar } from "./stamps.js";
import { slipHome } from "./printer.js";
import { updatePill } from "./nav.js";

// ----- list view and amend mode -----
export function f(path, ph, cls, tag) {
  tag = tag || "span";
  const val = at(path), text = Array.isArray(val) ? val.join(", ") : val;
  if (!rt.editing) return "<" + tag + (cls ? ' class="' + cls + '"' : "") + ">" + esc(text) + "</" + tag + ">";
  return "<" + tag + ' class="f ' + (cls || "") + '" data-k="' + path + '"' + (Array.isArray(val) ? " data-list" : "") +
    ' data-ph="' + esc(ph) + '" role="textbox" aria-label="' + esc(ph) + '" spellcheck="false">' + esc(text) + "</" + tag + ">";
}
export const del = (path, i, what) => (rt.editing ? '<button class="mini" data-act="del" data-p="' + path + '" data-i="' + i + '">Remove ' + what + "</button>" : "");
export const add = (path, type, what) => (rt.editing ? '<button class="mini add" data-act="add" data-p="' + path + '" data-t="' + type + '">Add ' + what + "</button>" : "");
export const row = (label, html) => '<div class="edit-row"><span class="lab">' + label + "</span>" + html + "</div>";
export const blk = () => (rt.editing ? "block" : "");
export const BLANK = {
  point: "", strength: "", link: { label: "", url: "" }, skill: { group: "", items: [] }, award: { year: "", result: "", event: "", note: "" },
  project: { name: "", short: "", icon: "paper", demo: "", role: "", dates: "", event: "", award: "", line: "", points: [""], stack: "", aside: "", featured: "" },
};
export const WHEN = { arrive: "When the booth opens", unpacked: "When the file is unpacked", drawer: "When the Skills drawer opens", record: "When the entry record prints",
  firstcase: "When the first case file opens", personal: "When the Personal drawer opens", watch: "When the watch is picked up", sketchbook: "When the sketchbook is opened",
  intercom: "When the intercom is pressed", idle: "After 30 quiet seconds",
  approved: "After an approved stamp on the record", denied: "After a denied stamp on the record" };
export function listCase(x, i) {
  const k = "projects." + i + ".";
  if (rt.editing) {
    return '<article class="case">' + row("Name", f(k + "name", "Project name")) + row("Role", f(k + "role", "Your role")) + row("Dates", f(k + "dates", "When")) +
      row("Event", f(k + "event", "Hackathon or event, optional")) + row("Award stamp", f(k + "award", "Award, optional")) + row("Short label", f(k + "short", "Folder tab label, optional")) + row("One-liner", f(k + "line", "What it does, in one sentence")) +
      x.points.map((pt, j) => '<div class="edit-point">' + f(k + "points." + j, "What you built, and for whom", "block") + del(k + "points", j, "point") + "</div>").join("") +
      add(k + "points", "point", "point") + row("Built with", f(k + "stack", "Tools and services")) + row("Radio aside", f(k + "aside", "Shown once when this file is opened. Leave empty to stay quiet.")) +
      row("On entry record", f(k + "featured", "Type yes to list it as a top project")) + del("projects", i, "case file") + "</article>";
  }
  return '<article class="case"><div class="case-top">' + SPR.draw(x.icon || "paper", PX) + "<div><h3>" + esc(x.name) + '</h3><p class="meta">' + [x.role, x.dates, x.event].filter(Boolean).map(esc).join(" · ") + "</p></div>" +
    (x.award ? '<span class="ink red">' + esc(x.award) + "</span>" : "") + '</div><p class="line">' + esc(x.line) + "</p><ul>" +
    x.points.filter(Boolean).map((t) => "<li>" + esc(t) + "</li>").join("") + '</ul><p class="stack">Built with: ' + esc(x.stack) + "</p></article>";
}
export function renderList() {
  const p = rt.state.profile, sec = (id, title, sub, body) => '<section class="sec" id="' + id + '"><header><h2>' + title + "</h2>" + (sub ? "<p>" + sub + "</p>" : "") + "</header><div>" + body + "</div></section>";
  const links = p.links.map((l, i) => rt.editing
    ? '<div class="edit-row">' + f("profile.links." + i + ".label", "Label") + f("profile.links." + i + ".url", "https://…") + del("profile.links", i, "link") + "</div>"
    : (safeUrl(l.url) ? '<a href="' + esc(safeUrl(l.url)) + '" target="_blank" rel="noopener">' + esc(l.label) + "</a>" : "")).join("");
  const answered = rt.state.interview.filter((q) => q.q && q.a);
  app.innerHTML = '<div class="wrap list"><header class="top"><span class="who">' + esc(p.name) + '</span><nav aria-label="Page">' +
    (rt.editing ? "" : '<button class="btn-quiet" data-act="view" data-v="desk">Desk view</button><button class="btn-quiet" data-act="passport">Inspect passport</button>') +
    '<span class="owner" id="owner">' + ownerBar() + "</span></nav></header>" +
    '<section class="hero">' + (ui.admitted === "approved" && !rt.editing ? '<span class="ink green entry">Approved<small>' + today + "</small></span>" : "") +
    f("profile.greeting", "Greeting", "", "h1").replace("<h1", '<h1 tabindex="-1" id="hello"') + f("profile.tagline", "One-line tagline", "tagline " + blk(), "p") +
    f("profile.summary", "A short summary", "summary " + blk(), "p") +
    (rt.editing ? '<div style="margin-top:20px">' + row("Full name", f("profile.name", "Full name")) + row("Nationality", f("profile.nationality", "Nationality")) +
      row("Based in", f("profile.basedIn", "Where you live")) + row("Occupation", f("profile.occupation", "Shown on the passport and ID card")) +
      row("Seeking", f("profile.seeking", "Roles you want, for the entry record")) + row("Booth eyebrow", f("profile.eyebrow", "Three words over your name")) +
      row("Open to", f("profile.openTo", "Index card on the pinboard")) + row("Currently", f("profile.currently", "Sticky note on the pinboard (left empty, it stays hidden)")) + row("Departure board", f("profile.board", "Phrases, separated by commas")) + "</div>" : "") + "</section>" +
    sec("cases", "Case files", "Projects I built or led, most with a student team.", rt.state.projects.map(listCase).join("") + add("projects", "project", "case file")) +
    sec("strengths", "Strengths", rt.editing ? "Printed on the entry record." : "",
      rt.editing ? rt.state.strengths.map((s, i) => '<div class="edit-point">' + f("strengths." + i, "A strength, as a plain fact", "block") + del("strengths", i, "strength") + "</div>").join("") + add("strengths", "strength", "strength")
        : '<ul class="plain">' + rt.state.strengths.filter(Boolean).map((s) => "<li>" + esc(s) + "</li>").join("") + "</ul>") +
    (rt.editing || answered.length ? sec("interview", "Interview", rt.editing ? "Questions with an empty answer stay hidden from visitors." : "",
      rt.editing ? rt.state.interview.map((q, i) => '<div class="edit-point">' + row("Question", f("interview." + i + ".q", "Question")) + f("interview." + i + ".a", "Your answer, two or three sentences", "block") + "</div>").join("")
        : answered.map((q) => "<h3>" + esc(q.q) + "</h3><p>" + esc(q.a) + "</p>").join("")) : "") +
    (rt.editing ? sec("radio", "Booth radio", "One line each, shown once. The radio stays hidden until at least one line is written.",
      rt.state.assistant.map((a, i) => row(esc(WHEN[a.when] || a.when), f("assistant." + i + ".line", "Leave empty to stay quiet"))).join("")) : "") +
    (rt.editing ? sec("things", "Desk things", "A note beside each thing in the Personal drawer. Empty notes stay hidden.",
      (rt.state.effects || []).map((e, i) => row(esc({ watch: "Watch", sketchbook: "Sketchbook", bottle: "Bottle", usb: "USB stick", gum: "Gum", mints: "Mint tin", keycap: "Keycap" }[e.id] || e.id), f("effects." + i + ".note", "Leave empty to stay hidden"))).join("")) : "") +
    sec("honours", "Commendations", "Hackathon results from 2026.", rt.state.awards.map((a, i) => '<div class="honour"><span class="yr">' + f("awards." + i + ".year", "Year") + "</span><div><b>" +
      f("awards." + i + ".result", "Result") + "</b>, " + f("awards." + i + ".event", "Event") + "<p>" + f("awards." + i + ".note", "What it was for") + "</p>" + del("awards", i, "entry") + "</div></div>").join("") + add("awards", "award", "entry")) +
    sec("skills", "Skills", "What I have used in the case files above.", '<dl class="skills">' + rt.state.skills.map((s, i) => "<dt>" + f("skills." + i + ".group", "Group") + "</dt><dd>" +
      f("skills." + i + ".items", "Skills, separated by commas", blk()) + del("skills", i, "group") + "</dd>").join("") + "</dl>" + add("skills", "skill", "group")) +
    sec("diploma", "Diploma", "", f("education.degree", "Degree", blk(), "h3") + f("education.school", "School", blk(), "p") + "<p>" + f("education.major", "Major") +
      '</p><p class="meta">Graduated ' + f("education.graduated", "When") + " · Coursework: " + f("education.coursework", "Coursework") + "</p>") +
    sec("contact", "Contact", "Email is the fastest way to reach me.", '<div class="row">' + f("profile.email", "Email address", "email") +
      (rt.editing ? "" : '<button class="btn-quiet" data-act="copy">Copy address</button>') + '</div><div class="' + (rt.editing ? "" : "row ") + 'links">' + links + "</div>" + add("profile.links", "link", "link")) +
    "</div>";
  $$(".f", app).forEach((el) => {
    try { el.contentEditable = "plaintext-only"; } catch (err) { el.contentEditable = "true"; }
    if (el.contentEditable !== "plaintext-only") el.contentEditable = "true";
  });
}
export function renderDesk() {
  app.innerHTML = '<main class="site"><div class="rooms" id="rooms" style="--room:' + (isPhone() ? 0 : ui.room) + '"><section class="room room-desk scene" id="scene" aria-label="Desk"><div class="room-pan" id="room-pan"><div class="stage' + (ui.lampOn ? "" : " lamp-off") + '" id="stage">' + boothHTML() + deskHTML() +
    '</div><div class="floor" aria-hidden="true"></div><div class="dw-pull" id="dw-pull">' + deskBelowHTML() + '</div></div></section>' + recordHTML() + "</div></main>";
  rt.board = FX.board($("#board"), rt.state.profile.board, 20);
  sizeScene();
  if (!isPhone()) placeFurniture();
  computeFit();
  placeStickers();
  renderPutAway();
  renderMarks("record"); renderMarks("id"); renderMarks("diploma");
  if (ui.slipTorn && !isPhone()) { const sl = $("#slip"), home = slipHome(); if (sl && home && sl.parentElement !== home) home.appendChild(sl); if (sl && ui.slipPos) setPos(sl, ui.slipPos[0], ui.slipPos[1]); }
  layoutDrawer(false);
  $$(".pobj").forEach(placePobj); drawHands(); fitPinboard();
  applyScene(true);
  paperIds().forEach((id) => { const el = paperEl(id); if (el && pst(id).open) placeOpen(el); });
  updatePill(); updateBar();
  $$(".room").forEach((r, k) => { r.inert = !isPhone() && k !== ui.room; });
  const dip = paperEl("diploma"); if (dip) dip.style.setProperty("--dzoom", isPhone() ? Math.min(1, (window.innerWidth * 0.86) / 480).toFixed(3) : 1);
  // the Records room scrolls on its own; the tray follows the stamp box as it does
  const recRoom = $("#record");
  if (recRoom) recRoom.addEventListener("scroll", () => { updateBar(); if (held && !held.busy) placeHeld(held.fx, held.fy); }, { passive: true });
}
export function render() {
  const desk = !rt.editing && ui.view === "desk";
  if (held) springBack(true);
  document.documentElement.classList.toggle("desk-mode", desk);
  if (desk) renderDesk(); else renderList();
  updateBar();
}
