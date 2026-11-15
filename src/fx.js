// Sounds (off until the visitor turns them on) and the split-flap board in the booth window.
window.FX = (function () {
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const VOLUME = { tick: 0.12, print: 0.3 };
  const snd = { on: false, ctx: null, last: {}, bufs: {}, gain: null };
  try { snd.on = sessionStorage.getItem("cvp-sound") === "on"; } catch (err) { /* storage can be blocked */ }

  function ctx() {
    if (!snd.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      snd.ctx = new C();
      snd.gain = snd.ctx.createGain(); snd.gain.gain.value = 0.35; snd.gain.connect(snd.ctx.destination);
      // decode the embedded files once
      Object.keys(window.SOUNDS || {}).forEach((name) => {
        const b64 = window.SOUNDS[name].split(",")[1], bin = atob(b64), bytes = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        snd.ctx.decodeAudioData(bytes.buffer, (buf) => { snd.bufs[name] = buf; }, () => {});
      });
    }
    if (snd.ctx.state === "suspended") snd.ctx.resume();
    return snd.ctx;
  }
  const ALIAS = { rustle: "lift" };
  function play(name) {
    if (!snd.on) return;
    name = ALIAS[name] || name;
    const now = performance.now(), gap = name === "tick" ? 40 : 60;
    if (snd.last[name] && now - snd.last[name] < gap) return;
    snd.last[name] = now;
    const c = ctx();
    if (!c || !snd.bufs[name]) return;
    const src = c.createBufferSource(), g = c.createGain();
    src.buffer = snd.bufs[name];
    src.playbackRate.value = 0.95 + Math.random() * 0.1; // a little pitch variation so repeats do not sound mechanical
    g.gain.value = VOLUME[name] || 1;
    src.connect(g); g.connect(snd.gain);
    src.start();
  }
  function toggle() {
    snd.on = !snd.on;
    if (snd.on) ctx();
    try { sessionStorage.setItem("cvp-sound", snd.on ? "on" : "off"); } catch (err) { /* storage can be blocked */ }
    return snd.on;
  }

  function board(el, phrases, n) {
    el.innerHTML = Array.from({ length: n }, () => '<span class="tile">&nbsp;</span>').join("");
    const tiles = Array.from(el.children), cur = Array(n).fill(" ");
    let idx = -1, timer = null, running = false, paused = false, gen = 0;
    const list = (phrases || []).filter(Boolean);
    function set(i, c) { tiles[i].textContent = c === " " ? " " : c; cur[i] = c; }
    function show(text, instant) {
      const g = ++gen;
      text = String(text).toUpperCase().slice(0, n).padEnd(n, " ");
      if (instant || reduced()) { for (let i = 0; i < n; i++) set(i, text[i]); next(); return; }
      let busy = 0;
      for (let i = 0; i < n; i++) {
        if (cur[i] === text[i]) continue;
        busy++;
        // each tile drops to blank and then lands on its own letter, so no stray letters are ever shown
        const step = (k) => {
          if (g !== gen) return;
          if (k === 0 && cur[i] !== " ") { set(i, " "); play("tick"); setTimeout(() => step(1), 60); }
          else { set(i, text[i]); if (text[i] !== " ") play("tick"); if (--busy === 0) next(); }
        };
        setTimeout(() => step(0), text[i] === " " ? 0 : 60 + i * 26);
      }
      if (busy === 0) next();
    }
    function next() {
      clearTimeout(timer);
      if (!running || !list.length) return;
      timer = setTimeout(() => {
        if (paused) { next(); return; }
        idx = (idx + 1) % list.length;
        show(list[idx]);
      }, idx < 0 ? 0 : 3200);
    }
    el.addEventListener("mouseenter", () => { paused = true; });
    el.addEventListener("mouseleave", () => { paused = false; });
    return {
      start() { if (running) return; running = true; next(); },
      blank() { running = false; clearTimeout(timer); idx = -1; show("", true); },
      get running() { return running; },
    };
  }

  return { play: play, toggle: toggle, board: board, get soundOn() { return snd.on; } };
})();
