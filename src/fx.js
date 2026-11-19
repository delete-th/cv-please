// Sounds (off until the visitor turns them on) and the split-flap board in the booth window.
window.FX = (function () {
  const reduced = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const VOLUME = { tick: 0.12, print: 0.3, lift: 0.42, settle: 0.45, tap: 0.45, wtick: 0.05, fizz: 0.35, chime: 0.4, peel: 0.4, dwslide: 0.4 };
  // the handling sounds are the most frequent, so they are the quietest, low-passed, with less pitch spread
  const SOFT = { lift: true, settle: true, tap: true, dwslide: true, peel: true };
  const GAP = { tick: 40, lift: 120 };
  // sound is on unless the visitor has switched it off this visit
  const snd = { on: true, ctx: null, last: {}, bufs: {}, gain: null, rate: 1 };
  try { snd.on = sessionStorage.getItem("cvp-sound") !== "off"; } catch (err) { /* storage can be blocked */ }

  function ctx() {
    if (!snd.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return null;
      snd.ctx = new C();
      snd.gain = snd.ctx.createGain(); snd.gain.gain.value = 0.35; snd.gain.connect(snd.ctx.destination);
      // decode the embedded files once
      // each sound is either inline (the single-file artifact) or a file beside the page (the website)
      Object.keys(window.SOUNDS || {}).forEach((name) => {
        const src = window.SOUNDS[name], decode = (ab) => snd.ctx.decodeAudioData(ab, (buf) => { snd.bufs[name] = buf; }, () => {});
        if (String(src).startsWith("data:")) {
          const bin = atob(src.split(",")[1]), bytes = new Uint8Array(bin.length);
          for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
          decode(bytes.buffer);
        } else fetch(src).then((r) => r.arrayBuffer()).then(decode).catch(() => {});
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
    if (c && name === "chime") { intercomBuzz(c); return; }
    if (c && name === "tin") { tinRattle(c); return; }
    if (c && name === "talk") { talkBlip(c); return; }
    if (c && name === "scan") { scanSound(c); return; }
    if (c && name === "spkon") { speakerOn(c); return; }
    if (c && name === "step") { tick(c, 0.03, 380, 0.22); return; }
    if (c && name === "clunk") { metalClunk(c); return; }
    if (c && name === "marker") { tick(c, 0.02, 3600 + Math.random() * 900, 0.12); return; }
    if (c && (name === "wipe" || name === "wipe-soft")) { swish(c, name === "wipe" ? 0.7 : 0.09, name === "wipe" ? 0.18 : 0.08); return; }
    if (c && name === "snooze") { tick(c, 0.012, 1900, 0.4); tick(c, 0.03, 700, 0.35, c.currentTime + 0.012); return; }
    if (c && name === "keyclack") { keyClack(c); return; }
    if (c && name === "usbclick") { tick(c, 0.012, 2600, 0.25); return; }
    if (c && name === "beep") { pcBeep(c, 1180, 0.055, 0); return; }
    if (c && name === "boop") { pcBeep(c, 520, 0.07, 0); return; }
    if (c && name === "chirp") { pcBeep(c, 880, 0.05, 0); pcBeep(c, 1320, 0.07, 0.07); return; }
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
  // the old computer's own beep: a short square tone through a small, muffled speaker
  function pcBeep(c, freq, len, delay) {
    const t0 = c.currentTime + 0.003 + (delay || 0), o = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain();
    o.type = "square"; o.frequency.value = freq; lp.type = "lowpass"; lp.frequency.value = 2400;
    g.gain.setValueAtTime(0.0001, t0); g.gain.linearRampToValueAtTime(0.07, t0 + 0.004); g.gain.setValueAtTime(0.07, t0 + len - 0.01); g.gain.linearRampToValueAtTime(0.0001, t0 + len);
    o.connect(lp); lp.connect(g); g.connect(snd.gain); o.start(t0); o.stop(t0 + len + 0.02);
  }
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
  // the speaker waking up: a soft switch click, then a short low hum (under 300ms)
  function speakerOn(c) {
    const t0 = c.currentTime;
    tick(c, 0.01, 2600, 0.35);
    const o = c.createOscillator(), o2 = c.createOscillator(), lp = c.createBiquadFilter(), g = c.createGain(), at = t0 + 0.03, len = 0.24;
    o.type = "triangle"; o.frequency.value = 98; o2.type = "sine"; o2.frequency.value = 196;
    lp.type = "lowpass"; lp.frequency.value = 600;
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.22, at + 0.04); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(snd.gain); o.start(at); o2.start(at); o.stop(at + len + 0.02); o2.stop(at + len + 0.02);
  }
  // the tray sliding home: a dull metal knock with a short ring
  function metalClunk(c) {
    const t0 = c.currentTime;
    tick(c, 0.05, 520, 0.6);
    const o = c.createOscillator(), g = c.createGain(), at = t0 + 0.005;
    o.type = "square"; o.frequency.setValueAtTime(150, at); o.frequency.exponentialRampToValueAtTime(110, at + 0.12);
    const lp = c.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 900;
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.12, at + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, at + 0.16);
    o.connect(lp); lp.connect(g); g.connect(snd.gain); o.start(at); o.stop(at + 0.18);
    tick(c, 0.08, 2300, 0.1, t0 + 0.02);
  }
  // felt on a whiteboard: soft filtered noise that rises and falls
  function swish(c, len, vol) {
    const n = Math.floor(c.sampleRate * len), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) { const x = i / n; d[i] = (Math.random() * 2 - 1) * Math.sin(Math.PI * x) * (0.7 + 0.3 * Math.sin(x * 40)); }
    const s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; bp.type = "bandpass"; bp.frequency.value = 1300; bp.Q.value = 0.6; g.gain.value = vol;
    s.connect(bp); bp.connect(g); g.connect(snd.gain); s.start();
  }
  // a booth intercom: the press-to-talk click, a short buzzer through a small speaker, then a breath of line static
  function intercomBuzz(c) {
    const t0 = c.currentTime + 0.005, bus = c.createGain(), hp = c.createBiquadFilter(), lp = c.createBiquadFilter();
    hp.type = "highpass"; hp.frequency.value = 350; lp.type = "lowpass"; lp.frequency.value = 2600;
    bus.gain.value = 0.7; hp.connect(lp); lp.connect(bus); bus.connect(snd.gain);
    tick(c, 0.012, 2000, 0.45, t0);
    // the buzzer: a rough square wave, chopped at mains rate
    const o = c.createOscillator(), g = c.createGain(), am = c.createOscillator(), amg = c.createGain();
    o.type = "square"; o.frequency.value = 330; am.type = "square"; am.frequency.value = 50; amg.gain.value = 0.05;
    am.connect(amg); amg.connect(g.gain);
    const a0 = t0 + 0.04, len = 0.32;
    g.gain.setValueAtTime(0.0001, a0); g.gain.linearRampToValueAtTime(0.09, a0 + 0.01); g.gain.setValueAtTime(0.09, a0 + len - 0.03); g.gain.linearRampToValueAtTime(0.0001, a0 + len);
    o.connect(g); g.connect(hp); o.start(a0); am.start(a0); o.stop(a0 + len + 0.02); am.stop(a0 + len + 0.02);
    // line static as the channel opens
    const n = Math.floor(c.sampleRate * 0.22), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) { const x = i / n; d[i] = (Math.random() * 2 - 1) * (1 - x) * (Math.random() < 0.04 ? 2.2 : 0.6); }
    const s2 = c.createBufferSource(), sg = c.createGain(); s2.buffer = buf; sg.gain.value = 0.18;
    s2.connect(sg); sg.connect(hp); s2.start(a0 + len + 0.03);
    tick(c, 0.01, 1700, 0.3, a0 + len + 0.26);
  }

  // ----- a little jazz from the speaker: a soft ii-V-I loop with electric piano, walking bass and brushes -----
  // Made in the browser, so it is free to use and costs nothing to download.
  const JAZZ = { bpm: 84, bars: [
    { root: 38, third: 3, chord: [53, 57, 60, 64] },   // Dm9
    { root: 43, third: 4, chord: [53, 59, 64, 69] },   // G13
    { root: 36, third: 4, chord: [52, 55, 59, 62] },   // Cmaj9
    { root: 45, third: 4, chord: [55, 58, 61, 64] },   // A7b9
    { root: 38, third: 3, chord: [53, 57, 60, 65] },   // Dm11
    { root: 43, third: 4, chord: [53, 59, 62, 65] },   // G7
    { root: 36, third: 4, chord: [52, 55, 59, 64] },   // Cmaj7
    { root: 36, third: 4, chord: [50, 55, 59, 64] },   // Cmaj9 turnaround
  ] };
  const music = { on: false, timer: null, next: 0, beat: 0, bus: null };
  const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
  function epNote(c, at, m, len, vol) {
    const o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    o.type = "sine"; o.frequency.value = hz(m); o2.type = "triangle"; o2.frequency.value = hz(m) * 2; o2.detune.value = 4;
    const g2 = c.createGain(); g2.gain.value = 0.25;
    lp.type = "lowpass"; lp.frequency.value = 1800;
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.012); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(g); o2.connect(g2); g2.connect(g); g.connect(lp); lp.connect(music.bus);
    o.start(at); o2.start(at); o.stop(at + len + 0.05); o2.stop(at + len + 0.05);
  }
  function bassNote(c, at, m, len) {
    const o = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter();
    o.type = "triangle"; o.frequency.value = hz(m); lp.type = "lowpass"; lp.frequency.value = 520;
    g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.28, at + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, at + len);
    o.connect(lp); lp.connect(g); g.connect(music.bus); o.start(at); o.stop(at + len + 0.05);
  }
  function brush(c, at, vol) {
    const n = Math.floor(c.sampleRate * 0.09), buf = c.createBuffer(1, n, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, 2);
    const s = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
    s.buffer = buf; bp.type = "bandpass"; bp.frequency.value = 6500; bp.Q.value = 0.8; g.gain.value = vol;
    s.connect(bp); bp.connect(g); g.connect(music.bus); s.start(at);
  }
  // schedule one beat: bass every beat, brushes on the beat and the swung "and" of 2 and 4, piano comping now and then
  function jazzBeat(c, at) {
    const spb = 60 / JAZZ.bpm, bi = Math.floor(music.beat / 4) % JAZZ.bars.length, b = JAZZ.bars[bi], beat = music.beat % 4, nb = JAZZ.bars[(bi + 1) % JAZZ.bars.length];
    const walk = [b.root, b.root + b.third, b.root + 7, nb.root + (Math.random() < 0.5 ? 1 : -1)];
    bassNote(c, at, walk[beat], spb * 0.95);
    brush(c, at, beat % 2 ? 0.05 : 0.035);
    if (beat % 2) brush(c, at + spb * 2 / 3, 0.025);
    if (beat === 0) b.chord.forEach((m, k) => epNote(c, at + k * 0.012, m, spb * 2.2, 0.045));
    if (beat === 1 && Math.random() < 0.6) b.chord.slice(1).forEach((m) => epNote(c, at + spb * 2 / 3, m, spb * 1.1, 0.03));
    if (beat === 3 && Math.random() < 0.35) epNote(c, at + spb * 2 / 3, b.chord[3] + 12, spb * 0.9, 0.025);
    music.beat++;
  }
  function startMusic() {
    const c = ctx();
    if (!c || music.on) return;
    music.on = true;
    if (!music.bus) { music.bus = c.createGain(); music.bus.gain.value = 0.5; music.bus.connect(snd.gain); }
    music.bus.gain.cancelScheduledValues(c.currentTime); music.bus.gain.setValueAtTime(0.0001, c.currentTime); music.bus.gain.exponentialRampToValueAtTime(0.5, c.currentTime + 1.2);
    music.next = c.currentTime + 0.1;
    music.timer = setInterval(() => {
      const spb = 60 / JAZZ.bpm;
      while (music.next < c.currentTime + 0.25) { jazzBeat(c, music.next); music.next += spb; }
    }, 60);
  }
  function stopMusic() {
    if (!music.on) return;
    music.on = false; clearInterval(music.timer);
    const c = snd.ctx; if (c && music.bus) { music.bus.gain.cancelScheduledValues(c.currentTime); music.bus.gain.setValueAtTime(music.bus.gain.value, c.currentTime); music.bus.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.4); }
  }
  // get the sounds ready straight away, so the walk-in can be heard where the browser allows sound before a click;
  // elsewhere the first click or key wakes the sound up
  if (snd.on) setTimeout(ctx, 0);
  ["pointerdown", "keydown"].forEach((ev) => document.addEventListener(ev, () => { if (snd.on && snd.ctx && snd.ctx.state === "suspended") snd.ctx.resume(); }, true));
  // browsers only let sound start after a click or key, so a remembered "on" waits for the first one
  ["pointerdown", "keydown"].forEach((ev) => document.addEventListener(ev, () => { if (snd.on && !music.on && !document.hidden) startMusic(); }, true));
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopMusic(); else if (snd.on && snd.ctx) startMusic(); });

  function toggle() {
    snd.on = !snd.on;
    if (snd.on) { ctx(); startMusic(); } else stopMusic();
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
