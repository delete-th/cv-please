// Pixel sprites. Each sprite is a grid of palette letters, drawn as crisp SVG rects and scaled by whole numbers.
window.SPR = (function () {
  const PAL = {
    k: "ink", K: "ink-soft", e: "ink", p: "paper", P: "paper-deep", f: "field", u: "rule",
    r: "stamp-red", R: "red-dark", g: "stamp-green", G: "green-light",
    b: "booth", B: "booth-light", y: "cover-ink", Y: "gold-dark",
    w: "wood-3", W: "wood-4", s: "wood-5", d: "wood-4", c: "cover", C: "cover-edge",
    o: "booth-dark", m: "manila", M: "manila-deep",
  };
  const mirror = (rows) => rows.map((r) => r + r.split("").reverse().join(""));

  const S = {
    scure: [
      "....kkkkkkkk....", "...kbbbbbbbbk...", "...kffffffffk...", "...kfkkfkfkfk...", "...kfkffkkffk...", "...kffkfkfkfk...",
      "...kfkkffkkfk...", "...kfkfkffffk...", "...kffkkfkkfk...", "...kfkffkfkfk...", "...kffffffffk...", "...kfggggggfk...",
      "...kffffffffk...", "...kbbbkkbbbk...", "....kkkkkkkk....", "................",
    ],
    policy: [
      "..kkkkkkkkk.....", "..kfffffffkk....", "..kfkkkkkfkfk...", "..kfffffffffk...", "..kfkkkkkkkfk...", "..kfffffffffk...",
      "..kfkkkkkkkkk...", "..kffffkkBBBkk..", "..kfkkkkBBfBBk..", "..kffffkBfBBBk..", "..kfkkkkBBBBBk..", "..kfffffkBBBkk..",
      "..kkkkkkkkkkkkk.", "............kkkk", ".............kkk", "................",
    ],
    shield: [
      "................", "..kkkkkkkkkkkk..", "..kggggggggggk..", "..kgGGGGGGGGgk..", "..kgGfGGGGGGgk..", "..kgGfGfGGfGgk..",
      "..kgGfGfGffGgk..", "..kgffGfGffGgk..", "..kgGfGfGfGGgk..", "..kgGGGfGGGGgk..", "...kgGGGGGGgk...", "...kggGGGGggk...",
      "....kggGGggk....", ".....kggggk.....", "......kkkk......", "................",
    ],
    stem: [
      "................", ".wwwwwwwwwwwwww.", ".wccccccccccccw.", ".wcffcccccccfcw.", ".wccccfffcccccw.", ".wcfccccccffccw.",
      ".wccccccccccccw.", ".wcfffccfcccccw.", ".wccccccccccfcw.", ".wwwwwwwwwwwwww.", "...WWWWWWWWWW...", "....ww....ww....",
      "...ww......ww...", "..ww........ww..", "................", "................",
    ],
    ioc: [
      "................", ".kkkkkkkkkkkkkk.", ".kffffffffffffk.", ".kfrfkkkkfkkkfk.", ".kffffffffffffk.", ".kfgfkkfkkkkkfk.",
      ".kffffffffffffk.", ".kfrfkkkkkfkkfk.", ".kffffffffffffk.", ".kfgfkfkkkkfkfk.", ".kffffffffffffk.", ".kfgfkkkfkkkkfk.",
      ".kffffffffffffk.", ".kkkkkkkkkkkkkk.", "................", "................",
    ],
    hands: [
      "................", "................", "................", "..kkk......kkk..", ".kgggk....krrrk.", ".kggggkkkkrrrrk.",
      ".kgggssssssrrrk.", ".kggsssssssssrk.", "..kkssksksksskk.", "...ksssssssssk..", "...kssksksksk...", "....kssssssk....",
      ".....kkkkkk.....", "................", "................", "................",
    ],
    shadow: [
      "................", "..kkkkkkkkkkk...", ".kfffffffffffk..", ".kfffffffffffk..", ".kffkkfkkfkkfk..", ".kfffffffffffk..",
      ".kffffffkrrrrrk.", ".kkkkfkkrrfffrrk", "....kfk.rfrrffrk", "....kk..rffrrfrk", "........rfffrrrk", "........krrrrrk.",
      ".........kkkkk..", "................", "................", "................",
    ],
    book: [
      "................", "..kkkkkkkkkkkk..", ".krrrrrrrrrrrrk.", ".krRRRRRRRRRRrk.", ".krRyyyyyyyyRrk.", ".krRyRRRRRRyRrk.",
      ".krRyyyyyyyyRrk.", ".krRRRRRRRRRRrk.", ".krRRRyyyyRRRrk.", ".krRRRRRRRRRRrk.", ".krRRRRRRRRRRrk.", ".krrrrrrrrrrrrk.",
      ".kffffffffffffk.", ".kkkkkkkkkkkkkk.", "................", "................",
    ],
    paper: [
      "................", "...kkkkkkkk.....", "...kfffffffk....", "...kfffffffPk...", "...kfkkkkffffk..", "...kfffffffffk..",
      "...kfkkkkkkkfk..", "...kfffffffffk..", "...kfkkkkkkkfk..", "...kfffffffffk..", "...kfkkkkkfffk..", "...kfffffffffk..",
      "...kfffffffffk..", "...kkkkkkkkkkk..", "................", "................",
    ],
    medal: [
      "................", "...kkk....kkk...", "...krrk..kggk...", "....krrkkggk....", ".....krrggk.....", "......kyyk......",
      ".....kyyyyk.....", "....kyyYYyyk....", "....kyYyyYyk....", "....kyYyyYyk....", "....kyyYYyyk....", ".....kyyyyk.....",
      "......kkkk......", "................", "................", "................",
    ],
    card: [
      "................", "................", ".kkkkkkkkkkkkkk.", ".kPPPPPPPPPPPPk.", ".kPggPkkkkkkPPk.", ".kPggPPPPPPPPPk.",
      ".kPPPPkkkkPkkPk.", ".kPkkPPPPPPPPPk.", ".kPPPPkkkPkkkPk.", ".kPkkkPPPPPPPPk.", ".kPPPPPkkkkkPPk.", ".kPPPPPPPPPPPPk.",
      ".kkkkkkkkkkkkkk.", "................", "................", "................",
    ],
    slip: [
      "................", "................", ".kkkkkkkkkkkkkk.", ".kfkffffffffkfk.", ".kffkffffffkffk.", ".kfffkffffkfffk.",
      ".kffffkkkkffffk.", ".kffffffffffffk.", ".kffffffffffffk.", ".kffffffffffffk.", ".kffffffffffffk.", ".kkkkkkkkkkkkkk.",
      "................", "................", "................", "................",
    ],
    // 24 x 24 crest: a shield with a keyhole, a checked band and laurel marks. Left half, mirrored.
    emblem: mirror([
      "....yyyyyyyy", "...yYYYYYYYY", "..yYyyyyyyyy", "..yYyccccccc", "y.yYycccccyy", ".yyYyccccyyy",
      "..yYyccccyyy", "y.yYycccccyy", ".yyYyccccccy", "..yYyccccccy", "y.yYycccccyy", ".yyYycccccyy",
      "..yYyccccccc", "y.yYyyyyyyyy", ".yyYyYyYyYyY", "..yYyyyyyyyy", "...yYycccccc", "...yYycccccc",
      "....yYyccccc", ".....yYycccc", "......yYyccc", ".......yYyyc", "........yYyy", "..........yy",
    ]),
  };

  // ----- desk objects -----
  S.radio = [
    "................kk..", "...............k....", "..............k.....", "..kkkkkkkkkkkkkkkk..", ".kBBBBBBBBBBBBBBBBk.",
    ".kBkkkkkkkBBBByyBbk.", ".kBkKbKbKkBBByYYybk.", ".kBkbKbKbkBBBByyBbk.", ".kBkKbKbKkBBBBBBBbk.", ".kBkkkkkkkBkkBkkBbk.",
    ".kBBBBBBBBBBBBBBBbk.", ".kbbbbbbbbbbbbbbbbk.", "..kkkkkkkkkkkkkkkk..", "...kk..........kk...",
  ];
  S.lamp = [
    ".......kkkkkk.......", ".....kkccccccKk.....", "....kcGcccccccCk....", "...kcGccccccccCCk...", "..kcccccccccccCCCk..",
    "..kkkkkkkkkkkkkkkk..", "......kLLLLLLk......", ".......kkkkkk.......", ".........kk.........", "........kWk.........",
    ".......kWk..........", "......kWk...........", ".....kWk............", ".....kWk............", "......kWk...........",
    ".......kWk..........", "........kWk.........", ".....kkkkkkkkk......", "....kbBBBBBBBbk.....", "...kbBBBBBBBBBbk....",
    "...kkkkkkkkkkkkkk...",
  ];
  S.cup = [
    "................", "....kkkkkkkk....", "...kffffffffk...", "...kfwwwwwwfkkk.", "...kffffffffk..k", "...kffffffffk..k",
    "...kffffffffk..k", "...kffffffffkkk.", "...kffffffffk...", "...kfffffffuk...", "....kffffffk....", "....kkkkkkkk....",
    "..kkkkkkkkkkkk..", "...kuuuuuuuuk...", "....kkkkkkkk....", "................",
  ];
  S.plant = [
    ".......k........", "......kGk..k....", "..k...kGk.kGk...", ".kGk..kgk.kgk...", ".kgGk.kgkkgk....", "..kggkkgkgk..k..",
    "...kgggggk..kGk.", "....kggggkkkgk..", ".....kggggggk...", "....kkkkkkkkkk..", "....krrrrrrrRk..", ".....krrrrrRk...",
    ".....krrrrrRk...", "......krrrRk....", "......kkkkkk....", "................",
  ];
  S.laptop = ["..kkkkkkkkkkkk.."].concat(["oooooooooo", "ogggoooooo", "ooogggggoo", "oggooooooo", "oooooggggo", "oooooooooo"].map((s) => "..k" + s + "k.."))
    .concat(["..kkkkkkkkkkkk..", ".kBBBBBBBBBBBBk.", "kBbBbBbBbBbBbBBk", "kbbbbbbbbbbbbbbk", ".kkkkkkkkkkkkkk."]);
  S.clip = ["..KKK..", ".K...K.", "K..K..K", "K.K.K.K", "K.K.K.K", "K.K.K.K", "K.K.K.K", "K.K.K.K", "K.K.K.K", "K.K.K.K", "K.K...K", "K..KKK.", ".K.....", "..KKKK."];
  S.handle = ["..kkkkkkkkkkkk..", ".kyyyyyyyyyyyyk.", "kyYkkkkkkkkkkYyk", "kYk..........kYk", "kk............kk"];
  S.left = ["...y.", "..yy.", ".yyy.", "yyyy.", ".yyy.", "..yy.", "...y."];
  S.right = S.left.map((r) => r.split("").reverse().join(""));
  S.corner = [".........k", "........kP", ".......kPP", "......kPPP", ".....kPPPP", "....kPPPPu", "...kPPPPuu", "..kPPPuuuu", ".kPPuuuuuu", "kkkkkkkkkk"];

  // A manila envelope with its flap open, drawn from simple geometry.
  S.envelope = (function () {
    const W = 60, H = 40, g = [];
    for (let y = 0; y < H; y++) {
      let row = "";
      for (let x = 0; x < W; x++) {
        const edge = x === 0 || y === 0 || x === W - 1 || y === H - 1;
        let ch = edge ? "k" : y > H - 5 ? "M" : x === 1 || y === 1 ? "p" : "m";
        const lx = 1 + (y - 1) * 1.45, rx = W - 2 - (y - 1) * 1.45;
        if (!edge && y < 21 && x >= lx && x <= rx) ch = Math.abs(x - lx) < 1.5 || Math.abs(x - rx) < 1.5 ? "k" : "M";
        row += ch;
      }
      g.push(row);
    }
    return g;
  })();


  // ----- desk furniture, all seen from above with light from the top left -----
  function grid(w, h) { return Array.from({ length: h }, () => Array(w).fill(".")); }
  function rows(g) { return g.map((r) => r.join("")); }
  function disc(g, cx, cy, rx, ry, ch) {
    for (let y = 0; y < g.length; y++) for (let x = 0; x < g[0].length; x++) {
      const d = ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2;
      if (d <= 1) g[y][x] = typeof ch === "function" ? ch(x, y, d) : ch;
    }
  }
  function rect(g, x0, y0, w, h, ch) { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) if (g[y] && g[y][x] !== undefined) g[y][x] = ch; }
  function thick(g, x0, y0, x1, y1, ch, r) {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) { const x = Math.round(x0 + (x1 - x0) * i / n), y = Math.round(y0 + (y1 - y0) * i / n); rect(g, x - r, y - r, r * 2 + 1, r * 2 + 1, ch); }
  }

  // The file box: an open wooden tray. Inner walls on the top and left are in shadow, the front lip is thick.
  S.filebox = (function () {
    const W = 87, H = 67, g = grid(W, H);
    rect(g, 0, 0, W, H, "k");
    rect(g, 1, 1, W - 2, H - 2, "W");
    rect(g, 1, 1, W - 2, 1, "s"); rect(g, 1, 1, 1, H - 2, "s");
    rect(g, 4, 4, W - 8, H - 13, "k");
    rect(g, 5, 5, W - 10, H - 15, "w");
    rect(g, 5, 5, W - 10, 3, "d"); rect(g, 5, 5, 3, H - 15, "d");
    for (let y = 12; y < H - 12; y += 6) rect(g, 9, y, W - 16, 1, "d");
    rect(g, 1, H - 9, W - 2, 1, "k");
    rect(g, 1, H - 8, W - 2, 1, "s");
    return rows(g);
  })();

  // The printer: a squat box with a paper tray at the back and the output slot at the front.
  S.printer = (function () {
    const W = 50, H = 34, g = grid(W, H);
    rect(g, 10, 0, 30, 7, "k"); rect(g, 11, 1, 28, 6, "f");
    rect(g, 0, 5, W, H - 5, "k");
    rect(g, 1, 6, W - 2, H - 7, "b");
    rect(g, 1, 6, W - 2, 2, "B"); rect(g, 1, 6, 2, H - 7, "B");
    rect(g, 4, 11, W - 8, 13, "o");
    rect(g, 5, 12, W - 10, 11, "b");
    rect(g, 6, 13, 10, 1, "B");
    rect(g, 7, H - 6, W - 14, 2, "k");
    rect(g, 42, 26, 3, 2, "o"); rect(g, 37, 26, 3, 2, "o");
    return rows(g);
  })();

  // The desk lamp: a heavy round base on the desk, a jointed arm, and a shade reaching up and over the counter.
  S.biglamp = (function () {
    const W = 72, H = 80, g = grid(W, H);
    disc(g, 54, 68, 14, 9.5, "k");
    disc(g, 54, 68, 13, 8.5, (x, y) => (x + y < 54 + 68 - 6 ? "B" : x + y > 54 + 68 + 6 ? "o" : "b"));
    disc(g, 52, 64, 4, 3, "k"); disc(g, 52, 64, 3, 2, "B");
    thick(g, 52, 63, 40, 36, "k", 2); thick(g, 40, 36, 24, 18, "k", 2);
    thick(g, 52, 63, 40, 36, "B", 1); thick(g, 40, 36, 24, 18, "B", 1);
    disc(g, 40, 36, 3.5, 3.5, "k"); disc(g, 40, 36, 2, 2, "b");
    disc(g, 18, 14, 17, 12, "k");
    disc(g, 18, 14, 16, 11, (x, y) => (x + y < 18 + 14 - 8 ? "G" : x + y > 18 + 14 + 8 ? "C" : "c"));
    disc(g, 13, 19, 9, 5.5, "k");
    disc(g, 13, 19, 8, 4.5, "L");
    disc(g, 11, 18, 3, 1.6, "Z");
    return rows(g);
  })();

  // A mug seen from above: rim, coffee with a highlight, and the handle as a small loop.
  S.cup = (function () {
    const W = 22, H = 18, g = grid(W, H);
    rect(g, 15, 6, 6, 6, "k"); rect(g, 16, 7, 4, 4, "f"); rect(g, 17, 8, 2, 2, ".");
    disc(g, 9, 9, 8.5, 8.5, "k");
    disc(g, 9, 9, 7.5, 7.5, (x, y) => (x + y < 14 ? "f" : "P"));
    disc(g, 9, 9, 5.5, 5.5, "k");
    disc(g, 9, 9, 4.8, 4.8, (x, y) => (x + y > 20 ? "d" : "w"));
    rect(g, 6, 6, 2, 1, "s"); rect(g, 6, 7, 1, 1, "s");
    return rows(g);
  })();

  // A potted plant from above: round pot and soil, leaves spreading out over the rim.
  S.plant = (function () {
    const W = 26, H = 26, g = grid(W, H), cx = 13, cy = 13;
    disc(g, cx, cy, 8, 8, "k"); disc(g, cx, cy, 7, 7, "r"); disc(g, cx, cy, 5.5, 5.5, "R"); disc(g, cx, cy, 4.5, 4.5, "d");
    [0, 1, 2, 3, 4, 5, 6].forEach((i) => {
      const a = i * (Math.PI * 2 / 7) + 0.3, ex = cx + Math.cos(a) * 9.5, ey = cy + Math.sin(a) * 9.5;
      const mx = cx + Math.cos(a) * 5.5, my = cy + Math.sin(a) * 5.5;
      disc(g, mx, my, 3.6, 3.6, "k"); disc(g, ex, ey, 2.8, 2.8, "k");
      disc(g, mx, my, 2.6, 2.6, i % 2 ? "g" : "G"); disc(g, ex, ey, 1.8, 1.8, i % 2 ? "g" : "G");
    });
    disc(g, cx, cy, 2, 2, "G");
    return rows(g);
  })();

  // A small laptop from above: the open lid is a thin dark strip, the keyboard below it.
  S.laptop = (function () {
    const W = 24, H = 18, g = grid(W, H);
    rect(g, 0, 0, W, 4, "k"); rect(g, 1, 1, W - 2, 2, "o");
    rect(g, 0, 4, W, H - 4, "k"); rect(g, 1, 5, W - 2, H - 6, "b"); rect(g, 1, 5, W - 2, 1, "B");
    for (let y = 7; y < 12; y += 2) for (let x = 3; x < W - 3; x += 2) g[y][x] = "B";
    rect(g, 8, 13, 8, 3, "B"); rect(g, 9, 14, 6, 1, "o");
    return rows(g);
  })();

  function rects(rows, map) {
    let out = "";
    rows.forEach((row, y) => {
      for (let x = 0; x < row.length; ) {
        const ch = row[x], fill = (map && map[ch]) || PAL[ch];
        let n = 1;
        while (x + n < row.length && row[x + n] === ch) n++;
        if (fill) out += '<rect x="' + x + '" y="' + y + '" width="' + n + '" height="1" fill="var(--' + fill + ')"/>';
        x += n;
      }
    });
    return out;
  }
  function wrap(w, h, scale, inner, label) {
    return '<svg class="spr" width="' + w * scale + '" height="' + h * scale + '" viewBox="0 0 ' + w + " " + h + '" shape-rendering="crispEdges" ' +
      (label ? 'role="img" aria-label="' + label + '"' : 'aria-hidden="true"') + ">" + inner + "</svg>";
  }
  function draw(name, scale, label, map) {
    const rows = S[name] || S.paper;
    return wrap(rows[0].length, rows.length, scale, rects(rows, map), label);
  }

  // The rubber stamps on the stamp bar, seen from above and a little from the front:
  // a round knob, a short neck and collar, then the coloured block. Light comes from the top left.
  function stampRows() {
    const W = 64, H = 48, g = [];
    for (let y = 0; y < H; y++) {
      let row = "";
      for (let x = 0; x < W; x++) {
        let ch = ".";
        const kx = (x - 31.5) / 11, ky = (y - 9) / 7.5, kd = kx * kx + ky * ky;
        if (kd <= 1) ch = kd > 0.72 ? "k" : kx + ky < -0.55 ? "B" : kx + ky > 0.55 ? "o" : "b";
        else if (y >= 15 && y <= 21 && x >= 27 && x <= 36) ch = x === 27 || x === 36 ? "k" : x === 29 ? "B" : x >= 34 ? "o" : "b";
        else if (y >= 20 && y <= 23 && x >= 16 && x <= 47) ch = y === 20 || x === 16 || x === 47 ? "k" : x < 22 ? "b" : "o";
        if (y >= 23 && y <= 47 && x >= 3 && x <= 60) {
          const edge = x === 3 || x === 60 || y === 23 || y === 47 || y === 29;
          ch = edge ? "k" : y < 29 ? (x < 8 ? "T" : x > 55 ? "F" : "T") : x > 56 ? "D" : "F";
          if (!edge && y === 24 && x < 40) ch = "H";
        }
        row += ch;
      }
      g.push(row);
    }
    return g;
  }
  S.stamp = stampRows();
  const STAMP_INK = {
    approved: { T: "green-light", F: "stamp-green", D: "booth-dark", H: "paper" },
    denied: { T: "stamp-red", F: "red-dark", D: "ink", H: "paper" },
  };
  function stamp(kind, scale) { return draw("stamp", scale, "", STAMP_INK[kind]); }
  // Where the rubber face sits inside the stamp drawing, in drawing pixels.
  const STAMP_FACE = { x: 4, y: 30, w: 56, h: 17 };

  // Applicants who can stand at the booth window. Each is a small PNG with a transparent background,
  // shown at whole-number scales only. Add another entry here to drop in a new sprite.
  const APPLICANTS = { thea: { w: 55, h: 59, src: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADcAAAA7CAYAAADfGRI9AAAE7UlEQVR42tWZPW8aSRjHn13xLWhYZIptXWyABCQKK4quuMIVyFIorY2uSbgqUgpLVwW5ibxyaUtWrjiltCyUYiUIYLagOokCZNxQXXEfYa/JrGZm52V3Zhb7puJlmZnfPP/nbbCg4FGtlGPedw+PO6vItUtFA7mOI3o0fnjcWfQBmIIuFQElAlpttwS0yLK6wyrKUggCH6LvipCtVYS1RJvnAdLWRt/rAJZMgmW1SN41VAFtU1EQB3Mdh+t3PLmuttvUHLrDLgIsjxURGD4X/VvVoGOZDB4m5Un7sIo0bd3FiwBjzaNiPfspwFzHAf/4yIhfGZNltVKOWSFfBucfHxHvW41a8noyXwMAQPDte6aDzCPPkgoYC0IEhsPwhn98BOFyA6vtlggy6H2h0RKdmGkw/PvO4UGmAGMcrlopx6KSStVieYNLnsCiFS3pHKUK1mrUkufRnKxyLK/1jERLkxYTSTNvmsntc6KFipKiaqeQy3KioKILhlKCqbpSueWhnRoHO7u4I+BF0JP5OslvruMQkmTlvbwlmHKvhAP+OfS5lkCbpJ/pDoIEiIbHoXUa15IqGNpsdxBIk7Psc1ySdOD69O6NdI3C7lC+fP4IAP8SFpEBskoulALwZz+9e/N0F0Rok7isaIuyJNtq1GAyXydA+DO4FXkWLRxOtjALipe4WeD4e15RXUgSf3jcWcG378ZyGs/fWo0adAcB7P0OhXfSpoauv2lf7cnSgUjSWXLfk17toYWzVOp0FJVJ2sSVegn2NPJY1tSwTU1UhN89qc/xqhZ6nF3cMVsbXtn17P7lcR0HuoOAKT8U+VhJ/38hy9vwh/XwuLNEdWC43AhlbdJqRmWZVaL7AisULkuENJnTCpUlK/RP5mtuu3J2cQfhcgP+8RG3LXpWeY5O5q1GDcLlJtWdszpv9HvXceA2/PG8omW1Uo4X0xEAALx4+ZqIlJP5WnirhcZiOoJoNobVdhubkKhtGoxXXGcdXrP9fALK7V9BjG+of3LKrehlVUy43MDVzWVifV3raf1tXK2U499+/yNXe5R1LKajZA3Vf1a1ZUnLsXN4wCy3ZB04/35mj5ZDJ7mYjpiXp2/fD5QK6XC5Ad/vpfzPdRzCisbh0MS/dF7Fi+kIRMEDAMD3e8JSiydRXjCJZmNA6w4/9DNL1cqSt1gw/ZPTxPl5GwqCr9LrAiRh0Vy8tVDK4QUeWyY9mZXoTfRPTgkrZJGnCEzm7yLJ2ryclQcKgeXtBFiBBz8gXObX50Mh5JfPH+Gf3d8xrjgCDvlUFhD8tNFmfL9HVCJXN5fQOTwQWo+ex/d74Ps9AtBrtqU+7DXbKZmWcIvhC0WzsbRauD4fpqKcW/eIz9++H0D/5DQVQLqDgFAHAkNres02c36Wb6PfLKYjePHydZyCyzM6hwcQzcbg1j1w6x7zENy6B6v7CLxmG65uLlOVCw4WzcYEGJFWfspRBGi0cEa5THr18NOKeO5Dt8iL6a8pSeuslSvPIVmoDK/ZTqzg1r3Et8LlhpDj9fkw8TGVgjmajWF1H4nhZFW96kAbjmbjBBBVNUjWup0AmoOuSTNVKLwQrwpIv9YBE1lNCkefii6g6d4tXG6Ec9g8LZtuHE2CRbMxVwkEXLVSjnVbi32C5ekFbd5i11h+0fU700Cr+wiC4Cv4fo9rNQCA/wCpOh0i3MFL3gAAAABJRU5ErkJggg==" } };
  function applicant(id, scale, alt, cls) {
    const a = APPLICANTS[id] || APPLICANTS.thea;
    return '<img class="spr ' + (cls || "") + '" src="' + a.src + '" width="' + a.w * scale + '" height="' + a.h * scale + '" alt="' + (alt || "") + '"' + (alt ? "" : ' aria-hidden="true"') + ">";
  }
  function lamp(on, scale) { return draw("biglamp", scale, "", { L: on ? "cover-ink" : "rule", Z: on ? "field" : "rule" }); }

  // The warm pool the desk lamp throws on the wood: stepped rings, with a dithered outer edge.
  function pool(scale) {
    const W = 72, H = 30;
    const rows = [];
    for (let y = 0; y < H; y++) {
      let row = "";
      for (let x = 0; x < W; x++) {
        const d = Math.hypot((x - W / 2) / (W / 2), (y - H / 2) / (H / 2));
        row += d < 0.45 ? "1" : d < 0.75 ? "2" : d < 1 ? "3" : ".";
      }
      rows.push(row);
    }
    return wrap(W, H, scale, rects(rows, { 1: "pool-1", 2: "pool-2", 3: "pool-3" }));
  }

  // Small seeded generator so procedural art looks the same on every visit.
  function seeded(seed) {
    let a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  const box = (x, y, w, h, c) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="var(--' + c + ')"/>';

  // The view through the booth window: a skyline and a short queue outside.
  function scene(scale) {
    const W = 96, H = 32, rnd = seeded(2026);
    let out = box(0, 0, W, H, "booth-light");
    for (let x = 0; x < W; ) {
      const w = 6 + Math.floor(rnd() * 7), h = 8 + Math.floor(rnd() * 13);
      out += box(x, H - 6 - h, w, h, "booth") + box(x, H - 6 - h, 1, h, "booth-dark");
      for (let wy = H - 4 - h; wy < H - 9; wy += 3) for (let wx = x + 2; wx < x + w - 1; wx += 2) if (rnd() > 0.6) out += box(wx, wy, 1, 1, "cover-ink");
      x += w;
    }
    out += box(0, H - 6, W, 6, "booth-dark");
    [12, 21, 31, 40, 52].forEach((x, i) => {
      const tall = i % 2;
      out += box(x, H - 12 - tall, 2, 2, "ink") + box(x - 1, H - 10 - tall, 4, 5 + tall, i % 3 ? "ink-soft" : "cover") + box(x - 1, H - 5, 1, 2, "ink") + box(x + 2, H - 5, 1, 2, "ink");
    });
    out += box(0, 0, W, 1, "ink") + box(0, 0, 1, H, "ink") + box(W - 1, 0, 1, H, "ink") + box(47, 0, 2, H - 6, "ink") + box(0, H - 3, W, 3, "wood-3") + box(0, H - 3, W, 1, "wood-4");
    return wrap(W, H, scale, out, "View from the booth window: a city skyline and a short queue of people");
  }

  // A coffee ring left on the desk.
  function ring(scale) {
    let out = "";
    for (let y = 0; y < 14; y++) for (let x = 0; x < 14; x++) {
      const d = Math.hypot(x - 6.5, y - 6.5);
      if (d > 5.2 && d < 6.6 && !(x > 9 && y < 3)) out += box(x, y, 1, 1, "wood-1");
    }
    return wrap(14, 14, scale, out);
  }

  // Background tiles need literal colours, so read them from the page tokens.
  function token(name) { return getComputedStyle(document.documentElement).getPropertyValue("--" + name).trim(); }
  function tile(w, h, body) {
    return 'url("data:image/svg+xml,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="' + w + '" height="' + h + '" shape-rendering="crispEdges">' + body + "</svg>") + '")';
  }
  function installTiles(scale) {
    const hex = (x, y, w, h, c) => '<rect x="' + x + '" y="' + y + '" width="' + w + '" height="' + h + '" fill="' + c + '"/>';
    const rnd = seeded(77), dark = token("wood-1"), mid = token("wood-2"), light = token("wood-3");
    let wood = hex(0, 0, 128, 32, mid) + hex(0, 15, 128, 1, dark) + hex(0, 31, 128, 1, dark) + hex(37, 0, 1, 15, dark) + hex(101, 16, 1, 15, dark);
    for (let i = 0; i < 44; i++) {
      const y = Math.floor(rnd() * 32), x = Math.floor(rnd() * 120);
      if (y !== 15 && y !== 31) wood += hex(x, y, 2 + Math.floor(rnd() * 6), 1, rnd() > 0.5 ? dark : light);
    }
    const r2 = seeded(5);
    let worn = "";
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      const edge = x === 0 || y === 0 || x === 15 || y === 15;
      if (r2() > (edge ? 0.22 : 0.12)) worn += hex(x, y, 1, 1, dark);
    }
    const root = document.documentElement.style;
    root.setProperty("--wood-tile", tile(128, 32, wood));
    root.setProperty("--wood-size", 128 * scale + "px " + 32 * scale + "px");
    root.setProperty("--worn", tile(16, 16, worn));
    root.setProperty("--worn-size", 16 * scale + "px");
  }

  return { draw: draw, stamp: stamp, STAMP_FACE: STAMP_FACE, applicant: applicant, lamp: lamp, pool: pool, scene: scene, ring: ring, installTiles: installTiles, seeded: seeded, sheet: S };
})();
