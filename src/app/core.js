// Shared helpers, the page state and the view settings.
import { dayPhase } from "./booth.js";

export const $ = (s, r) => (r || document).querySelector(s);
export const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
export const app = $("#app"), introRoot = $("#intro-root"), fixedRoot = $("#fixed-root");
export const SPR = window.SPR, DEMOS = window.DEMOS, FX = window.FX, PX = 3, SC = 3, BX = 4, ART = window.ART || {};
export const ORIGINAL = $("#cv-data").textContent;
export const ui = {
  view: "desk", admitted: null, introStep: 0, introDone: false, passPage: 0,
  marks: { visa: [], record: [], id: [], diploma: [] }, inked: { visa: false, record: false, id: false, diploma: false }, papers: {}, stickers: {}, scene: null, maxOut: 0,
  forced: false, boothForced: false, handled: false, drawer: 0, fit: 1,
  mints: 3, hot: null, front: null, printed: false, torn: 0, slipTorn: false, slipPos: null,
  barAuto: false, barPinned: null, radioOn: true, said: new Set(), asked: null,
  room: 0, liftCard: null, lampOn: ["dusk", "night"].includes(dayPhase()), lampTouched: false, pinHot: null, noteSent: false, printing: false, contactOpen: false,
};
export const narrow = window.matchMedia("(max-width: 820px)");
export const isPhone = () => narrow.matches;
export const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
export const behavior = () => (reduced() ? "auto" : "smooth");
export const wait = (ms) => new Promise((r) => setTimeout(r, reduced() ? 0 : ms));
export const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
export const today = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
export const clock = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
export const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const safeUrl = (u) => (/^https?:\/\//i.test(String(u || "").trim()) ? String(u).trim() : "");
export const at = (path) => path.split(".").reduce((o, k) => o[k], rt.state);
export const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
export const rnd = (id, salt) => SPR.seeded(hash(id + ":" + salt))();
export const shortName = (p) => (p.short || p.name.split(":")[0]).trim();
export const field = (label, value) => "<div><dt>" + esc(label) + "</dt><dd>" + esc(value) + "</dd></div>";
export const rectOf = (el) => el.getBoundingClientRect();
export const inside = (r, x, y) => x >= r.left && x <= r.right && y >= r.top && y <= r.bottom;

// variables that several parts of the page change, kept in one place
export const rt = {
  state: JSON.parse(ORIGINAL),
  editing: false,
  dirty: false,
  canEdit: false,
  busy: false,
  note: "",
  artifact: null,
  topZ: 40,
  board: null,
  sketchSpread: 0,
  pending: null,
  lastField: null,
  markerDragged: false,
  swallowClick: false,
};
