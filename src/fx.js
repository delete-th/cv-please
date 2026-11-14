// Sounds (off until the visitor turns them on) and the split-flap board in the booth window.
window.FX = (function () {
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const snd = { on: false, ctx: null, last: {}, buf: null };

  function ctx() {
    if (!snd.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      snd.ctx = new C();
      const len = snd.ctx.sampleRate;
      snd.buf = snd.ctx.createBuffer(1, len, len);
      const data = snd.buf.getChannelData(0);
      for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    }
    if (snd.ctx.state === "suspended") snd.ctx.resume();
    return snd.ctx;
  }
  function env(c, t, peak, dur) {
    const g = c.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(peak, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    g.connect(c.destination);
    return g;
  }
  function noise(c, t, dur, type, freq, peak, sweepTo) {
    const src = c.createBufferSource(), f = c.createBiquadFilter();
    src.buffer = snd.buf;
    f.type = type; f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.linearRampToValueAtTime(sweepTo, t + dur);
    src.connect(f); f.connect(env(c, t, peak, dur));
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }
  function tone(c, t, type, from, to, peak, dur) {
    const o = c.createOscillator();
    o.type = type; o.frequency.setValueAtTime(from, t);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
    o.connect(env(c, t, peak, dur)); o.start(t); o.stop(t + dur + 0.02);
  }
  function play(name) {
    if (!snd.on) return;
    const now = performance.now(), gap = name === "tick" ? 40 : 70;
    if (snd.last[name] && now - snd.last[name] < gap) return;
    snd.last[name] = now;
    const c = ctx();
    if (!c) return;
    const t = c.currentTime;
    if (name === "thud") { tone(c, t, "sine", 120, 42, 0.6, 0.2); noise(c, t, 0.05, "lowpass", 900, 0.35); }
    else if (name === "rustle") noise(c, t, 0.16, "bandpass", 2600, 0.12);
    else if (name === "drawer") noise(c, t, 0.34, "lowpass", 260, 0.2, 900);
    else if (name === "print") { for (let i = 0; i < 6; i++) noise(c, t + i * 0.09, 0.06, "bandpass", 1400, 0.08); }
    else if (name === "tick") tone(c, t, "square", 1700, 0, 0.025, 0.014);
  }
  function toggle() { snd.on = !snd.on; if (snd.on) ctx(); return snd.on; }

  const CH = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
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
        const flips = 2 + Math.floor(Math.random() * 3);
        let k = 0;
        const step = () => {
          if (g !== gen) return;
          if (k < flips) { set(i, CH[Math.floor(Math.random() * CH.length)]); play("tick"); k++; setTimeout(step, 55); }
          else { set(i, text[i]); if (--busy === 0) next(); }
        };
        setTimeout(step, i * 24);
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
