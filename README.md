# cv-please

Thea Saguid's portfolio, set at a border-inspection desk. Stamp the passport to come in, scroll to open the booth and unpack the applicant file, then handle the papers.

## Run it locally

`index.html` is already built. Serve the folder with any static server:

```bash
python3 -m http.server 8080
```

Then open http://localhost:8080.

## Edit it

All content lives in `src/data.json`. The page is assembled from:

| File | What it holds |
|---|---|
| `src/data.json` | CV content: profile, projects, awards, skills, strengths, board phrases, radio lines |
| `src/app.js` | The desk, scroll scenes, stamp, paper handling, list view and amend mode |
| `src/sprites.js` | Pixel art, drawn as SVG rects, plus the embedded portrait |
| `src/art.js` | The desk objects (lamp, printer, mug, plant, file box, paperclip, pen, envelope, computer, phone) as data URIs. Swap an object by replacing its data URI |
| `assets/desk/` | The source PNGs for those objects. `filebox-empty.png` is `filebox.png` with its drawn folders cleared, so the live folders can sit in it |
| `assets/thea-portrait.png` | The 55x59 portrait. `src/sprites.js` carries a base64 copy, so update both if it changes |
| `src/fx.js` | The sound player and the split-flap board |
| `src/sounds.js` | The desk sound pack, embedded as small MP3s. Original sounds synthesized for this site, so there is no licence to credit |
| `src/demos.js` | In-browser case file demos (no network calls) |
| `src/styles.css` | Styles and colour tokens |

After changing anything in `src/`, rebuild:

```bash
python3 build.py
```

This writes `index.html` and `build/artifact.html` (the version published as a Claude artifact). "Amend papers" and saving only work inside the Claude artifact.
