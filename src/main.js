// Entry point for the website build (Vite). The scripts run in this order: each one sets up what the
// next needs (window.ART, window.SPR, window.SOUNDS, window.FX, window.DEMOS), then the page itself starts
// (src/app/, one module per part of the page; start.js runs each part's start-up code).
import "./styles.css";
import "./art.js";
import "./sprites.js";
import "./sounds.js";
import "./fx.js";
import "./demos.js";
import "./boot-data.js";
import "./app/start.js";
