// Sounds (off until the visitor turns them on) and the split-flap board in the booth window.
window.FX = (function () {
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const VOLUME = { tick: 0.12, print: 0.3, lift: 0.42, settle: 0.45, tap: 0.45, wtick: 0.05, fizz: 0.35, chime: 0.4, peel: 0.4, dwslide: 0.4 };
  // the handling sounds are the most frequent, so they are the quietest, low-passed, with less pitch spread
  const SOFT = { lift: true, settle: true, tap: true, dwslide: true, peel: true };
  const GAP = { tick: 40, lift: 120 };
  const snd = { on: false, ctx: null, last: {}, bufs: {}, gain: null, rate: 1 };
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
    const now = performance.now(), gap = GAP[name] || 60;
    if (snd.last[name] && now - snd.last[name] < gap) return;
    snd.last[name] = now;
    const c = ctx();
    if (c && name === "flip") { paperFlip(c); return; }
    if (c && (name === "tear" || name === "rip")) { paperTear(c, name === "tear" ? 0.42 : 0.07); return; }
    if (c && name === "chime") { cuteChime(c); return; }
    if (c && name === "tin") { tinRattle(c); return; }
    if (c && name === "talk") { talkBlip(c); return; }
    if (c && name === "scan") { scanSound(c); return; }
    if (c && name === "keyclack") { keyClack(c); return; }
    if (c && name === "usbclick") { tick(c, 0.012, 2600, 0.25); return; }
    if (!c || !snd.bufs[name]) return;
    const src = c.createBufferSource(), g = c.createGain();
    src.buffer = snd.bufs[name];
    // a little pitch variation so repeats do not sound mechanical: 3% for handling, 5% for the rest
    src.playbackRate.value = (SOFT[name] ? 0.97 + Math.random() * 0.06 : 0.95 + Math.random() * 0.1) * snd.rate;
    g.gain.value = VOLUME[name] || 1;
    if (SOFT[name]) {
      const lp = c.createBiquadFilter();
      lp.type = "lowpass"; lp.frequency.value = 1700; lp.Q.value = 0.5;
      src.connect(lp); lp.connect(g);
    } else src.connect(g);
    g.connect(snd.gain);
    src.start();
  }
  function noise(c, secs, shape) {
    const n = Math.max(1, Math.floor(c.sampleRate * secs)), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) { const x = i / n; d[i] = (Math.random() * 2 - 1) * shape(x) * (Math.random() < 0.06 ? 1.8 : 1); }
    return buf;
  }
  function paperFlip(c) {
    const t0 = c.currentTime + 0.005, out = c.createGain(), pitch = 0.92 + Math.random() * 0.16;
    out.gain.value = 0.55; out.connect(snd.gain);
    const part = (buf, at, type, f0, f1, q, vol) => {
      const s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
      s.buffer = buf; s.playbackRate.value = pitch;
      fl.type = type; fl.Q.value = q; fl.frequency.setValueAtTime(f0 * pitch, at); fl.frequency.exponentialRampToValueAtTime(f1 * pitch, at + buf.duration);
      g.gain.value = vol; s.connect(fl); fl.connect(g); g.connect(out); s.start(at);
    };
    // the corner lifting off the stack: a short crisp tick
    part(noise(c, 0.035, (x) => (1 - x) * (1 - x)), t0, "highpass", 3800, 2600, 0.7, 0.9);
    // the sheet travelling over: grainy, falling from bright to dull
    part(noise(c, 0.24, (x) => Math.sin(Math.PI * Math.min(1, x * 1.6)) * (0.6 + 0.4 * Math.sin(x * 60))), t0 + 0.02, "bandpass", 3000, 900, 0.8, 1);
    // laying down on the staple side: a soft low pat
    part(noise(c, 0.07, (x) => (1 - x) * (1 - x) * (1 - x)), t0 + 0.24, "lowpass", 900, 400, 0.6, 0.8);
  }
  // tearing along the perforation: a run of small fibre snaps, bright and dry, ending in a clean release
  function paperTear(c, len) {
    const t0 = c.currentTime + 0.005, pitch = 0.9 + Math.random() * 0.2;
    const n = Math.floor(c.sampleRate * len), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    let i = 0;
    while (i < n) {
      const x = i / n, gap = Math.floor(c.sampleRate * (0.004 + Math.random() * 0.012 * (1 - 0.6 * x))), g = Math.floor(c.sampleRate * (0.0015 + Math.random() * 0.004)), amp = 0.35 + Math.random() * 0.65;
      for (let k = 0; k < g && i + k < n; k++) d[i + k] += (Math.random() * 2 - 1) * amp * Math.pow(1 - k / g, 2);
      i += gap;
    }
    for (let k = 0; k < n; k++) { const x = k / n; d[k] *= Math.min(1, x * 12) * (len > 0.2 && x > 0.85 ? 1.6 : 1) * (1 - Math.max(0, x - 0.9) * 8); }
    const s = c.createBufferSource(), hp = c.createBiquadFilter(), bp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; s.playbackRate.value = pitch;
    hp.type = "highpass"; hp.frequency.value = 900;
    bp.type = "peaking"; bp.frequency.value = 3200 * pitch; bp.gain.value = 5; bp.Q.value = 0.8;
    g.gain.value = len > 0.2 ? 0.75 : 0.45;
    s.connect(hp); hp.connect(bp); bp.connect(g); g.connect(snd.gain); s.start(t0);
  }
  function cuteChime(c) {
    const t0 = c.currentTime + 0.01, out = c.createGain();
    out.gain.value = 0.5; out.connect(snd.gain);
    // two round notes a fourth apart, each with a quick upward slide, then a tiny sparkle on top
    const note = (at, f0, f1, len, vol, type) => {
      const o = c.createOscillator(), g = c.createGain();
      o.type = type || "triangle";
      o.frequency.setValueAtTime(f0, at); o.frequency.exponentialRampToValueAtTime(f1, at + 0.05);
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
      o.connect(g); g.connect(out); o.start(at); o.stop(at + len + 0.02);
    };
    note(t0, 740, 880, 0.16, 0.5);
    note(t0 + 0.12, 1050, 1175, 0.24, 0.45);
    note(t0 + 0.12, 2350, 2350, 0.12, 0.06, "sine");
  }
  // a short filtered noise tick: the building block for the small sounds below
  function tick(c, len, freq, vol, at) {
    const t0 = (at || c.currentTime) + 0.003, n = Math.max(1, Math.floor(c.sampleRate * len)), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 3);
    const s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; bp.type = "bandpass"; bp.frequency.value = freq * (0.95 + Math.random() * 0.1); bp.Q.value = 2.5; g.gain.value = vol;
    s.connect(bp); bp.connect(g); g.connect(snd.gain); s.start(t0);
  }
  // a mint taken from a tin: three or four small metallic knocks, close together
  function tinRattle(c) {
    const t0 = c.currentTime, k = 3 + Math.floor(Math.random() * 2);
    for (let i = 0; i < k; i++) {
      const at = t0 + i * (0.028 + Math.random() * 0.02), o = c.createOscillator(), g = c.createGain();
      o.type = "square"; o.frequency.value = 2900 + Math.random() * 900;
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.05, at + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.03);
      o.connect(g); g.connect(snd.gain); o.start(at); o.stop(at + 0.04);
      tick(c, 0.02, 4200, 0.35, at);
    }
  }
  // a mechanical key: a crisp click on the way down and a softer thock under it
  function keyClack(c) {
    tick(c, 0.012, 4800, 0.5);
    tick(c, 0.03, 900, 0.45);
  }
  // a soft, slightly random syllable: two quick tones, like a voice heard through the booth glass
  function talkBlip(c) {
    const at = c.currentTime + 0.004, base = 330 + Math.random() * 110, o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    o.type = "triangle";
    o.frequency.setValueAtTime(base, at); o.frequency.linearRampToValueAtTime(base * (Math.random() < 0.5 ? 1.12 : 0.92), at + 0.05);
    lp.type = "lowpass"; lp.frequency.value = 1400;
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.16, at + 0.008); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.07);
    o.connect(lp); lp.connect(g); g.connect(snd.gain); o.start(at); o.stop(at + 0.08);
  }
  // a soft scan: a quiet shutter, a smooth light sweep rising as the bar travels, then a gentle two-note "done"
  function scanSound(c) {
    const t0 = c.currentTime, out = c.createGain(), lp = c.createBiquadFilter();
    lp.type = "lowpass"; lp.frequency.value = 3200; out.gain.value = 0.6; lp.connect(out); out.connect(snd.gain);
    tick(c, 0.008, 4200, 0.25);
    // the sweep: two soft sines a fifth apart gliding up, with a light shimmer
    [[1, 0.07], [1.5, 0.035]].forEach((h) => {
      const o = c.createOscillator(), g = c.createGain(), at = t0 + 0.06, len = 0.6;
      o.type = "sine"; o.frequency.setValueAtTime(330 * h[0], at); o.frequency.exponentialRampToValueAtTime(660 * h[0], at + len);
      const lfo = c.createOscillator(), lg = c.createGain(); lfo.frequency.value = 14; lg.gain.value = h[1] * 0.35; lfo.connect(lg); lg.connect(g.gain);
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(h[1], at + 0.08); g.gain.setValueAtTime(h[1], at + len - 0.1); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
      o.connect(g); g.connect(lp); o.start(at); o.stop(at + len + 0.02); lfo.start(at); lfo.stop(at + len + 0.02);
    });
    // done: two round notes
    [[784, 0.68], [1175, 0.8]].forEach((n) => {
      const o = c.createOscillator(), g = c.createGain(), at = t0 + n[1];
      o.type = "triangle"; o.frequency.value = n[0];
      g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.12, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.28);
      o.connect(g); g.connect(lp); o.start(at); o.stop(at + 0.3);
    });
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
      // two passes, so two phrases are never mixed: every tile clears to blank, then each flips to its own letter
      const lit = [];
      for (let i = 0; i < n; i++) if (cur[i] !== " ") lit.push(i);
      lit.forEach((i, k) => setTimeout(() => { if (g !== gen) return; set(i, " "); play("tick"); }, k * 22));
      const flipAt = lit.length * 22 + 120, todo = [];
      for (let i = 0; i < n; i++) if (text[i] !== " ") todo.push(i);
      todo.forEach((i, k) => setTimeout(() => { if (g !== gen) return; set(i, text[i]); play("tick"); }, flipAt + k * 30));
      setTimeout(() => { if (g === gen) next(); }, flipAt + todo.length * 30 + 20);
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

  return { play: play, toggle: toggle, board: board, setRate(r) { snd.rate = r; }, get soundOn() { return snd.on; } };
})();
