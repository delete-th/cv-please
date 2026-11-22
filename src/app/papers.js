// Skills, stacks and the papers on the desk: what each one says.
import { rt } from "./core.js";
import { $, BX, DEMOS, PX, SC, SPR, esc, field, isPhone, rnd, shortName, ui } from "./core.js";
import { TABC } from "./drawers.js";
import { boardFor } from "./whiteboard.js";

// ----- skills and stacks -----
export const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const skillParts = (sk) => sk.replace(/\(.*?\)/g, "").split("/").map((s) => s.trim().toLowerCase()).filter(Boolean);
export const uses = (text, sk) => skillParts(sk).some((p) => new RegExp("(^|[^a-z0-9+#])" + reEsc(p) + "($|[^a-z0-9+#])").test(String(text).toLowerCase()));
export const stackHTML = (x) => x.stack.split(/,\s*/).map((item) => (ui.hot && uses(item, ui.hot) ? "<mark>" + esc(item) + "</mark>" : esc(item))).join(", ");
// ----- the papers on the desk -----
export const caseIds = () => rt.state.projects.map((p, i) => "case-" + i);
export const ORDER = () => ["id", "diploma", "honours"].concat(caseIds());
export const paperIds = ORDER;
export const caseIndex = (id) => (/^case-\d+$/.test(id) ? +id.slice(5) : -1);
export const paperLabel = (id) => (id === "id" ? "ID card" : id === "diploma" ? "Diploma" : id === "honours" ? "Commendations" : shortName(rt.state.projects[caseIndex(id)]));
export const pst = (id) => ui.papers[id] || (ui.papers[id] = { x: null, y: null, tilt: +(rnd(id, "tilt") * 3 - 1.5).toFixed(1), open: false, page: 0, pages: null, away: false, prev: null, inBox: caseIndex(id) >= 0, outPos: null });
export const paperEl = (id) => $('#desk .paper[data-id="' + id + '"]');
export const portraitAlt = "Pixel portrait of Thea: short dark hair, light shirt with an open collar";
export function idInner() {
  const p = rt.state.profile;
  return '<div class="pad stampable" data-stamp="id"><p class="doc-title">Identity card</p><div class="id-body"><div class="id-photo">' + SPR.applicant("thea", 2, portraitAlt) +
    '</div><dl class="fields">' + field("Name", p.name) + field("Nationality", p.nationality) + field("Based in", p.basedIn) + field("Occupation", p.occupation) + "</dl></div>" +
    '<span class="id-ghost" aria-hidden="true">' + SPR.applicant("thea", 1, "") + '</span><span class="id-seal" aria-hidden="true"></span><span class="id-strip" aria-hidden="true"></span>' +
    '<div class="stamp-box ghost' + (ui.inked.id ? " inked" : "") + '" aria-hidden="true"></div><div class="marks" data-marks="id"></div></div>';
}
// A landscape certificate: crest watermark, gold seal, red ribbon, a double rule, and the wording of a real diploma.
// The university and degree come from the education entry; the honour is split off the degree name.
export function diplomaInner() {
  const e = rt.state.education, p = rt.state.profile;
  const school = String(e.school || ""), uni = school.split("(")[0].trim(), partner = (school.match(/\(([^)]+)\)/) || [])[1] || "";
  const degree = String(e.degree || ""), honour = (degree.match(/\(([^)]+)\)/) || [])[1] || "", name = degree.replace(/\s*\([^)]*\)/, "").trim();
  return '<div class="dip stampable" data-stamp="diploma"><span class="dip-mark" aria-hidden="true">' + SPR.crest(7, "wood-5") + "</span>" +
    '<span class="dip-seal" aria-hidden="true">' + SPR.crest(2) + '</span><span class="dip-ribbon" aria-hidden="true"></span>' +
    '<p class="dip-uni">' + esc(uni) + "</p>" + (partner ? '<p class="dip-small dip-it">in partnership with the ' + esc(partner) + "</p>" : "") +
    '<p class="dip-small">On the recognition of successful completion of the requisite course of study, we hereby confer upon</p>' +
    '<p class="dip-name">' + esc(p.name) + '</p><p class="dip-small dip-it">the degree of</p><p class="dip-degree">' + esc(name) + "</p>" +
    (honour ? '<p class="dip-honour">' + esc(honour.charAt(0).toUpperCase() + honour.slice(1)) + "</p>" : "") +
    '<p class="dip-small">' + esc(e.major) + "</p>" +
    '<div class="dip-foot"><span class="dip-sign"><i aria-hidden="true">' + SPR.draw("squiggle", 1) + "</i><b>Registrar</b></span>" +
    '<span class="dip-conf">Conferred ' + esc(e.graduated) + '</span><span class="dip-sign"><i aria-hidden="true">' + SPR.draw("squiggle2", 1) + "</i><b>Dean</b></span></div>" +
    '<div class="stamp-box ghost' + (ui.inked.diploma ? " inked" : "") + '" aria-hidden="true"></div><div class="marks" data-marks="diploma"></div></div>';
}
// each award gets its pin, matched by the award's own words
export function pinFor(a) {
  const r = (a.result || "").toLowerCase();
  if (r.includes("entrepreneur")) return "pin-entrepreneurial";
  if (r.includes("runner")) return "pin-runnerup";
  if (r.includes("best solution")) return "pin-bestsolution";
  return "";
}
export function honoursInner() {
  return '<span class="hon-clip" aria-hidden="true">' + SPR.art("paperclip", 3) + '</span><div class="pad"><p class="doc-title">Commendations</p>' + rt.state.awards.filter((a) => a.result).map((a, i) => {
    const pin = pinFor(a);
    return '<div class="honour' + (pin ? " pinned" : "") + (ui.pinHot === i ? " lit" : "") + '">' +
      (pin ? '<button class="pin" data-act="pin" data-i="' + i + '" aria-pressed="' + (ui.pinHot === i) + '" aria-label="Pin for ' + esc(a.result) + '. Highlight this award.">' + SPR.art(pin, 2) + "</button>" : "") +
      '<div class="hon-text"><span class="hon-line"><b>' + esc(a.result) + "</b>, " + esc(a.event) + " " + esc(a.year) + "</span><p>" + esc(a.note) + "</p></div></div>";
  }).join("") + "</div>";
}
export function folderInner(i) {
  const p = rt.state.projects[i];
  const filed = pst(("case-" + i)).inBox && !isPhone(), side = ["left", "right"][i % 2];
  return SPR.art("fstrip-" + (i % 7), BX, "fold-art") + '<span class="ft-icon ft-' + side + '" aria-hidden="true">' + SPR.draw(p.icon || "paper", 1) + "</span>" +
    '<button class="folder-tab ft-' + side + '" data-act="tab" data-id="' + ("case-" + i) + '" tabindex="' + (filed ? 0 : -1) + '" aria-label="' + esc(p.name) + '"' + (filed ? "" : ' aria-hidden="true"') + '><span class="ft-full">' + esc(shortName(p)) +
    '</button><span class="clip">' + SPR.art("paperclip", SC) + "</span>" +
    '<div class="folder-face">' + SPR.draw(p.icon || "paper", PX) + "<div><b>" + esc(shortName(p)) + '</b><span class="when">' + esc(p.dates) + "</span></div></div>" +
    (p.award ? '<span class="ink red mini-stamp">' + esc(p.award) + "</span>" : "") + '<span class="peek" aria-hidden="true">Open file</span>';
}
// An open case file is split into pages that fit the desk, so it never needs an inner scrollbar.
// The demo, when there is one, always gets the last page to itself.
export function caseBlocks(i) {
  const p = rt.state.projects[i], meta = [p.role, p.dates, p.event].filter(Boolean).map(esc).join(" · ");
  return {
    top: '<div class="case-top">' + SPR.draw(p.icon || "paper", PX) + "<div><h3>" + esc(p.name) + '</h3><p class="meta">' + meta + "</p></div>" +
      (p.award ? '<span class="ink red">' + esc(p.award) + "</span>" : "") + '</div><p class="line">' + esc(p.line) + "</p>",
    points: p.points.filter(Boolean).map((t) => "<li>" + esc(t) + "</li>"),
    stack: '<p class="stack"><span class="stack-label">Built with</span><br><span class="stack-items">' + stackHTML(p) + "</span></p>",
    demo: DEMOS[p.demo] ? '<div class="demo-zone"><button class="btn-main" data-act="demo" data-i="' + i + '">Run demo</button><div class="demo-box" hidden></div></div>' : "",
  };
}
export function paginate(i, el) {
  const b = caseBlocks(i);
  if (isPhone()) return [b.top + '<ul class="points">' + b.points.join("") + "</ul>" + b.stack + b.demo];
  const head = $(".paper-head", el), limit = el.clientHeight - (head ? head.offsetHeight : 44);
  const m = document.createElement("div");
  m.className = "paper-body measure";
  m.style.cssText = "position:absolute;visibility:hidden;left:0;top:0;width:" + el.clientWidth + "px;height:auto;overflow:visible";
  el.appendChild(m);
  const pages = [];
  const fits = () => m.scrollHeight <= limit;
  const flush = () => { pages.push(m.innerHTML); m.innerHTML = ""; };
  const put = (html, asPoint) => {
    const before = m.innerHTML;
    if (asPoint) { let ul = m.lastElementChild; if (!ul || !ul.matches("ul.points")) { m.insertAdjacentHTML("beforeend", '<ul class="points"></ul>'); ul = m.lastElementChild; } ul.insertAdjacentHTML("beforeend", html); }
    else m.insertAdjacentHTML("beforeend", html);
    if (!fits() && before) { m.innerHTML = before; flush(); put(html, asPoint); }
  };
  put(b.top);
  b.points.forEach((li) => put(li, true));
  if (b.demo) { flush(); m.innerHTML = b.stack + b.demo; flush(); } else { put(b.stack); flush(); }
  m.remove();
  return pages.filter(Boolean);
}
export function caseInner(i) {
  const p = rt.state.projects[i], st = pst("case-" + i), pages = st.pages || [""], n = pages.length, page = Math.min(st.page, n - 1), id = "case-" + i;
  // page count and the way back sit at the bottom right, beside the corner that turns the page
  const foot = n > 1 ? '<div class="pg-foot">' + (page > 0 ? '<button class="pg-back" data-act="page" data-id="' + id + '" data-dir="-1" aria-label="Back to page ' + page + '">Previous page</button>' : "") +
    '<span class="pg">Page ' + (page + 1) + " of " + n + "</span></div>" : "";
  const note = boardFor(p) && !isPhone() ? '<button class="cf-board" data-act="cf-board" data-id="' + id + '">How I built it ↑</button>' : "";
  return note + '<header class="paper-head"><h2>' + esc(p.name) + '</h2><div class="ph-row">' +
    '<button class="close icon-btn" data-act="to-box" data-id="' + id + '" aria-label="Return to box">' + SPR.draw("tobox", 2) + '<span class="ib-tip" aria-hidden="true">Return to box</span></button>' +
    '<button class="close icon-btn" data-act="close-case" data-id="' + id + '" aria-label="Close file">' + SPR.draw("xmark", 2) + '<span class="ib-tip" aria-hidden="true">Close file</span></button></div></header>' +
    '<div class="sheets"><div class="paper-body">' + pages[page] + "</div></div>" + foot +
    (n > 1 && page < n - 1 ? '<button class="corner" data-act="flip" data-id="' + id + '" aria-label="Turn to page ' + (page + 2) + '">' + SPR.draw("corner", PX) + "</button>" : "");
}
export function paperInner(id) {
  if (id === "id") return idInner();
  if (id === "diploma") return diplomaInner();
  if (id === "honours") return honoursInner();
  const i = caseIndex(id);
  return pst(id).open ? caseInner(i) : folderInner(i);
}
export function paperHTML(id) {
  const st = pst(id), i = caseIndex(id), kind = i >= 0 ? "case" : id;
  const cls = "paper p-" + kind + (st.open ? " open" : "") + (st.away ? " away" : "") + (i >= 0 && st.inBox && !st.open && !isPhone() ? " filed" : "") + (isPhone() ? "" : " packed") +
    (i >= 0 && ui.hot && uses(rt.state.projects[i].stack, ui.hot) ? " hot" : "");
  const label = i >= 0 ? "Case file: " + rt.state.projects[i].name : paperLabel(id);
  return '<article class="' + cls + '" data-id="' + id + '" data-drag tabindex="' + (cls.includes(" filed") ? -1 : 0) + '" aria-label="' + esc(label) + '"' +
    (i >= 0 ? ' aria-expanded="' + st.open + '"' : "") + ' style="--tilt:' + st.tilt + "deg" + (i >= 0 ? ";--tab-x:" + ((i % 3) * 34 + 8) + "px;--tabc:" + TABC[i % TABC.length] : "") + '">' + paperInner(id) + "</article>";
}
export function skillsHTML() {
  const p = frontCase();
  return '<div class="skills-card"><p class="note">Pick a skill to see which case files used it.</p><div class="sk-cols">' + rt.state.skills.map((g) => '<div class="sk-group"><h3>' + esc(g.group) + "</h3>" +
    g.items.map((s) => '<button class="sk' + (ui.hot === s ? " hot" : "") + (p && uses(p.stack, s) ? " used" : "") + '" data-act="skill" data-s="' + esc(s) + '" aria-pressed="' + (ui.hot === s) + '">' + esc(s) + "</button>").join("") + "</div>").join("") + "</div></div>";
}
export function frontCase() { const i = caseIndex(ui.front || ""); return i >= 0 ? rt.state.projects[i] : null; }
