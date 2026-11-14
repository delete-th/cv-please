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
    tool: [
      "................", "......kkkk......", ".....kwWWwk.....", ".....kwWWwk.....", ".....kwWWwk.....", "......kwwk......",
      "......kwwk......", "......kwwk......", ".....kkwwkk.....", "....kbbBBbbk....", "...kbbbBBbbbk...", "...kbbbbbbbbk...",
      "...kkkkkkkkkk...", "...krrrrrrrrk...", "....kkkkkkkk....", "................",
    ],
    // 24 x 24 crest: a shield with a keyhole, a checked band and laurel marks. Left half, mirrored.
    emblem: mirror([
      "....yyyyyyyy", "...yYYYYYYYY", "..yYyyyyyyyy", "..yYyccccccc", "y.yYycccccyy", ".yyYyccccyyy",
      "..yYyccccyyy", "y.yYycccccyy", ".yyYyccccccy", "..yYyccccccy", "y.yYycccccyy", ".yyYycccccyy",
      "..yYyccccccc", "y.yYyyyyyyyy", ".yyYyYyYyYyY", "..yYyyyyyyyy", "...yYycccccc", "...yYycccccc",
      "....yYyccccc", ".....yYycccc", "......yYyccc", ".......yYyyc", "........yYyy", "..........yy",
    ]),
    // 32 x 40 portrait. Left half, mirrored, then shaded on the right because the light comes from the top left.
    portrait: (function () {
      const rows = mirror([
        "................", "................", "...........kkkkk", ".........kkkkkkk", "........kkKKkkkk", ".......kkKKkkkkk",
        "......kkKkkkkkkk", "......kkkkkkkkkk", ".....kkkkkkkksss", ".....kkkkkksssss", ".....kkkkkssssss", ".....kkkksssssss",
        ".....kkkksssssss", ".....kkksskkkkss", ".....kkkssssssss", ".....kkkssfeefss", ".....kkkssssssss", ".....kkkssssssds",
        ".....kkkssssssds", ".....kkkssssssdd", ".....kkkssssssss", ".....kkkksssssrr", ".....kkkkssssrRR", ".....kkkkdssssss",
        "......kkkdssssss", "......kkkkdsssss", "......kkkkkdssss", ".....kkkkkkkdddd", ".....kkkkkk.ddss", "....kkkkkkk.dsss",
        "....kkkkkk.fdsss", "..ccckkkkcffssss", ".ccccckkccCffsss", "cccccccccccCffss", "ccccccccccccCffs", "cccccccccccccCff",
        "ccccccccccccccCf", "cccccccccccccccC", "cccccccccccccccc", "cccccccccccccccc",
      ]);
      return rows.map((r, y) => r.split("").map((ch, x) => {
        if (x >= 16 && ch === "K") return "k";
        if (x >= 22 && y >= 9 && y <= 26 && ch === "s") return "d";
        if (x >= 16 && y >= 31 && ch === "c" && x >= 26) return "C";
        return ch;
      }).join(""));
    })(),
  };

  // ----- desk objects -----
  const toolHalf = [
    "........kkkk", "......kkwsss", ".....kwsWWWW", ".....kwWWWWW", ".....kwWWWWW", "......kwWWWW", ".......kkwWW",
    "........kwWW", "........kwWW", "........kwWW", "........kwWW", ".......kkkkk", "....kkkkkkkk", "...kBBBBBBBB",
    "...kBbbbbbbb", "...kbbbbbbbb", "...kkkkkkkkk", "...kXXXXXXXX", "...kXXXXXXXX", "....kkkkkkkk",
  ];
  S.tool = mirror(toolHalf).map((r) => r.split("").map((ch, x) => {
    if (x >= 12 && ch === "s") return "W";
    if (x >= 14 && ch === "W") return "w";
    if (x >= 12 && ch === "B") return "b";
    if (ch === "X") return x < 12 ? "X" : "Z";
    return ch;
  }).join(""));
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
  // The two stamps share one drawing; only the rubber colour changes.
  function tool(kind, scale, label) {
    return draw("tool", scale, label, kind === "denied" ? { X: "stamp-red", Z: "red-dark" } : { X: "green-light", Z: "stamp-green" });
  }
  function lamp(on, scale) { return draw("lamp", scale, "", { L: on ? "cover-ink" : "rule" }); }

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

  return { draw: draw, tool: tool, lamp: lamp, pool: pool, scene: scene, ring: ring, installTiles: installTiles, seeded: seeded, sheet: S };
})();
